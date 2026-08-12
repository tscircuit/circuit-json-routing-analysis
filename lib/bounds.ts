import type { Bounds, RoutingCapacityNode } from "./types"

export type Direction = "left" | "right" | "top" | "bottom"

export const getBoundsFromNode = (node: RoutingCapacityNode): Bounds => ({
  minX: node.center.x - node.width / 2,
  maxX: node.center.x + node.width / 2,
  minY: node.center.y - node.height / 2,
  maxY: node.center.y + node.height / 2,
})

export const getBoundsWidth = (bounds: Bounds): number =>
  bounds.maxX - bounds.minX

export const getBoundsHeight = (bounds: Bounds): number =>
  bounds.maxY - bounds.minY

export const doBoundsIntersect = (a: Bounds, b: Bounds): boolean =>
  !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)

export const getEdgeDistanceBetweenBounds = (a: Bounds, b: Bounds): number => {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0)
  const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0)

  return Math.hypot(dx, dy)
}

export const getBoundsComparisonTolerance = (...bounds: Bounds[]): number => {
  const coordinateScale = Math.max(
    1,
    ...bounds.flatMap((bound) => [
      Math.abs(bound.minX),
      Math.abs(bound.maxX),
      Math.abs(bound.minY),
      Math.abs(bound.maxY),
    ]),
  )

  return Number.EPSILON * coordinateScale * 16
}

export const getOverlapDepthBetweenBounds = (a: Bounds, b: Bounds): number => {
  const overlapWidth = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
  const overlapHeight = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
  const comparisonTolerance = getBoundsComparisonTolerance(a, b)

  if (
    overlapWidth <= comparisonTolerance ||
    overlapHeight <= comparisonTolerance
  ) {
    return 0
  }

  return Math.min(overlapWidth, overlapHeight)
}

export const isContainedWithinBounds = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): boolean =>
  componentBounds.minX >= regionBounds.minX &&
  componentBounds.maxX <= regionBounds.maxX &&
  componentBounds.minY >= regionBounds.minY &&
  componentBounds.maxY <= regionBounds.maxY

export const doesRegionFitWithinComponent = (
  componentBounds: Bounds,
  regionBounds: Bounds,
): boolean =>
  regionBounds.minX >= componentBounds.minX &&
  regionBounds.maxX <= componentBounds.maxX &&
  regionBounds.minY >= componentBounds.minY &&
  regionBounds.maxY <= componentBounds.maxY

export const translateBounds = (
  bounds: Bounds,
  direction: Direction,
  distance: number,
): Bounds => {
  switch (direction) {
    case "left":
      return {
        minX: bounds.minX - distance,
        maxX: bounds.maxX - distance,
        minY: bounds.minY,
        maxY: bounds.maxY,
      }
    case "right":
      return {
        minX: bounds.minX + distance,
        maxX: bounds.maxX + distance,
        minY: bounds.minY,
        maxY: bounds.maxY,
      }
    case "top":
      return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY + distance,
        maxY: bounds.maxY + distance,
      }
    case "bottom":
      return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY - distance,
        maxY: bounds.maxY - distance,
      }
  }
}
