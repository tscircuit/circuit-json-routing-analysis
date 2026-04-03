import { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter"
import type { CircuitJson } from "circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"

export const solveForGlobalCapacityNodes = async (circuitJson: CircuitJson) => {
  const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
    circuitJson: circuitJson as any,
  })

  const solver = new AutoroutingPipelineSolver(simpleRouteJson as any, {
    effort: 1,
  })

  await solver.solveUntilPhase("highDensityRouteSolver")

  return solver.uniformPortDistributionSolver?.getOutput() ?? []
}
