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
        <NearbyComponent name="U1" minX="5.1mm" maxX="15.5mm" minY="-5.1mm" maxY="5.3mm" regionWithinComponent freeSpaceOnLeft=">5mm" freeSpaceOnRight=">5mm" freeSpaceOnTop=">5mm" freeSpaceOnBottom=">5mm" />
        <NearbyComponent name="C7" minX="-18.8mm" maxX="-17.2mm" minY="3.7mm" maxY="4.3mm" onTopEdgeOfRegion offsetFromLeftEdgeOfRegion="-25.5mm" offsetFromRightEdgeOfRegion="31.1mm" freeSpaceOnLeft=">5mm" freeSpaceOnRight=">5mm" freeSpaceOnTop="2.9mm" />
        <NearbyComponent name="LED_L" minX="25.1mm" maxX="27.5mm" minY="-5.4mm" maxY="-4.4mm" offsetFromRightEdgeOfRegion="11.2mm" offsetFromBottomOfRegion="1.0mm" freeSpaceOnRight=">5mm" freeSpaceOnBottom=">5mm" />
        <NearbyComponent name="R3" minX="21.5mm" maxX="23.1mm" minY="-5.2mm" maxY="-4.6mm" offsetFromRightEdgeOfRegion="7.7mm" offsetFromBottomOfRegion="1.1mm" freeSpaceOnRight="2.0mm" freeSpaceOnBottom=">5mm" />
    </CongestedRegion>

    <CongestedRegion probabilityOfFailure="8.8%" minX="-17.2mm" maxX="5.1mm" minY="-6.4mm" maxY="5.8mm" width="22.3mm" height="12.2mm">
        <NearbyComponent name="C7" minX="-18.8mm" maxX="-17.2mm" minY="3.7mm" maxY="4.3mm" onLeftEdgeOfRegion offsetFromTopOfRegion="1.5mm" offsetFromBottomOfRegion="10.1mm" freeSpaceOnLeft=">5mm" freeSpaceOnTop="2.9mm" freeSpaceOnBottom="2.8mm" />
        <NearbyComponent name="U1" minX="5.1mm" maxX="15.5mm" minY="-5.1mm" maxY="5.3mm" onRightEdgeOfRegion offsetFromTopOfRegion="0.5mm" offsetFromBottomOfRegion="1.3mm" freeSpaceOnRight=">5mm" freeSpaceOnTop=">5mm" freeSpaceOnBottom=">5mm" />
        <NearbyComponent name="C3" minX="-4.5mm" maxX="-2.9mm" minY="5.8mm" maxY="6.4mm" onTopEdgeOfRegion offsetFromLeftEdgeOfRegion="12.7mm" offsetFromRightEdgeOfRegion="8.0mm" freeSpaceOnLeft=">5mm" freeSpaceOnRight="3.4mm" freeSpaceOnTop=">5mm" />
        <NearbyComponent name="LED_PWR" minX="-1.9mm" maxX="0.5mm" minY="-7.4mm" maxY="-6.4mm" onBottomEdgeOfRegion offsetFromLeftEdgeOfRegion="15.3mm" offsetFromRightEdgeOfRegion="4.6mm" freeSpaceOnLeft="1.0mm" freeSpaceOnRight=">5mm" freeSpaceOnBottom=">5mm" />
        <NearbyComponent name="R1" minX="0.5mm" maxX="2.1mm" minY="5.8mm" maxY="6.4mm" onTopEdgeOfRegion offsetFromLeftEdgeOfRegion="17.7mm" offsetFromRightEdgeOfRegion="3.0mm" freeSpaceOnLeft="3.4mm" freeSpaceOnRight=">5mm" freeSpaceOnTop=">5mm" />
    </CongestedRegion>"
  `)
})
