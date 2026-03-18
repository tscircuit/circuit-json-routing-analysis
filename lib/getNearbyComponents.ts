import {
  buildComponentSpatialIndex,
  type ComponentSpatialIndex,
  getDirectionalFreeSpace,
  type SpatialComponent,
} from "./calculateDirectionalFreeSpace"
import {
  doBoundsIntersect,
  doesRegionFitWithinComponent,
  isContainedWithinBounds,
  type Direction,
} from "./bounds"
import type { Bounds, NearbyComponent } from "./types"

type CircuitElement = {
  type?: string
  [key: string]: unknown
}

type PlacedComponent = SpatialComponent

type OutsideComponentCandidate = {
  componentIndex: number
  name: string
  score: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  onLeftEdgeOfRegion?: true
  onRightEdgeOfRegion?: true
  onTopEdgeOfRegion?: true
  onBottomEdgeOfRegion?: true
  distToLeftEdgeOfRegion?: string
  distToRightEdgeOfRegion?: string
  distToTopOfRegion?: string
  distToBottomOfRegion?: string
}

const fmtMm = (value: number): string => `${value.toFixed(1)}mm`

const roundsToZeroMm = (value: number): boolean => Math.abs(value) < 0.05

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

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

const getOffsetFromTopOfRegion = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): string => fmtMm(regionBounds.maxY - componentBounds.maxY)

const getOffsetFromBottomOfRegion = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): string => fmtMm(componentBounds.minY - regionBounds.minY)

const getOffsetFromLeftOfRegion = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): string => fmtMm(componentBounds.minX - regionBounds.minX)

const getOffsetFromRightOfRegion = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): string => fmtMm(regionBounds.maxX - componentBounds.maxX)

const addEdgeAlignedOffsets = (
  nearbyComponent: NearbyComponent,
  componentBounds: Bounds,
  regionBounds: Bounds,
): NearbyComponent => {
  if (
    nearbyComponent.onLeftEdgeOfRegion ||
    nearbyComponent.onRightEdgeOfRegion
  ) {
    nearbyComponent.distToTopOfRegion = getOffsetFromTopOfRegion(
      componentBounds,
      regionBounds,
    )
    nearbyComponent.distToBottomOfRegion = getOffsetFromBottomOfRegion(
      componentBounds,
      regionBounds,
    )
  }

  if (
    nearbyComponent.onTopEdgeOfRegion ||
    nearbyComponent.onBottomEdgeOfRegion
  ) {
    nearbyComponent.distToLeftEdgeOfRegion = getOffsetFromLeftOfRegion(
      componentBounds,
      regionBounds,
    )
    nearbyComponent.distToRightEdgeOfRegion = getOffsetFromRightOfRegion(
      componentBounds,
      regionBounds,
    )
  }

  return nearbyComponent
}

const getDirectionsToExclude = (component: NearbyComponent): Direction[] => {
  const directions: Direction[] = []
  const hasHorizontalEdge =
    component.onLeftEdgeOfRegion || component.onRightEdgeOfRegion
  const hasVerticalEdge =
    component.onTopEdgeOfRegion || component.onBottomEdgeOfRegion

  if (component.onLeftEdgeOfRegion) {
    directions.push("right")
  } else if (component.onRightEdgeOfRegion) {
    directions.push("left")
  } else if (!hasVerticalEdge) {
    if (component.distToLeftEdgeOfRegion) directions.push("right")
    if (component.distToRightEdgeOfRegion) directions.push("left")
  }

  if (component.onTopEdgeOfRegion) {
    directions.push("bottom")
  } else if (component.onBottomEdgeOfRegion) {
    directions.push("top")
  } else if (!hasHorizontalEdge) {
    if (component.distToTopOfRegion) directions.push("bottom")
    if (component.distToBottomOfRegion) directions.push("top")
  }

  return directions
}

const addFreeSpace = (
  nearbyComponent: NearbyComponent,
  componentIndex: number,
  spatialIndex: ComponentSpatialIndex,
): NearbyComponent => {
  const excludedDirections = new Set(getDirectionsToExclude(nearbyComponent))
  const directionsToCheck: Direction[] = []

  for (const direction of ["left", "right", "top", "bottom"] as const) {
    if (excludedDirections.has(direction)) continue
    directionsToCheck.push(direction)
  }

  const freeSpaceByDirection = getDirectionalFreeSpace(
    spatialIndex,
    componentIndex,
    directionsToCheck,
  )

  if (freeSpaceByDirection.left)
    nearbyComponent.freeSpaceOnLeft = freeSpaceByDirection.left
  if (freeSpaceByDirection.right)
    nearbyComponent.freeSpaceOnRight = freeSpaceByDirection.right
  if (freeSpaceByDirection.top)
    nearbyComponent.freeSpaceAbove = freeSpaceByDirection.top
  if (freeSpaceByDirection.bottom)
    nearbyComponent.freeSpaceBelow = freeSpaceByDirection.bottom

  return nearbyComponent
}

const createOverlappingNearbyComponent = (
  component: PlacedComponent,
  componentIndex: number,
  regionBounds: Bounds,
  spatialIndex: ComponentSpatialIndex,
): NearbyComponent => {
  const nearbyComponent: NearbyComponent = {
    name: component.name,
    minX: component.bounds.minX,
    maxX: component.bounds.maxX,
    minY: component.bounds.minY,
    maxY: component.bounds.maxY,
  }

  if (isContainedWithinBounds(component.bounds, regionBounds)) {
    nearbyComponent.containedWithinBounds = true
  } else if (doesRegionFitWithinComponent(component.bounds, regionBounds)) {
    nearbyComponent.regionWithinComponent = true
  } else {
    if (component.bounds.minX <= regionBounds.minX) {
      nearbyComponent.onLeftEdgeOfRegion = true
    }
    if (component.bounds.maxX >= regionBounds.maxX) {
      nearbyComponent.onRightEdgeOfRegion = true
    }
    if (component.bounds.maxY >= regionBounds.maxY) {
      nearbyComponent.onTopEdgeOfRegion = true
    }
    if (component.bounds.minY <= regionBounds.minY) {
      nearbyComponent.onBottomEdgeOfRegion = true
    }
    addEdgeAlignedOffsets(nearbyComponent, component.bounds, regionBounds)
  }

  return addFreeSpace(nearbyComponent, componentIndex, spatialIndex)
}

const getOutsideComponentCandidate = (
  component: PlacedComponent,
  componentIndex: number,
  regionBounds: Bounds,
): OutsideComponentCandidate | null => {
  if (doBoundsIntersect(component.bounds, regionBounds)) return null

  const candidates: Array<{
    direction: "left" | "right" | "top" | "bottom"
    distance: number
  }> = []

  if (component.bounds.maxX < regionBounds.minX) {
    candidates.push({
      direction: "left",
      distance: regionBounds.minX - component.bounds.maxX,
    })
  }

  if (component.bounds.minX > regionBounds.maxX) {
    candidates.push({
      direction: "right",
      distance: component.bounds.minX - regionBounds.maxX,
    })
  }

  if (component.bounds.maxY < regionBounds.minY) {
    candidates.push({
      direction: "bottom",
      distance: regionBounds.minY - component.bounds.maxY,
    })
  }

  if (component.bounds.minY > regionBounds.maxY) {
    candidates.push({
      direction: "top",
      distance: component.bounds.minY - regionBounds.maxY,
    })
  }

  if (candidates.length === 0) return null

  const closestCandidates = candidates
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)

  const nearbyComponentCandidate: OutsideComponentCandidate = {
    componentIndex,
    name: component.name,
    score: closestCandidates.reduce(
      (smallestDistance, candidate) =>
        Math.min(smallestDistance, candidate.distance),
      Number.POSITIVE_INFINITY,
    ),
    minX: component.bounds.minX,
    maxX: component.bounds.maxX,
    minY: component.bounds.minY,
    maxY: component.bounds.maxY,
  }

  for (const candidate of closestCandidates) {
    switch (candidate.direction) {
      case "left":
        if (roundsToZeroMm(candidate.distance)) {
          nearbyComponentCandidate.onLeftEdgeOfRegion = true
        } else {
          nearbyComponentCandidate.distToLeftEdgeOfRegion = fmtMm(
            candidate.distance,
          )
        }
        break
      case "right":
        if (roundsToZeroMm(candidate.distance)) {
          nearbyComponentCandidate.onRightEdgeOfRegion = true
        } else {
          nearbyComponentCandidate.distToRightEdgeOfRegion = fmtMm(
            candidate.distance,
          )
        }
        break
      case "top":
        if (roundsToZeroMm(candidate.distance)) {
          nearbyComponentCandidate.onTopEdgeOfRegion = true
        } else {
          nearbyComponentCandidate.distToTopOfRegion = fmtMm(candidate.distance)
        }
        break
      case "bottom":
        if (roundsToZeroMm(candidate.distance)) {
          nearbyComponentCandidate.onBottomEdgeOfRegion = true
        } else {
          nearbyComponentCandidate.distToBottomOfRegion = fmtMm(
            candidate.distance,
          )
        }
        break
    }
  }

  const nearbyComponent = addEdgeAlignedOffsets(
    {
      name: nearbyComponentCandidate.name,
      minX: nearbyComponentCandidate.minX,
      maxX: nearbyComponentCandidate.maxX,
      minY: nearbyComponentCandidate.minY,
      maxY: nearbyComponentCandidate.maxY,
      ...(nearbyComponentCandidate.onLeftEdgeOfRegion
        ? { onLeftEdgeOfRegion: true as const }
        : {}),
      ...(nearbyComponentCandidate.onRightEdgeOfRegion
        ? { onRightEdgeOfRegion: true as const }
        : {}),
      ...(nearbyComponentCandidate.onTopEdgeOfRegion
        ? { onTopEdgeOfRegion: true as const }
        : {}),
      ...(nearbyComponentCandidate.onBottomEdgeOfRegion
        ? { onBottomEdgeOfRegion: true as const }
        : {}),
      ...(nearbyComponentCandidate.distToLeftEdgeOfRegion
        ? {
            distToLeftEdgeOfRegion:
              nearbyComponentCandidate.distToLeftEdgeOfRegion,
          }
        : {}),
      ...(nearbyComponentCandidate.distToRightEdgeOfRegion
        ? {
            distToRightEdgeOfRegion:
              nearbyComponentCandidate.distToRightEdgeOfRegion,
          }
        : {}),
      ...(nearbyComponentCandidate.distToTopOfRegion
        ? {
            distToTopOfRegion: nearbyComponentCandidate.distToTopOfRegion,
          }
        : {}),
      ...(nearbyComponentCandidate.distToBottomOfRegion
        ? {
            distToBottomOfRegion: nearbyComponentCandidate.distToBottomOfRegion,
          }
        : {}),
    },
    component.bounds,
    regionBounds,
  )

  return {
    ...nearbyComponentCandidate,
    ...nearbyComponent,
  }
}

export const getNearbyComponents = (
  circuitJson: CircuitElement[],
  regionBounds: Bounds,
): NearbyComponent[] => {
  const placedComponents = getPlacedComponents(circuitJson)
  const spatialIndex = buildComponentSpatialIndex(placedComponents)

  const overlappingComponents = placedComponents
    .map((component, componentIndex) => {
      if (!doBoundsIntersect(component.bounds, regionBounds)) return null
      return createOverlappingNearbyComponent(
        component,
        componentIndex,
        regionBounds,
        spatialIndex,
      )
    })
    .filter(
      (component): component is NonNullable<typeof component> =>
        component !== null,
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const outsideComponents = placedComponents
    .map((component, componentIndex) =>
      getOutsideComponentCandidate(component, componentIndex, regionBounds),
    )
    .filter(
      (component): component is NonNullable<typeof component> =>
        component !== null,
    )
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((component) =>
      addFreeSpace(
        {
          name: component.name,
          minX: component.minX,
          maxX: component.maxX,
          minY: component.minY,
          maxY: component.maxY,
          ...(component.onLeftEdgeOfRegion
            ? { onLeftEdgeOfRegion: true as const }
            : {}),
          ...(component.onRightEdgeOfRegion
            ? { onRightEdgeOfRegion: true as const }
            : {}),
          ...(component.onTopEdgeOfRegion
            ? { onTopEdgeOfRegion: true as const }
            : {}),
          ...(component.onBottomEdgeOfRegion
            ? { onBottomEdgeOfRegion: true as const }
            : {}),
          ...(component.distToLeftEdgeOfRegion
            ? {
                distToLeftEdgeOfRegion: component.distToLeftEdgeOfRegion,
              }
            : {}),
          ...(component.distToRightEdgeOfRegion
            ? {
                distToRightEdgeOfRegion: component.distToRightEdgeOfRegion,
              }
            : {}),
          ...(component.distToTopOfRegion
            ? { distToTopOfRegion: component.distToTopOfRegion }
            : {}),
          ...(component.distToBottomOfRegion
            ? { distToBottomOfRegion: component.distToBottomOfRegion }
            : {}),
        },
        component.componentIndex,
        spatialIndex,
      ),
    )

  return [...overlappingComponents, ...outsideComponents]
}
