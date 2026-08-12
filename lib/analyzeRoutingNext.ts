import type { CircuitJson } from "circuit-json"
import { getBoundsFromNode, getBoundsHeight, getBoundsWidth } from "./bounds"
import { getNearbyComponents } from "./getNearbyComponents"
import { mergeCongestedCapacityRegions } from "./mergeCongestedCapacityRegions"
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

const fmtMeasurementMm = (value: number): string => `${fmtNumber(value)}mm`

const fmtPercent = (value: number): string => `${fmtNumber(value * 100)}%`

const xmlEscape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

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
    `name="${xmlEscape(component.name)}"`,
    `edgeDistance="${fmtMeasurementMm(component.edgeDistanceMm)}"`,
  ]

  if (component.overlapDepthMm !== undefined) {
    attrs.push(`overlapDepth="${fmtMeasurementMm(component.overlapDepthMm)}"`)
  }

  if (component.directions.length > 0) {
    attrs.push(`directions="${component.directions.join(",")}"`)
  }

  if (component.containedWithinBounds) attrs.push("containedWithinBounds")
  if (component.regionWithinComponent) attrs.push("regionWithinComponent")

  const addFreeSpaceAttribute = (
    direction: keyof NearbyComponent["freeSpaceByDirection"],
    attributeName: string,
  ): void => {
    const freeSpace = component.freeSpaceByDirection[direction]
    if (!freeSpace) return

    attrs.push(
      `${attributeName}="${freeSpace.isAtLeast ? ">" : ""}${fmtMm(freeSpace.distanceMm)}"`,
    )
  }

  addFreeSpaceAttribute("left", "freeSpaceOnLeft")
  addFreeSpaceAttribute("right", "freeSpaceOnRight")
  addFreeSpaceAttribute("top", "freeSpaceAbove")
  addFreeSpaceAttribute("bottom", "freeSpaceBelow")

  attrs.push(
    `left="${fmtMm(component.bounds.minX)}"`,
    `right="${fmtMm(component.bounds.maxX)}"`,
    `bottom="${fmtMm(component.bounds.minY)}"`,
    `top="${fmtMm(component.bounds.maxY)}"`,
  )

  return `    <NearbyComponent ${attrs.join(" ")} />`
}

const lineItemToString = (lineItem: AnalysisLineItem): string => {
  switch (lineItem.lineItemType) {
    case "CongestedRegion":
      return [
        `<CongestedRegion probabilityOfFailure="${lineItem.probabilityOfFailure}" left="${fmtMm(lineItem.bounds.minX)}" right="${fmtMm(lineItem.bounds.maxX)}" bottom="${fmtMm(lineItem.bounds.minY)}" top="${fmtMm(lineItem.bounds.maxY)}" width="${fmtMm(lineItem.width)}" height="${fmtMm(lineItem.height)}">`,
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

  const candidates = nodes
    .filter((node) => node.portPoints.length > 0)
    .map((node) => {
      const bounds = getBoundsFromNode(node)
      return {
        node,
        bounds,
        probabilityOfFailure: getProbabilityOfFailure(
          node,
          maxDensity,
          maxPortPointCount,
        ),
      }
    })
    .filter((candidate) => candidate.probabilityOfFailure > 0)

  const lineItems: CongestedRegion[] = mergeCongestedCapacityRegions(candidates)
    .map((region) => ({
      lineItemType: "CongestedRegion" as const,
      probabilityOfFailure: fmtPercent(region.probabilityOfFailure),
      bounds: region.bounds,
      width: getBoundsWidth(region.bounds),
      height: getBoundsHeight(region.bounds),
      nearbyComponents: Array.isArray(circuitJson)
        ? getNearbyComponents(circuitJson as CircuitElement[], region.bounds)
        : [],
    }))
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
