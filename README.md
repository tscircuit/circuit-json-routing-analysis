# circuit-json-routing-analysis

Analyze a `circuit-json` PCB and report congested routing regions.

Used for `tscircuit check routing-analysis`

## Install

```bash
bun add @tscircuit/circuit-json-routing-analysis
```

## Minimal Usage

```ts
import { analyzeRouting } from "@tscircuit/circuit-json-routing-analysis"

const analysis = await analyzeRouting(circuitJson)

console.log(analysis.getLineItems())
console.log(analysis.getString())
```

## Sample Output

Current snapshot from [`tests/examples/arduino-uno/arduino-uno.test.tsx`](./tests/examples/arduino-uno/arduino-uno.test.tsx), generated from [`tests/examples/arduino-uno/arduino-uno.circuit.json`](./tests/examples/arduino-uno/arduino-uno.circuit.json):

```xml
<CongestedRegion probabilityOfFailure="24.7%" left="6.7mm" right="13.9mm" bottom="-3.4mm" top="3.6mm" width="7.1mm" height="7.1mm">
    <NearbyComponent name="U1" regionWithinComponent freeSpaceOnLeft=">5mm" freeSpaceOnRight=">5mm" freeSpaceAbove=">5mm" freeSpaceBelow=">5mm" left="5.1mm" right="15.5mm" bottom="-5.1mm" top="5.3mm" />
    <NearbyComponent name="C7" onTopEdgeOfRegion distToLeftEdgeOfRegion="-25.5mm" distToRightEdgeOfRegion="31.1mm" freeSpaceOnLeft=">5mm" freeSpaceOnRight=">5mm" freeSpaceAbove="2.9mm" left="-18.8mm" right="-17.2mm" bottom="3.7mm" top="4.3mm" />
    <NearbyComponent name="LED_L" distToRightEdgeOfRegion="11.2mm" distToBottomOfRegion="1.0mm" freeSpaceOnRight=">5mm" freeSpaceBelow=">5mm" left="25.1mm" right="27.5mm" bottom="-5.4mm" top="-4.4mm" />
    <NearbyComponent name="R3" distToRightEdgeOfRegion="7.7mm" distToBottomOfRegion="1.1mm" freeSpaceOnRight="2.0mm" freeSpaceBelow=">5mm" left="21.5mm" right="23.1mm" bottom="-5.2mm" top="-4.6mm" />
</CongestedRegion>

<CongestedRegion probabilityOfFailure="8.8%" left="-17.2mm" right="5.1mm" bottom="-6.4mm" top="5.8mm" width="22.3mm" height="12.2mm">
    <NearbyComponent name="C7" onLeftEdgeOfRegion distToTopOfRegion="1.5mm" distToBottomOfRegion="10.1mm" freeSpaceOnLeft=">5mm" freeSpaceAbove="2.9mm" freeSpaceBelow="2.8mm" left="-18.8mm" right="-17.2mm" bottom="3.7mm" top="4.3mm" />
    <NearbyComponent name="U1" onRightEdgeOfRegion distToTopOfRegion="0.5mm" distToBottomOfRegion="1.3mm" freeSpaceOnRight=">5mm" freeSpaceAbove=">5mm" freeSpaceBelow=">5mm" left="5.1mm" right="15.5mm" bottom="-5.1mm" top="5.3mm" />
    <NearbyComponent name="C3" onTopEdgeOfRegion distToLeftEdgeOfRegion="12.7mm" distToRightEdgeOfRegion="8.0mm" freeSpaceOnLeft=">5mm" freeSpaceOnRight="3.4mm" freeSpaceAbove=">5mm" left="-4.5mm" right="-2.9mm" bottom="5.8mm" top="6.4mm" />
    <NearbyComponent name="LED_PWR" onBottomEdgeOfRegion distToLeftEdgeOfRegion="15.3mm" distToRightEdgeOfRegion="4.6mm" freeSpaceOnLeft="1.0mm" freeSpaceOnRight=">5mm" freeSpaceBelow=">5mm" left="-1.9mm" right="0.5mm" bottom="-7.4mm" top="-6.4mm" />
    <NearbyComponent name="R1" onTopEdgeOfRegion distToLeftEdgeOfRegion="17.7mm" distToRightEdgeOfRegion="3.0mm" freeSpaceOnLeft="3.4mm" freeSpaceOnRight=">5mm" freeSpaceAbove=">5mm" left="0.5mm" right="2.1mm" bottom="5.8mm" top="6.4mm" />
</CongestedRegion>
```

## Run The Example

```bash
bun test tests/examples/arduino-uno/arduino-uno.test.tsx
```

## Build

```bash
bun run build
```
