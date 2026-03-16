import { AutoroutingPipelineSolver3_HgPortPointPathing } from "@tscircuit/capacity-autorouter"
import type { CircuitJson } from "circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"

export const solveForGlobalCapacityNodes = async (circuitJson: CircuitJson) => {
  const srj = getSimpleRouteJsonFromCircuitJson(circuitJson as any)

  const solver = new AutoroutingPipelineSolver3_HgPortPointPathing(srj, {
    effort: 1,
  })

  await solver.solveUntilPhase("highDensityRouteSolver")

  return solver.uniformPortDistributionSolver!.getOutput()
}
