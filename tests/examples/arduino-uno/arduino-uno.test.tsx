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
    regions.every((region) => region.lineItemType === "CongestedRegion"),
  ).toBe(true)
  expect(
    regions.every((region) => region.probabilityOfFailure.endsWith("%")),
  ).toBe(true)
  expect(
    regions.every((region) =>
      ["critical", "high", "medium", "low"].includes(region.severity),
    ),
  ).toBe(true)
  expect(
    regions.every(
      (region) =>
        Number.parseFloat(region.probabilityOfFailure) >= 0 &&
        Number.parseFloat(region.probabilityOfFailure) <= 100,
    ),
  ).toBe(true)
  expect(
    Number.parseFloat(regions[0].probabilityOfFailure),
  ).toBeGreaterThanOrEqual(
    Number.parseFloat(regions[regions.length - 1].probabilityOfFailure),
  )
  expect(regions[0].width).toBeGreaterThan(0)
  expect(regions[0].height).toBeGreaterThan(0)
  expect(regions[0].nearbyComponents.length).toBeGreaterThan(0)
  expect(regions[0].nearbyComponents[0].name).toBe("USB1")

  expect(text.split("\n\n").slice(0, 2).join("\n\n")).toMatchInlineSnapshot(`
    "<CongestedRegion severity="medium" probabilityOfFailure="1.7%" connectionCount="1" netCount="1" componentsIntersectingRegion="1" left="-30.9mm" right="-30.9mm" bottom="9.8mm" top="9.8mm" width="0.0mm" height="0.0mm">
        <NearbyComponent name="USB1" edgeDistance="0mm" overlapDepth="0.005mm" directions="left,right,bottom,top" regionWithinComponent left="-34.5mm" right="-27.5mm" bottom="2.5mm" top="17.5mm" />
    </CongestedRegion>

    <CongestedRegion severity="medium" probabilityOfFailure="1.7%" connectionCount="1" netCount="1" componentsIntersectingRegion="1" left="-30.9mm" right="-30.9mm" bottom="10.0mm" top="10.0mm" width="0.0mm" height="0.0mm">
        <NearbyComponent name="USB1" edgeDistance="0mm" overlapDepth="0.005mm" directions="left,right,bottom,top" regionWithinComponent left="-34.5mm" right="-27.5mm" bottom="2.5mm" top="17.5mm" />
    </CongestedRegion>"
  `)
}, 8_000)
