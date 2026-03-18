import type { CircuitJson } from "circuit-json"
import { getBoundsFromNode, getBoundsHeight, getBoundsWidth } from "./bounds"
import { getNearbyComponents } from "./getNearbyComponents"
import { solveForGlobalCapacityNodes } from "./solveForGlobalCapacityNodes"
import type {
  AnalysisLineItem,
  CongestedRegion,
  NearbyComponent,
  RoutingCapacityNode,
} from "./types"

export type AnalyzeRoutingResult = {
  getLineItems: () => AnalysisLineItem[]
  getString: () => string
}

type CircuitElement = {
  type?: string
  [key: string]: unknown
}

const fmtNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)
  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const fmtMm = (value: number): string => `${value.toFixed(1)}mm`

const fmtPercent = (value: number): string => `${fmtNumber(value * 100)}%`

const isCrampedPortPoint = (portPointId?: string): boolean =>
  portPointId?.includes("_cramped") ?? false

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const roundProbability = (value: number): number =>
  Number.parseFloat(value.toFixed(3))

const getNodeDensity = (node: RoutingCapacityNode): number => {
  const layerCount = Math.max(node.availableZ?.length ?? 1, 1)
  const area = Math.max(node.width * node.height, 0.001)
  return node.portPoints.length / (area * layerCount)
}

const getProbabilityOfFailure = (
  node: RoutingCapacityNode,
  maxDensity: number,
  maxPortPointCount: number,
): number => {
  const crampedPortPointCount = node.portPoints.filter((portPoint) =>
    isCrampedPortPoint(portPoint.portPointId),
  ).length
  const crampedRatio =
    node.portPoints.length === 0
      ? 0
      : crampedPortPointCount / node.portPoints.length
  const densityScore = maxDensity === 0 ? 0 : getNodeDensity(node) / maxDensity
  const trafficScore =
    maxPortPointCount === 0 ? 0 : node.portPoints.length / maxPortPointCount

  return roundProbability(
    clamp01((crampedRatio * 0.7 + densityScore * 0.3) * trafficScore),
  )
}

const nearbyComponentToString = (component: NearbyComponent): string => {
  const attrs = [
    `name="${component.name}"`,
    `minX="${fmtMm(component.minX)}"`,
    `maxX="${fmtMm(component.maxX)}"`,
    `minY="${fmtMm(component.minY)}"`,
    `maxY="${fmtMm(component.maxY)}"`,
  ]

  if (component.containedWithinBounds) attrs.push("containedWithinBounds")
  if (component.regionWithinComponent) attrs.push("regionWithinComponent")
  if (component.onLeftEdgeOfRegion) attrs.push("onLeftEdgeOfRegion")
  if (component.onRightEdgeOfRegion) attrs.push("onRightEdgeOfRegion")
  if (component.onTopEdgeOfRegion) attrs.push("onTopEdgeOfRegion")
  if (component.onBottomEdgeOfRegion) attrs.push("onBottomEdgeOfRegion")

  if (component.offsetFromLeftEdgeOfRegion) {
    attrs.push(
      `offsetFromLeftEdgeOfRegion="${component.offsetFromLeftEdgeOfRegion}"`,
    )
  }
  if (component.offsetFromRightEdgeOfRegion) {
    attrs.push(
      `offsetFromRightEdgeOfRegion="${component.offsetFromRightEdgeOfRegion}"`,
    )
  }
  if (component.offsetFromTopOfRegion) {
    attrs.push(`offsetFromTopOfRegion="${component.offsetFromTopOfRegion}"`)
  }
  if (component.offsetFromBottomOfRegion) {
    attrs.push(
      `offsetFromBottomOfRegion="${component.offsetFromBottomOfRegion}"`,
    )
  }

  if (component.freeSpaceOnLeft) {
    attrs.push(`freeSpaceOnLeft="${component.freeSpaceOnLeft}"`)
  }
  if (component.freeSpaceOnRight) {
    attrs.push(`freeSpaceOnRight="${component.freeSpaceOnRight}"`)
  }
  if (component.freeSpaceOnTop) {
    attrs.push(`freeSpaceOnTop="${component.freeSpaceOnTop}"`)
  }
  if (component.freeSpaceOnBottom) {
    attrs.push(`freeSpaceOnBottom="${component.freeSpaceOnBottom}"`)
  }

  return `    <NearbyComponent ${attrs.join(" ")} />`
}

const lineItemToString = (lineItem: AnalysisLineItem): string => {
  switch (lineItem.lineItemType) {
    case "CongestedRegion":
      return [
        `<CongestedRegion probabilityOfFailure="${lineItem.probabilityOfFailure}" minX="${fmtMm(lineItem.bounds.minX)}" maxX="${fmtMm(lineItem.bounds.maxX)}" minY="${fmtMm(lineItem.bounds.minY)}" maxY="${fmtMm(lineItem.bounds.maxY)}" width="${fmtMm(lineItem.width)}" height="${fmtMm(lineItem.height)}">`,
        ...lineItem.nearbyComponents.map(nearbyComponentToString),
        "</CongestedRegion>",
      ].join("\n")
    default:
      return ""
  }
}

export const analyzeGlobalCapacityNodes = (
  nodes: RoutingCapacityNode[],
  circuitJson?: CircuitJson,
): AnalyzeRoutingResult => {
  const maxDensity = nodes.reduce(
    (currentMaxDensity, node) =>
      Math.max(currentMaxDensity, getNodeDensity(node)),
    0,
  )

  const maxPortPointCount = nodes.reduce(
    (currentMaxPortPointCount, node) =>
      Math.max(currentMaxPortPointCount, node.portPoints.length),
    0,
  )

  const lineItems: CongestedRegion[] = nodes
    .filter((node) => node.portPoints.length > 0)
    .map((node) => {
      const bounds = getBoundsFromNode(node)
      return {
        lineItemType: "CongestedRegion" as const,
        probabilityOfFailure: fmtPercent(
          getProbabilityOfFailure(node, maxDensity, maxPortPointCount),
        ),
        bounds,
        width: getBoundsWidth(bounds),
        height: getBoundsHeight(bounds),
        nearbyComponents: Array.isArray(circuitJson)
          ? getNearbyComponents(circuitJson as CircuitElement[], bounds)
          : [],
      }
    })
    .filter((lineItem) => Number.parseFloat(lineItem.probabilityOfFailure) > 0)
    .sort(
      (a, b) =>
        Number.parseFloat(b.probabilityOfFailure) -
        Number.parseFloat(a.probabilityOfFailure),
    )

  return {
    getLineItems: () => lineItems,
    getString: () => lineItems.map(lineItemToString).join("\n\n"),
  }
}

export const analyzeRouting = async (
  circuitJson: CircuitJson,
): Promise<AnalyzeRoutingResult> => {
  const nodes = await solveForGlobalCapacityNodes(circuitJson)
  return analyzeGlobalCapacityNodes(nodes, circuitJson)
}
