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
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export interface CongestedRegion {
  line_item_type: "CongestedRegion"
  probability_of_failure: number
  bounds: Bounds
}

export type AnalysisLineItem = CongestedRegion
