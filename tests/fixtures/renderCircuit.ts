import { RootCircuit } from "tscircuit"
import { getPlatformConfig } from "@tscircuit/eval"

export const renderCircuit = async (tsxElement: React.ReactElement) => {
  const circuit = new RootCircuit({
    platform: {
      ...getPlatformConfig(),
      partsEngineDisabled: true,
      routingDisabled: true,
    },
  })

  circuit.add(tsxElement)

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
