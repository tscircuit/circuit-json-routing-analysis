import type { CircuitJson } from "circuit-json"
import { solveForGlobalCapacityNodes } from "./solveForGlobalCapacityNodes"
import type {
  AnalysisLineItem,
  Bounds,
  CongestedRegion,
  NearbyComponent,
  NearbyComponentOffsetFromRegion,
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

type PlacedComponent = {
  name: string
  bounds: Bounds
}

type OutsideComponentCandidate = {
  name: string
  attrs: Record<string, string | true>
  score: number
  bounds: Bounds
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
const roundsToZeroMm = (value: number): boolean => Math.abs(value) < 0.05

const isCrampedPortPoint = (portPointId?: string): boolean =>
  portPointId?.includes("_cramped") ?? false

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const xmlEscape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const getBounds = (node: RoutingCapacityNode): Bounds => ({
  minX: node.center.x - node.width / 2,
  maxX: node.center.x + node.width / 2,
  minY: node.center.y - node.height / 2,
  maxY: node.center.y + node.height / 2,
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

const doBoundsIntersect = (a: Bounds, b: Bounds): boolean =>
  !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)

const isContainedWithinBounds = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): boolean =>
  componentBounds.minX >= regionBounds.minX &&
  componentBounds.maxX <= regionBounds.maxX &&
  componentBounds.minY >= regionBounds.minY &&
  componentBounds.maxY <= regionBounds.maxY

const doesRegionFitWithinComponent = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): boolean =>
  regionBounds.minX >= componentBounds.minX &&
  regionBounds.maxX <= componentBounds.maxX &&
  regionBounds.minY >= componentBounds.minY &&
  regionBounds.maxY <= componentBounds.maxY

const getPcbComponentBounds = (element: CircuitElement): Bounds | null => {
  const center =
    typeof element.center === "object" && element.center
      ? (element.center as { x?: unknown; y?: unknown })
      : null

  const centerX = toNumber(center?.x)
  const centerY = toNumber(center?.y)
  const width = toNumber(element.width)
  const height = toNumber(element.height)

  if (
    centerX === null ||
    centerY === null ||
    width === null ||
    height === null
  ) {
    return null
  }

  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minY: centerY - height / 2,
    maxY: centerY + height / 2,
  }
}

const getPlacedComponents = (
  circuitJson: CircuitElement[],
): PlacedComponent[] => {
  const sourceComponentById = new Map<string, string>()

  for (const element of circuitJson) {
    if (
      element.type === "source_component" &&
      typeof element.source_component_id === "string" &&
      typeof element.name === "string"
    ) {
      sourceComponentById.set(element.source_component_id, element.name)
    }
  }

  const placedComponents: PlacedComponent[] = []

  for (const element of circuitJson) {
    if (
      element.type !== "pcb_component" ||
      typeof element.pcb_component_id !== "string" ||
      typeof element.source_component_id !== "string"
    ) {
      continue
    }

    const sourceComponentName = sourceComponentById.get(
      element.source_component_id,
    )
    if (!sourceComponentName) continue

    const bounds = getPcbComponentBounds(element)
    if (!bounds) continue

    placedComponents.push({
      name: sourceComponentName,
      bounds,
    })
  }

  return placedComponents
}

const getContainedOrIntersectingComponents = (
  regionBounds: Bounds,
  placedComponents: PlacedComponent[],
): NearbyComponent[] =>
  placedComponents
    .map((component): NearbyComponent | null => {
      if (!doBoundsIntersect(component.bounds, regionBounds)) return null

      if (isContainedWithinBounds(component.bounds, regionBounds)) {
        return {
          name: component.name,
          containedWithinBounds: true,
          minX: component.bounds.minX,
          maxX: component.bounds.maxX,
          minY: component.bounds.minY,
          maxY: component.bounds.maxY,
        } satisfies NearbyComponent
      }

      if (doesRegionFitWithinComponent(component.bounds, regionBounds)) {
        return {
          name: component.name,
          regionWithinComponent: true,
          minX: component.bounds.minX,
          maxX: component.bounds.maxX,
          minY: component.bounds.minY,
          maxY: component.bounds.maxY,
        } satisfies NearbyComponent
      }

      return {
        name: component.name,
        ...(component.bounds.minX <= regionBounds.minX
          ? { onLeftEdgeOfRegion: true as const }
          : {}),
        ...(component.bounds.maxX >= regionBounds.maxX
          ? { onRightEdgeOfRegion: true as const }
          : {}),
        ...(component.bounds.minY <= regionBounds.minY
          ? { onBottomEdgeOfRegion: true as const }
          : {}),
        ...(component.bounds.maxY >= regionBounds.maxY
          ? { onTopEdgeOfRegion: true as const }
          : {}),
        minX: component.bounds.minX,
        maxX: component.bounds.maxX,
        minY: component.bounds.minY,
        maxY: component.bounds.maxY,
      } satisfies NearbyComponent
    })
    .filter(
      (component): component is NonNullable<typeof component> =>
        component !== null,
    )
    .sort((a, b) => a.name.localeCompare(b.name))

const getOutsideComponentCandidate = (
  component: PlacedComponent,
  regionBounds: Bounds,
): OutsideComponentCandidate | null => {
  if (doBoundsIntersect(component.bounds, regionBounds)) return null

  const candidates: Array<{
    attrName:
      | "offsetFromLeftEdgeOfRegion"
      | "offsetFromRightEdgeOfRegion"
      | "offsetFromTopEdgeOfRegion"
      | "offsetFromBottomEdgeOfRegion"
    edgeAttrName:
      | "onLeftEdgeOfRegion"
      | "onRightEdgeOfRegion"
      | "onTopEdgeOfRegion"
      | "onBottomEdgeOfRegion"
    value: string
    distance: number
  }> = []

  if (component.bounds.maxX < regionBounds.minX) {
    const distance = regionBounds.minX - component.bounds.maxX
    candidates.push({
      attrName: "offsetFromLeftEdgeOfRegion",
      edgeAttrName: "onLeftEdgeOfRegion",
      value: fmtMm(distance),
      distance,
    })
  }

  if (component.bounds.minX > regionBounds.maxX) {
    const distance = component.bounds.minX - regionBounds.maxX
    candidates.push({
      attrName: "offsetFromRightEdgeOfRegion",
      edgeAttrName: "onRightEdgeOfRegion",
      value: fmtMm(distance),
      distance,
    })
  }

  if (component.bounds.maxY < regionBounds.minY) {
    const distance = regionBounds.minY - component.bounds.maxY
    candidates.push({
      attrName: "offsetFromBottomEdgeOfRegion",
      edgeAttrName: "onBottomEdgeOfRegion",
      value: fmtMm(distance),
      distance,
    })
  }

  if (component.bounds.minY > regionBounds.maxY) {
    const distance = component.bounds.minY - regionBounds.maxY
    candidates.push({
      attrName: "offsetFromTopEdgeOfRegion",
      edgeAttrName: "onTopEdgeOfRegion",
      value: fmtMm(distance),
      distance,
    })
  }

  if (candidates.length === 0) return null

  const closestCandidates = candidates
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)

  const attrs: Record<string, string | true> = {}

  for (const candidate of closestCandidates) {
    if (roundsToZeroMm(candidate.distance)) {
      attrs[candidate.edgeAttrName] = true
      continue
    }
    attrs[candidate.attrName] = candidate.value
  }

  return {
    name: component.name,
    attrs,
    bounds: component.bounds,
    score: closestCandidates.reduce(
      (smallestDistance, candidate) =>
        Math.min(smallestDistance, candidate.distance),
      Number.POSITIVE_INFINITY,
    ),
  }
}

const getOutsideComponents = (
  regionBounds: Bounds,
  placedComponents: PlacedComponent[],
): NearbyComponent[] =>
  placedComponents
    .map((component) => getOutsideComponentCandidate(component, regionBounds))
    .filter(
      (component): component is OutsideComponentCandidate => component !== null,
    )
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((component) => ({
      name: component.name,
      minX: component.bounds.minX,
      maxX: component.bounds.maxX,
      minY: component.bounds.minY,
      maxY: component.bounds.maxY,
      ...component.attrs,
    }))

const getNearbyComponents = (
  regionBounds: Bounds,
  placedComponents: PlacedComponent[],
): NearbyComponent[] => {
  const overlappingComponents = getContainedOrIntersectingComponents(
    regionBounds,
    placedComponents,
  )

  const outsideComponents = getOutsideComponents(regionBounds, placedComponents)

  return [...overlappingComponents, ...outsideComponents]
}

const nearbyComponentToString = (component: NearbyComponent): string => {
  const attrs = [`name="${xmlEscape(component.name)}"`]

  if ("containedWithinBounds" in component) {
    attrs.push("containedWithinBounds")
    attrs.push(`minX="${fmtMm(component.minX)}"`)
    attrs.push(`maxX="${fmtMm(component.maxX)}"`)
    attrs.push(`minY="${fmtMm(component.minY)}"`)
    attrs.push(`maxY="${fmtMm(component.maxY)}"`)
  } else if ("regionWithinComponent" in component) {
    attrs.push("regionWithinComponent")
    attrs.push(`minX="${fmtMm(component.minX)}"`)
    attrs.push(`maxX="${fmtMm(component.maxX)}"`)
    attrs.push(`minY="${fmtMm(component.minY)}"`)
    attrs.push(`maxY="${fmtMm(component.maxY)}"`)
  } else if (
    "onLeftEdgeOfRegion" in component ||
    "onRightEdgeOfRegion" in component ||
    "onTopEdgeOfRegion" in component ||
    "onBottomEdgeOfRegion" in component
  ) {
    if (component.onLeftEdgeOfRegion) attrs.push("onLeftEdgeOfRegion")
    if (component.onRightEdgeOfRegion) attrs.push("onRightEdgeOfRegion")
    if (component.onTopEdgeOfRegion) attrs.push("onTopEdgeOfRegion")
    if (component.onBottomEdgeOfRegion) attrs.push("onBottomEdgeOfRegion")
    attrs.push(`minX="${fmtMm(component.minX)}"`)
    attrs.push(`maxX="${fmtMm(component.maxX)}"`)
    attrs.push(`minY="${fmtMm(component.minY)}"`)
    attrs.push(`maxY="${fmtMm(component.maxY)}"`)
  } else {
    const offsetComponent = component as NearbyComponentOffsetFromRegion

    if (offsetComponent.onLeftEdgeOfRegion) attrs.push("onLeftEdgeOfRegion")
    if (offsetComponent.onRightEdgeOfRegion) attrs.push("onRightEdgeOfRegion")
    if (offsetComponent.onTopEdgeOfRegion) attrs.push("onTopEdgeOfRegion")
    if (offsetComponent.onBottomEdgeOfRegion) attrs.push("onBottomEdgeOfRegion")
    attrs.push(`minX="${fmtMm(offsetComponent.minX)}"`)
    attrs.push(`maxX="${fmtMm(offsetComponent.maxX)}"`)
    attrs.push(`minY="${fmtMm(offsetComponent.minY)}"`)
    attrs.push(`maxY="${fmtMm(offsetComponent.maxY)}"`)

    if (offsetComponent.offsetFromLeftEdgeOfRegion) {
      attrs.push(
        `offsetFromLeftEdgeOfRegion="${xmlEscape(offsetComponent.offsetFromLeftEdgeOfRegion)}"`,
      )
    }
    if (offsetComponent.offsetFromRightEdgeOfRegion) {
      attrs.push(
        `offsetFromRightEdgeOfRegion="${xmlEscape(offsetComponent.offsetFromRightEdgeOfRegion)}"`,
      )
    }
    if (offsetComponent.offsetFromTopEdgeOfRegion) {
      attrs.push(
        `offsetFromTopEdgeOfRegion="${xmlEscape(offsetComponent.offsetFromTopEdgeOfRegion)}"`,
      )
    }
    if (offsetComponent.offsetFromBottomEdgeOfRegion) {
      attrs.push(
        `offsetFromBottomEdgeOfRegion="${xmlEscape(offsetComponent.offsetFromBottomEdgeOfRegion)}"`,
      )
    }
  }

  return `    <NearbyComponent ${attrs.join(" ")} />`
}

const lineItemToString = (lineItem: AnalysisLineItem): string => {
  switch (lineItem.lineItemType) {
    case "CongestedRegion": {
      const nearbyComponentLines = lineItem.nearbyComponents.map(
        nearbyComponentToString,
      )

      return [
        `<CongestedRegion probabilityOfFailure="${lineItem.probabilityOfFailure}" minX="${fmtMm(lineItem.bounds.minX)}" maxX="${fmtMm(lineItem.bounds.maxX)}" minY="${fmtMm(lineItem.bounds.minY)}" maxY="${fmtMm(lineItem.bounds.maxY)}" width="${fmtMm(lineItem.width)}" height="${fmtMm(lineItem.height)}">`,
        ...nearbyComponentLines,
        "</CongestedRegion>",
      ].join("\n")
    }
    default:
      return ""
  }
}

export const analyzeGlobalCapacityNodes = (
  nodes: RoutingCapacityNode[],
  circuitJson?: CircuitJson,
): AnalyzeRoutingResult => {
  const placedComponents = Array.isArray(circuitJson)
    ? getPlacedComponents(circuitJson as CircuitElement[])
    : []
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
      const bounds = getBounds(node)
      return {
        lineItemType: "CongestedRegion" as const,
        probabilityOfFailure: fmtPercent(
          getProbabilityOfFailure(node, maxDensity, maxPortPointCount),
        ),
        bounds,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        nearbyComponents: getNearbyComponents(bounds, placedComponents),
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
