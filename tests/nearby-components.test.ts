import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeGlobalCapacityNodes } from "../lib/analyzeRoutingNext"
import { getNearbyComponents } from "../lib/getNearbyComponents"
import type { Bounds, RoutingCapacityNode } from "../lib/types"

const regionBounds: Bounds = {
  minX: -1,
  maxX: 1,
  minY: -1,
  maxY: 1,
}

const createComponentElements = ({
  name,
  center,
  width,
  height,
}: {
  name: string
  center: { x: number; y: number }
  width: number
  height: number
}) => {
  const sourceComponentId = `source_component_${name}`

  return [
    {
      type: "source_component",
      source_component_id: sourceComponentId,
      name,
    },
    {
      type: "pcb_component",
      pcb_component_id: `pcb_component_${name}`,
      source_component_id: sourceComponentId,
      center,
      width,
      height,
    },
  ]
}

const circuitJson = [
  ...createComponentElements({
    name: "Overlap",
    center: { x: 1, y: 0 },
    width: 2,
    height: 1,
  }),
  ...createComponentElements({
    name: "LargeBody",
    center: { x: 9, y: 0 },
    width: 15.6,
    height: 1,
  }),
  ...createComponentElements({
    name: "Near",
    center: { x: 2.2, y: 0 },
    width: 1,
    height: 1,
  }),
  ...createComponentElements({
    name: "Diagonal",
    center: { x: 5.5, y: 5.5 },
    width: 1,
    height: 1,
  }),
  ...createComponentElements({
    name: "Far",
    center: { x: 26.5, y: 0 },
    width: 1,
    height: 1,
  }),
]

test("uses physical bounds and excludes components beyond the nearby threshold", () => {
  const nearbyComponents = getNearbyComponents(circuitJson, regionBounds)

  expect(nearbyComponents.map((component) => component.name)).toEqual([
    "Overlap",
    "LargeBody",
    "Near",
  ])
  expect(nearbyComponents[1]).toMatchObject({
    name: "LargeBody",
    relation: "nearby",
    directions: ["right"],
  })
  expect(nearbyComponents[1]?.edgeDistanceMm).toBeCloseTo(0.2)
  expect(nearbyComponents[2]?.edgeDistanceMm).toBeCloseTo(0.7)
  expect(
    nearbyComponents.every((component) => component.edgeDistanceMm >= 0),
  ).toBe(true)
  expect(
    nearbyComponents.every((component) =>
      Object.values(component.freeSpaceByDirection).every(
        (freeSpace) => typeof freeSpace.distanceMm === "number",
      ),
    ),
  ).toBe(true)
})

test("reports overlap depth separately from the displayed edge distance", () => {
  const [overlappingComponent] = getNearbyComponents(circuitJson, regionBounds)

  expect(overlappingComponent).toMatchObject({
    name: "Overlap",
    relation: "overlapping",
    edgeDistanceMm: 0,
    overlapDepthMm: 1,
    directions: ["right"],
  })
})

test("serializes non-negative distances and clear overlap information", () => {
  const node: RoutingCapacityNode = {
    capacityMeshNodeId: "congested-node",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
    availableZ: [0, 1],
    portPoints: [
      {
        portPointId: "port_cramped",
        x: 0,
        y: 0,
        z: 0,
        connectionName: "trace-a",
      },
    ],
  }

  const text = analyzeGlobalCapacityNodes(
    [node],
    circuitJson as unknown as CircuitJson,
  ).getString()

  expect(text).toContain(
    'name="Overlap" relation="overlapping" edgeDistance="0mm" overlapDepth="1mm"',
  )
  expect(text).not.toMatch(/(?:edgeDistance|overlapDepth)="-/)
  expect(text).not.toContain('name="Diagonal"')
  expect(text).not.toContain('name="Far"')
})
