// @ts-nocheck
import { expect, test } from "bun:test"
import { analyzeRouting } from "../../../lib/index"
import circuitJson from "./am625sip-linux-board.circuit.json"

test("runs routing analysis for the AM625SIP Linux board", async () => {
  const analysis = await analyzeRouting(circuitJson)

  expect(analysis.getLineItems().length).toBeGreaterThan(0)
}, 10_000)
