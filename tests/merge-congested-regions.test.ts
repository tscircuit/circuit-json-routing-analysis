import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeGlobalCapacityNodes } from "../lib/analyzeRoutingNext"
import type { RoutingCapacityNode } from "../lib/types"

const createNode = ({
  id,
  x,
  connectionName,
}: {
  id: string
  x: number
  connectionName: string
}): RoutingCapacityNode => ({
  capacityMeshNodeId: id,
  center: { x, y: 0 },
  width: 4,
  height: 4,
  availableZ: [0, 1],
  portPoints: [
    {
      portPointId: `${id}_cramped`,
      x,
      y: 0,
      z: 0,
      connectionName,
    },
  ],
})

test("merges duplicate congestion regions without merging distinct regions", () => {
  const analysis = analyzeGlobalCapacityNodes([
    createNode({ id: "node-a", x: 0, connectionName: "trace-a" }),
    createNode({ id: "node-b", x: 0.2, connectionName: "trace-b" }),
    createNode({ id: "node-c", x: 10, connectionName: "trace-c" }),
  ])

  const regions = analysis.getLineItems()

  expect(regions).toHaveLength(2)
  expect(regions[0]?.bounds).toEqual({
    minX: -2,
    maxX: 2.2,
    minY: -2,
    maxY: 2,
  })
  expect(regions[0]?.width).toBeCloseTo(4.2)
  expect(regions[1]?.bounds).toEqual({
    minX: 8,
    maxX: 12,
    minY: -2,
    maxY: 2,
  })
})

test("returns merged regions with deterministic severity ranking and metrics", () => {
  const higherTrafficNode: RoutingCapacityNode = {
    ...createNode({ id: "higher-traffic", x: 10, connectionName: "trace-a" }),
    availableZ: [0],
    portPoints: [
      {
        portPointId: "higher-traffic-a_cramped",
        x: 10,
        y: 0,
        z: 0,
        connectionName: "trace-a",
        rootConnectionName: "net-a",
      },
      {
        portPointId: "higher-traffic-b_cramped",
        x: 10,
        y: 0,
        z: 0,
        connectionName: "trace-b",
        rootConnectionName: "net-b",
      },
    ],
  }
  const lowerTrafficNode: RoutingCapacityNode = {
    ...createNode({ id: "lower-traffic", x: 0, connectionName: "trace-c" }),
    availableZ: [0, 1],
  }

  const analysis = analyzeGlobalCapacityNodes([
    lowerTrafficNode,
    higherTrafficNode,
  ])
  const regions = analysis.getLineItems()

  expect(regions).toHaveLength(2)
  expect(regions[0]).toMatchObject({
    severity: "critical",
    probabilityOfFailure: "100%",
    metrics: {
      connectionCount: 2,
      netCount: 2,
      componentsIntersectingRegion: 0,
    },
  })
  expect(Number.parseFloat(regions[1]!.probabilityOfFailure)).toBeLessThan(
    Number.parseFloat(regions[0]!.probabilityOfFailure),
  )
  expect(analysis.getString()).toContain(
    '<CongestedRegion severity="critical" probabilityOfFailure="100%"',
  )
})

test("uses stable geometric ordering when severity metrics are equal", () => {
  const analysis = analyzeGlobalCapacityNodes([
    createNode({ id: "right", x: 10, connectionName: "trace-right" }),
    createNode({ id: "left", x: -10, connectionName: "trace-left" }),
  ])

  expect(analysis.getLineItems().map((region) => region.bounds.minX)).toEqual([
    -12, 8,
  ])
})

test("uses component overlap to rank regions with equal failure scores", () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_blocker",
      name: "Blocker",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_blocker",
      source_component_id: "source_component_blocker",
      center: { x: 10, y: 0 },
      width: 2,
      height: 2,
    },
  ] as unknown as CircuitJson
  const analysis = analyzeGlobalCapacityNodes(
    [
      createNode({ id: "clear", x: -10, connectionName: "trace-clear" }),
      createNode({ id: "blocked", x: 10, connectionName: "trace-blocked" }),
    ],
    circuitJson,
  )

  expect(analysis.getLineItems()[0]).toMatchObject({
    bounds: { minX: 8, maxX: 12 },
    metrics: {
      componentsIntersectingRegion: 1,
    },
  })
  expect(analysis.getLineItems()[0]?.nearbyComponents[0]).toMatchObject({
    name: "Blocker",
    overlapDepthMm: 2,
  })
})
