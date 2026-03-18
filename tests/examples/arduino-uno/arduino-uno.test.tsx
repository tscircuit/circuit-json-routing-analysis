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
  expect(regions[0].nearbyComponents[0].name).toBe("U1")

  expect(text.split("\n\n").slice(0, 2).join("\n\n")).toMatchInlineSnapshot(`
    "<CongestedRegion probabilityOfFailure="24.7%" minX="6.7mm" maxX="13.9mm" minY="-3.4mm" maxY="3.6mm" width="7.1mm" height="7.1mm">
        <NearbyComponent name="U1" regionWithinComponent minX="5.1mm" maxX="15.5mm" minY="-5.1mm" maxY="5.3mm" />
        <NearbyComponent name="C7" onTopEdgeOfRegion minX="-18.8mm" maxX="-17.2mm" minY="3.7mm" maxY="4.3mm" />
        <NearbyComponent name="LED_L" minX="25.1mm" maxX="27.5mm" minY="-5.4mm" maxY="-4.4mm" offsetFromRightEdgeOfRegion="11.2mm" offsetFromBottomEdgeOfRegion="1.0mm" />
        <NearbyComponent name="R3" minX="21.5mm" maxX="23.1mm" minY="-5.2mm" maxY="-4.6mm" offsetFromRightEdgeOfRegion="7.7mm" offsetFromBottomEdgeOfRegion="1.1mm" />
    </CongestedRegion>

    <CongestedRegion probabilityOfFailure="8.8%" minX="-17.2mm" maxX="5.1mm" minY="-6.4mm" maxY="5.8mm" width="22.3mm" height="12.2mm">
        <NearbyComponent name="C7" onLeftEdgeOfRegion minX="-18.8mm" maxX="-17.2mm" minY="3.7mm" maxY="4.3mm" />
        <NearbyComponent name="U1" onRightEdgeOfRegion minX="5.1mm" maxX="15.5mm" minY="-5.1mm" maxY="5.3mm" />
        <NearbyComponent name="C3" onTopEdgeOfRegion minX="-4.5mm" maxX="-2.9mm" minY="5.8mm" maxY="6.4mm" />
        <NearbyComponent name="LED_PWR" onBottomEdgeOfRegion minX="-1.9mm" maxX="0.5mm" minY="-7.4mm" maxY="-6.4mm" />
        <NearbyComponent name="R1" onTopEdgeOfRegion minX="0.5mm" maxX="2.1mm" minY="5.8mm" maxY="6.4mm" />
    </CongestedRegion>"
  `)
})
