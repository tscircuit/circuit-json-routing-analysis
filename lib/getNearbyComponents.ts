import {
  buildComponentSpatialIndex,
  type ComponentSpatialIndex,
  getDirectionalFreeSpace,
  type SpatialComponent,
} from "./calculateDirectionalFreeSpace"
import {
  doesRegionFitWithinComponent,
  getBoundsComparisonTolerance,
  getEdgeDistanceBetweenBounds,
  getOverlapDepthBetweenBounds,
  isContainedWithinBounds,
  type Direction,
} from "./bounds"
import type { Bounds, NearbyComponent, NearbyComponentDirection } from "./types"

type CircuitElement = {
  type?: string
  [key: string]: unknown
}

type PlacedComponent = SpatialComponent

export const DEFAULT_MAX_NEARBY_COMPONENT_DISTANCE_MM = 5

export interface GetNearbyComponentsOptions {
  maxDistanceMm?: number
}

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

const getOutsideDirections = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): NearbyComponentDirection[] => {
  const directions: NearbyComponentDirection[] = []
  const tolerance = getBoundsComparisonTolerance(componentBounds, regionBounds)

  if (componentBounds.maxX <= regionBounds.minX + tolerance)
    directions.push("left")
  if (componentBounds.minX >= regionBounds.maxX - tolerance)
    directions.push("right")
  if (componentBounds.maxY <= regionBounds.minY + tolerance)
    directions.push("bottom")
  if (componentBounds.minY >= regionBounds.maxY - tolerance)
    directions.push("top")

  return directions
}

const getOverlapDirections = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): NearbyComponentDirection[] => {
  const directions: NearbyComponentDirection[] = []

  if (componentBounds.minX <= regionBounds.minX) directions.push("left")
  if (componentBounds.maxX >= regionBounds.maxX) directions.push("right")
  if (componentBounds.minY <= regionBounds.minY) directions.push("bottom")
  if (componentBounds.maxY >= regionBounds.maxY) directions.push("top")

  return directions
}

const getDirectionsToExclude = (
  component: Pick<NearbyComponent, "directions">,
): Direction[] => {
  const directions: Direction[] = []

  for (const direction of component.directions) {
    switch (direction) {
      case "left":
        directions.push("right")
        break
      case "right":
        directions.push("left")
        break
      case "top":
        directions.push("bottom")
        break
      case "bottom":
        directions.push("top")
        break
    }
  }

  return directions
}

const addFreeSpace = (
  nearbyComponent: Omit<NearbyComponent, "freeSpaceByDirection">,
  componentIndex: number,
  spatialIndex: ComponentSpatialIndex,
): NearbyComponent => {
  const excludedDirections = new Set(getDirectionsToExclude(nearbyComponent))
  const directionsToCheck: Direction[] = []

  for (const direction of ["left", "right", "top", "bottom"] as const) {
    if (excludedDirections.has(direction)) continue
    directionsToCheck.push(direction)
  }

  return {
    ...nearbyComponent,
    freeSpaceByDirection: getDirectionalFreeSpace(
      spatialIndex,
      componentIndex,
      directionsToCheck,
    ),
  }
}

const createNearbyComponent = (
  component: PlacedComponent,
  componentIndex: number,
  regionBounds: Bounds,
  spatialIndex: ComponentSpatialIndex,
): NearbyComponent => {
  const edgeDistanceMm = getEdgeDistanceBetweenBounds(
    component.bounds,
    regionBounds,
  )
  const overlapDepthMm = getOverlapDepthBetweenBounds(
    component.bounds,
    regionBounds,
  )
  const overlapsRegion = overlapDepthMm > 0
  const nearbyComponent: Omit<NearbyComponent, "freeSpaceByDirection"> = {
    name: component.name,
    bounds: component.bounds,
    edgeDistanceMm,
    directions: overlapsRegion
      ? getOverlapDirections(component.bounds, regionBounds)
      : getOutsideDirections(component.bounds, regionBounds),
    ...(overlapsRegion ? { overlapDepthMm } : {}),
  }

  if (
    overlapsRegion &&
    isContainedWithinBounds(component.bounds, regionBounds)
  ) {
    nearbyComponent.containedWithinBounds = true
  } else if (
    overlapsRegion &&
    doesRegionFitWithinComponent(component.bounds, regionBounds)
  ) {
    nearbyComponent.regionWithinComponent = true
  }

  return addFreeSpace(nearbyComponent, componentIndex, spatialIndex)
}

export const getNearbyComponents = (
  circuitJson: CircuitElement[],
  regionBounds: Bounds,
  options: GetNearbyComponentsOptions = {},
): NearbyComponent[] => {
  const maxDistanceMm =
    options.maxDistanceMm ?? DEFAULT_MAX_NEARBY_COMPONENT_DISTANCE_MM

  if (!Number.isFinite(maxDistanceMm) || maxDistanceMm < 0) {
    throw new RangeError("maxDistanceMm must be a non-negative finite number")
  }

  const placedComponents = getPlacedComponents(circuitJson)
  const spatialIndex = buildComponentSpatialIndex(placedComponents)

  return placedComponents
    .map((component, componentIndex) =>
      createNearbyComponent(
        component,
        componentIndex,
        regionBounds,
        spatialIndex,
      ),
    )
    .filter(
      (component) =>
        component.overlapDepthMm !== undefined ||
        component.edgeDistanceMm <= maxDistanceMm,
    )
    .sort(
      (a, b) =>
        a.edgeDistanceMm - b.edgeDistanceMm ||
        (b.overlapDepthMm ?? 0) - (a.overlapDepthMm ?? 0) ||
        a.name.localeCompare(b.name),
    )
}
