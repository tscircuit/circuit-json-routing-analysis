import { expect, test } from "bun:test"
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
