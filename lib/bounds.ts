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
