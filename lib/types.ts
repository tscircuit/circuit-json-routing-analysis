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

export interface NearbyComponentWithinBounds {
  name: string
  containedWithinBounds: true
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface NearbyComponentOnRegionEdge {
  name: string
  onLeftEdgeOfRegion?: true
  onRightEdgeOfRegion?: true
  onTopEdgeOfRegion?: true
  onBottomEdgeOfRegion?: true
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface NearbyComponentRegionWithinComponent {
  name: string
  regionWithinComponent: true
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface NearbyComponentOffsetFromRegion {
  name: string
  onLeftEdgeOfRegion?: true
  onRightEdgeOfRegion?: true
  onTopEdgeOfRegion?: true
  onBottomEdgeOfRegion?: true
  minX: number
  maxX: number
  minY: number
  maxY: number
  offsetFromLeftEdgeOfRegion?: string
  offsetFromRightEdgeOfRegion?: string
  offsetFromTopEdgeOfRegion?: string
  offsetFromBottomEdgeOfRegion?: string
}

export type NearbyComponent =
  | NearbyComponentWithinBounds
  | NearbyComponentOnRegionEdge
  | NearbyComponentRegionWithinComponent
  | NearbyComponentOffsetFromRegion

export interface CongestedRegion {
  lineItemType: "CongestedRegion"
  probabilityOfFailure: string
  bounds: Bounds
  width: number
  height: number
  nearbyComponents: NearbyComponent[]
}

export type AnalysisLineItem = CongestedRegion
