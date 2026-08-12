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
<CongestedRegion probabilityOfFailure="2.7%" left="-4.6mm" right="-4.5mm" bottom="-18.7mm" top="-18.2mm" width="0.1mm" height="0.5mm">
    <NearbyComponent name="C11" relation="nearby" edgeDistance="0mm" directions="left" freeSpaceOnLeft="3.1mm" freeSpaceAbove=">5.0mm" freeSpaceBelow="4.7mm" left="-7.4mm" right="-4.6mm" bottom="-18.7mm" top="-17.3mm" />
    <NearbyComponent name="J_PWR" relation="nearby" edgeDistance="4.68mm" directions="bottom" freeSpaceOnLeft=">5.0mm" freeSpaceOnRight="3.6mm" freeSpaceBelow=">5.0mm" left="-7.1mm" right="12.2mm" bottom="-24.9mm" top="-23.4mm" />
    <NearbyComponent name="U4" relation="nearby" edgeDistance="4.688mm" directions="left,top" freeSpaceOnLeft="4.6mm" freeSpaceAbove=">5.0mm" left="-16.2mm" right="-7.8mm" bottom="-14.8mm" top="-9.2mm" />
</CongestedRegion>

<CongestedRegion probabilityOfFailure="2.1%" left="-18.9mm" right="-18.4mm" bottom="6.9mm" top="7.3mm" width="0.6mm" height="0.4mm">
    <NearbyComponent name="U2" relation="nearby" edgeDistance="0mm" directions="top" freeSpaceOnLeft="4.8mm" freeSpaceOnRight=">5.0mm" freeSpaceAbove=">5.0mm" left="-22.7mm" right="-13.3mm" bottom="7.3mm" top="14.7mm" />
    <NearbyComponent name="C7" relation="nearby" edgeDistance="2.55mm" directions="bottom" freeSpaceOnLeft=">5.0mm" freeSpaceOnRight=">5.0mm" freeSpaceBelow="2.8mm" left="-18.8mm" right="-17.2mm" bottom="3.7mm" top="4.3mm" />
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
