import Flatbush from "flatbush"
import { doBoundsIntersect, translateBounds, type Direction } from "./bounds"
import type { Bounds } from "./types"

export interface SpatialComponent {
  name: string
  bounds: Bounds
}

export interface ComponentSpatialIndex {
  components: SpatialComponent[]
  index: Flatbush
}

const MAX_FREE_SPACE_MM = 5
const BINARY_SEARCH_ITERATIONS = 10

export const buildComponentSpatialIndex = (
  components: SpatialComponent[],
): ComponentSpatialIndex => {
  const index = new Flatbush(components.length)

  for (const component of components) {
    index.add(
      component.bounds.minX,
      component.bounds.minY,
      component.bounds.maxX,
      component.bounds.maxY,
    )
  }

  index.finish()

  return { components, index }
}

const hasCollisionAtDistance = (
  spatialIndex: ComponentSpatialIndex,
  componentIndex: number,
  direction: Direction,
  distance: number,
): boolean => {
  const component = spatialIndex.components[componentIndex]
  if (!component) return false

  const translatedBounds = translateBounds(
    component.bounds,
    direction,
    distance,
  )
  const candidateIndexes = spatialIndex.index.search(
    translatedBounds.minX,
    translatedBounds.minY,
    translatedBounds.maxX,
    translatedBounds.maxY,
  )

  for (const candidateIndex of candidateIndexes) {
    if (candidateIndex === componentIndex) continue
    const candidate = spatialIndex.components[candidateIndex]
    if (!candidate) continue
    if (doBoundsIntersect(translatedBounds, candidate.bounds)) return true
  }

  return false
}

const getFreeSpaceForDirection = (
  spatialIndex: ComponentSpatialIndex,
  componentIndex: number,
  direction: Direction,
): string => {
  if (hasCollisionAtDistance(spatialIndex, componentIndex, direction, 0)) {
    return "0.0mm"
  }

  if (
    !hasCollisionAtDistance(
      spatialIndex,
      componentIndex,
      direction,
      MAX_FREE_SPACE_MM,
    )
  ) {
    return ">5mm"
  }

  let low = 0
  let high = MAX_FREE_SPACE_MM

  for (
    let iteration = 0;
    iteration < BINARY_SEARCH_ITERATIONS;
    iteration += 1
  ) {
    const mid = (low + high) / 2
    if (hasCollisionAtDistance(spatialIndex, componentIndex, direction, mid)) {
      high = mid
    } else {
      low = mid
    }
  }

  return `${low.toFixed(1)}mm`
}

export const getDirectionalFreeSpace = (
  spatialIndex: ComponentSpatialIndex,
  componentIndex: number,
  directions: Direction[],
): Partial<Record<Direction, string>> => {
  const freeSpaceByDirection: Partial<Record<Direction, string>> = {}

  for (const direction of directions) {
    freeSpaceByDirection[direction] = getFreeSpaceForDirection(
      spatialIndex,
      componentIndex,
      direction,
    )
  }

  return freeSpaceByDirection
}
