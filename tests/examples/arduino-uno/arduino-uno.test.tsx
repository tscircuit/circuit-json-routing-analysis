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
  expect(regions[0].nearbyComponents[0].name).toBe("C11")

  expect(text.split("\n\n").slice(0, 2).join("\n\n")).toMatchInlineSnapshot(`
    "<CongestedRegion severity="high" probabilityOfFailure="2.7%" connectionCount="1" netCount="1" componentsIntersectingRegion="0" left="-4.6mm" right="-4.5mm" bottom="-18.7mm" top="-18.2mm" width="0.1mm" height="0.5mm">
        <NearbyComponent name="C11" edgeDistance="0mm" directions="left" freeSpaceOnLeft="3.1mm" freeSpaceAbove=">5.0mm" freeSpaceBelow="4.7mm" left="-7.4mm" right="-4.6mm" bottom="-18.7mm" top="-17.3mm" />
        <NearbyComponent name="J_PWR" edgeDistance="4.68mm" directions="bottom" freeSpaceOnLeft=">5.0mm" freeSpaceOnRight="3.6mm" freeSpaceBelow=">5.0mm" left="-7.1mm" right="12.2mm" bottom="-24.9mm" top="-23.4mm" />
        <NearbyComponent name="U4" edgeDistance="4.688mm" directions="left,top" freeSpaceOnLeft="4.6mm" freeSpaceAbove=">5.0mm" left="-16.2mm" right="-7.8mm" bottom="-14.8mm" top="-9.2mm" />
    </CongestedRegion>

    <CongestedRegion severity="high" probabilityOfFailure="2.1%" connectionCount="2" netCount="2" componentsIntersectingRegion="0" left="-18.9mm" right="-18.4mm" bottom="6.9mm" top="7.3mm" width="0.6mm" height="0.4mm">
        <NearbyComponent name="U2" edgeDistance="0mm" directions="top" freeSpaceOnLeft="4.8mm" freeSpaceOnRight=">5.0mm" freeSpaceAbove=">5.0mm" left="-22.7mm" right="-13.3mm" bottom="7.3mm" top="14.7mm" />
        <NearbyComponent name="C7" edgeDistance="2.55mm" directions="bottom" freeSpaceOnLeft=">5.0mm" freeSpaceOnRight=">5.0mm" freeSpaceBelow="2.8mm" left="-18.8mm" right="-17.2mm" bottom="3.7mm" top="4.3mm" />
    </CongestedRegion>"
  `)
}, 8_000)
