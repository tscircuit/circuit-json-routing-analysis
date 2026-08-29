// @ts-nocheck
import { expect, test } from "bun:test"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"
import { solveCapacityMeshDemand } from "../../../lib"
import circuitJson from "./am625sip-linux-board.circuit.json"

test("routes every AM625SIP connection through the capacity mesh", () => {
  const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({ circuitJson })
  const result = solveCapacityMeshDemand(simpleRouteJson)

  expect(simpleRouteJson.connections).toHaveLength(141)
  expect(result.routedConnectionCount).toBe(432)
  expect(result.routedPaths).toHaveLength(432)
  expect(result.nodes.length).toBeGreaterThan(0)
  expect(result.nodes.some((node) => node.portPoints.length > 0)).toBe(true)
}, 10_000)
