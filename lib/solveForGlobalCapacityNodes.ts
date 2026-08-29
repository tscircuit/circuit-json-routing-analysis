import type { CircuitJson } from "circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"
import { solveCapacityMeshDemand } from "./solveCapacityMeshDemand"

export const solveForGlobalCapacityNodes = async (circuitJson: CircuitJson) => {
  const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
    circuitJson: circuitJson as any,
  })

  return solveCapacityMeshDemand(simpleRouteJson as any).nodes
}
