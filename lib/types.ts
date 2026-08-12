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

export type NearbyComponentDirection = "left" | "right" | "top" | "bottom"

export interface DirectionalFreeSpace {
  distanceMm: number
  isAtLeast: boolean
}

export interface NearbyComponent {
  name: string
  bounds: Bounds
  relation: "overlapping" | "nearby"
  edgeDistanceMm: number
  overlapDepthMm: number
  directions: NearbyComponentDirection[]
  containedWithinBounds?: true
  regionWithinComponent?: true
  freeSpaceByDirection: Partial<
    Record<NearbyComponentDirection, DirectionalFreeSpace>
  >
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
