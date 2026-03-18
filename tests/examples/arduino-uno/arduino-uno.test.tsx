// @ts-nocheck
import { expect, test } from "bun:test"
import circuitJson from "./arduino-uno.circuit.json"
import { analyzeRouting } from "../../../lib/index"

test("runs routing analysis for arduino-uno", async () => {
  const analysis = await analyzeRouting(circuitJson)
  const regions = analysis.getLineItems()
  const text = analysis.getString()

  expect(regions.length).toBeGreaterThan(0)
  expect(
    regions.every((region) => region.line_item_type === "CongestedRegion"),
  ).toBe(true)
  expect(regions.every((region) => region.probability_of_failure >= 0)).toBe(
    true,
  )
  expect(regions.every((region) => region.probability_of_failure <= 1)).toBe(
    true,
  )
  expect(regions[0].probability_of_failure).toBeGreaterThanOrEqual(
    regions[regions.length - 1].probability_of_failure,
  )

  expect(text.split("\n").slice(0, 5).join("\n")).toMatchInlineSnapshot(`
    "CongestedRegion(probability_of_failure=0.247, bounds=(minX=6.739mm, maxX=13.851mm, minY=-3.444mm, maxY=3.644mm))
    CongestedRegion(probability_of_failure=0.088, bounds=(minX=-17.22mm, maxX=5.088mm, minY=-6.425mm, maxY=5.78mm))
    CongestedRegion(probability_of_failure=0.088, bounds=(minX=5.515mm, maxX=15.502mm, minY=-10.425mm, maxY=-5.094mm))
    CongestedRegion(probability_of_failure=0.064, bounds=(minX=10.403mm, maxX=11.861mm, minY=5.294mm, maxY=5.78mm))
    CongestedRegion(probability_of_failure=0.044, bounds=(minX=5.088mm, maxX=6.739mm, minY=1.525mm, maxY=1.875mm))"
  `)
})
