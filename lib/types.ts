export interface Point2 {
  x: number
  y: number
}

export interface RoutingPortPoint {
  portPointId?: string
  x: number
  y: number
  z: number
  connectionName: string
  rootConnectionName?: string
}

export interface RoutingCapacityNode {
  capacityMeshNodeId: string
  center: Point2
  width: number
  height: number
  portPoints: RoutingPortPoint[]
  availableZ?: number[]
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface NearbyComponent {
  name: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  containedWithinBounds?: true
  regionWithinComponent?: true
  onLeftEdgeOfRegion?: true
  onRightEdgeOfRegion?: true
  onTopEdgeOfRegion?: true
  onBottomEdgeOfRegion?: true
  distToLeftEdgeOfRegion?: string
  distToRightEdgeOfRegion?: string
  distToTopOfRegion?: string
  distToBottomOfRegion?: string
  freeSpaceOnLeft?: string
  freeSpaceOnRight?: string
  freeSpaceAbove?: string
  freeSpaceBelow?: string
}

export interface CongestedRegion {
  lineItemType: "CongestedRegion"
  probabilityOfFailure: string
  bounds: Bounds
  width: number
  height: number
  nearbyComponents: NearbyComponent[]
}

export type AnalysisLineItem = CongestedRegion
