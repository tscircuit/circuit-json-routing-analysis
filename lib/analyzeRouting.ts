import type { CircuitJson } from "circuit-json"
import { solveForGlobalCapacityNodes } from "./solveForGlobalCapacityNodes"
import type { AnalysisLineItem, Bounds, RoutingCapacityNode } from "./types"

export type AnalyzeRoutingResult = {
  getLineItems: () => AnalysisLineItem[]
  getString: () => string
}

const fmtNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)
  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const fmtMm = (value: number): string => `${fmtNumber(value)}mm`

const isCrampedPortPoint = (portPointId?: string): boolean =>
  portPointId?.includes("_cramped") ?? false

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const getBounds = (node: RoutingCapacityNode): Bounds => ({
  min_x: node.center.x - node.width / 2,
  max_x: node.center.x + node.width / 2,
  min_y: node.center.y - node.height / 2,
  max_y: node.center.y + node.height / 2,
})

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

const lineItemToString = (lineItem: AnalysisLineItem): string => {
  switch (lineItem.line_item_type) {
    case "CongestedRegion":
      return `CongestedRegion(probability_of_failure=${lineItem.probability_of_failure}, bounds=(minX=${fmtMm(lineItem.bounds.min_x)}, maxX=${fmtMm(lineItem.bounds.max_x)}, minY=${fmtMm(lineItem.bounds.min_y)}, maxY=${fmtMm(lineItem.bounds.max_y)}))`
    default:
      return ""
  }
}

export const analyzeGlobalCapacityNodes = (
  nodes: RoutingCapacityNode[],
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

  const lineItems = nodes
    .filter((node) => node.portPoints.length > 0)
    .map((node) => ({
      line_item_type: "CongestedRegion" as const,
      probability_of_failure: getProbabilityOfFailure(
        node,
        maxDensity,
        maxPortPointCount,
      ),
      bounds: getBounds(node),
    }))
    .sort((a, b) => b.probability_of_failure - a.probability_of_failure)

  return {
    getLineItems: () => lineItems,
    getString: () => lineItems.map(lineItemToString).join("\n"),
  }
}

export const analyzeRouting = async (
  circuitJson: CircuitJson,
): Promise<AnalyzeRoutingResult> => {
  const nodes = await solveForGlobalCapacityNodes(circuitJson)
  return analyzeGlobalCapacityNodes(nodes)
}
