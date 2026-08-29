import { CapacityMeshRoutingAnalysisSolver } from "@tscircuit/capacity-autorouter"
import type { CircuitJson } from "circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"

export const solveForGlobalCapacityNodes = async (circuitJson: CircuitJson) => {
  const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
    circuitJson: circuitJson as any,
  })

  const solver = new CapacityMeshRoutingAnalysisSolver(simpleRouteJson as any, {
    effort: 1,
  })

  solver.solve()
  if (solver.failed) {
    throw new Error(
      `Capacity mesh routing analysis failed: ${solver.error ?? "unknown error"}`,
    )
  }

  return solver.getOutput()
}
