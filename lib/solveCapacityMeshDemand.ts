import {
  AutoroutingPipelineSolver,
  type SimpleRouteConnection,
  type SimpleRouteJson,
} from "@tscircuit/capacity-autorouter"
import type { Point2, RoutingCapacityNode, RoutingPortPoint } from "./types"

type CapacityMeshNode = {
  capacityMeshNodeId: string
  center: Point2
  width: number
  height: number
  availableZ: number[]
  _containsObstacle?: boolean
  _containsTarget?: boolean
}

type CapacityMeshEdge = {
  nodeIds: [string, string]
}

type QueueEntry = {
  nodeId: string
  costFromStart: number
  estimatedTotalCost: number
  previousEntry: QueueEntry | null
}

type RoutedDemandPath = {
  connection: SimpleRouteConnection
  nodeIds: string[]
}

export type CapacityMeshDemandResult = {
  nodes: RoutingCapacityNode[]
  routedConnectionCount: number
  routedPaths: Array<{
    connectionName: string
    nodeIds: string[]
  }>
}

const TOPOLOGY_PHASE = "portPointPathingSolver"
const MAX_TOPOLOGY_STEPS = 2_000_000
const GREEDY_MULTIPLIER = 1.1

const distance = (a: Point2, b: Point2): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

const findClosestTargetNode = (
  point: Point2,
  targetNodes: CapacityMeshNode[],
): CapacityMeshNode => {
  let closestNode = targetNodes[0]!
  let closestDistance = Number.POSITIVE_INFINITY

  for (const node of targetNodes) {
    const nodeDistance = distance(point, node.center)
    if (nodeDistance < closestDistance) {
      closestNode = node
      closestDistance = nodeDistance
    }
  }

  return closestNode
}

const buildAdjacencyMap = (
  nodes: CapacityMeshNode[],
  edges: CapacityMeshEdge[],
): Map<string, string[]> => {
  const adjacencyMap = new Map(
    nodes.map((node) => [node.capacityMeshNodeId, [] as string[]]),
  )

  for (const edge of edges) {
    const [a, b] = edge.nodeIds
    if (!adjacencyMap.has(a) || !adjacencyMap.has(b)) continue
    adjacencyMap.get(a)!.push(b)
    adjacencyMap.get(b)!.push(a)
  }

  return adjacencyMap
}

const reconstructPath = (endEntry: QueueEntry): string[] => {
  const path: string[] = []
  let currentEntry: QueueEntry | null = endEntry

  while (currentEntry) {
    path.push(currentEntry.nodeId)
    currentEntry = currentEntry.previousEntry
  }

  return path
}

const findDemandPath = ({
  connection,
  startNode,
  endNode,
  nodeMap,
  adjacencyMap,
}: {
  connection: SimpleRouteConnection
  startNode: CapacityMeshNode
  endNode: CapacityMeshNode
  nodeMap: Map<string, CapacityMeshNode>
  adjacencyMap: Map<string, string[]>
}): string[] => {
  if (startNode.capacityMeshNodeId === endNode.capacityMeshNodeId) {
    return [startNode.capacityMeshNodeId, endNode.capacityMeshNodeId]
  }

  const candidates: QueueEntry[] = []
  const visitedNodeIds = new Set<string>([startNode.capacityMeshNodeId])

  candidates.push({
    nodeId: startNode.capacityMeshNodeId,
    costFromStart: 0,
    estimatedTotalCost: 0,
    previousEntry: null,
  })

  while (candidates.length > 0) {
    candidates.sort((a, b) => a.estimatedTotalCost - b.estimatedTotalCost)
    const current = candidates.shift()!
    if (candidates.length > 100_000) {
      candidates.splice(100_000, candidates.length - 100_000)
    }
    const currentNode = nodeMap.get(current.nodeId)!
    if (
      (adjacencyMap.get(current.nodeId) ?? []).includes(
        endNode.capacityMeshNodeId,
      )
    ) {
      return reconstructPath({
        nodeId: endNode.capacityMeshNodeId,
        costFromStart: 0,
        estimatedTotalCost: 0,
        previousEntry: current,
      })
    }

    for (const neighborId of adjacencyMap.get(current.nodeId) ?? []) {
      if (visitedNodeIds.has(neighborId)) continue
      const neighbor = nodeMap.get(neighborId)!
      const isTerminal =
        neighborId === startNode.capacityMeshNodeId ||
        neighborId === endNode.capacityMeshNodeId
      if (neighbor._containsObstacle && !isTerminal) continue

      const nextCost =
        current.costFromStart + distance(currentNode.center, neighbor.center)
      candidates.push({
        nodeId: neighborId,
        costFromStart: nextCost,
        estimatedTotalCost:
          nextCost +
          distance(neighbor.center, endNode.center) * GREEDY_MULTIPLIER,
        previousEntry: current,
      })
    }

    visitedNodeIds.add(current.nodeId)
  }

  throw new Error(
    `Capacity-demand analysis could not find a topology path for connection "${connection.name}"`,
  )
}

const getSharedBoundaryCenter = (
  node: CapacityMeshNode,
  adjacentNode: CapacityMeshNode,
): Point2 => {
  const xStart = Math.max(
    node.center.x - node.width / 2,
    adjacentNode.center.x - adjacentNode.width / 2,
  )
  const xEnd = Math.min(
    node.center.x + node.width / 2,
    adjacentNode.center.x + adjacentNode.width / 2,
  )
  const yStart = Math.max(
    node.center.y - node.height / 2,
    adjacentNode.center.y - adjacentNode.height / 2,
  )
  const yEnd = Math.min(
    node.center.y + node.height / 2,
    adjacentNode.center.y + adjacentNode.height / 2,
  )

  return {
    x: (xStart + xEnd) / 2,
    y: (yStart + yEnd) / 2,
  }
}

const getSharedLayer = (
  node: CapacityMeshNode,
  adjacentNode: CapacityMeshNode,
): number => {
  const sharedLayer = node.availableZ.find((z) =>
    adjacentNode.availableZ.includes(z),
  )
  if (sharedLayer === undefined) {
    throw new Error(
      `Capacity mesh edge ${node.capacityMeshNodeId} -> ${adjacentNode.capacityMeshNodeId} has no shared routing layer`,
    )
  }
  return sharedLayer
}

const getRootConnectionName = (
  connection: SimpleRouteConnection,
): string | undefined =>
  connection.__rootConnectionNames?.[0] ??
  connection.rootConnectionName ??
  connection.netConnectionName ??
  connection.__netConnectionName

const convertPathsToRoutingNodes = (
  paths: RoutedDemandPath[],
  nodes: CapacityMeshNode[],
): RoutingCapacityNode[] => {
  const nodeMap = new Map(nodes.map((node) => [node.capacityMeshNodeId, node]))
  const portPointsByNodeId = new Map<string, RoutingPortPoint[]>()

  for (const { connection, nodeIds } of paths) {
    const rootConnectionName = getRootConnectionName(connection)

    for (let edgeIndex = 0; edgeIndex < nodeIds.length - 1; edgeIndex++) {
      const firstNode = nodeMap.get(nodeIds[edgeIndex]!)!
      const secondNode = nodeMap.get(nodeIds[edgeIndex + 1]!)!
      const point = getSharedBoundaryCenter(firstNode, secondNode)
      const z = getSharedLayer(firstNode, secondNode)

      const nodesAtBoundary =
        firstNode.capacityMeshNodeId === secondNode.capacityMeshNodeId
          ? [firstNode]
          : [firstNode, secondNode]
      for (const node of nodesAtBoundary) {
        const portPoints = portPointsByNodeId.get(node.capacityMeshNodeId) ?? []
        portPoints.push({
          ...point,
          z,
          connectionName: connection.name,
          rootConnectionName,
        })
        portPointsByNodeId.set(node.capacityMeshNodeId, portPoints)
      }
    }
  }

  return nodes
    .filter((node) => portPointsByNodeId.has(node.capacityMeshNodeId))
    .map((node) => ({
      capacityMeshNodeId: node.capacityMeshNodeId,
      center: node.center,
      width: node.width,
      height: node.height,
      availableZ: node.availableZ,
      portPoints: portPointsByNodeId.get(node.capacityMeshNodeId)!,
    }))
}

/**
 * Builds the autorouter's real capacity topology, then routes every connection
 * through that topology without rejecting nodes that are over capacity. The
 * resulting demand density is what routing-difficulty analysis measures.
 */
export const solveCapacityMeshDemand = (
  simpleRouteJson: SimpleRouteJson,
): CapacityMeshDemandResult => {
  const topologySolver = new AutoroutingPipelineSolver(simpleRouteJson, {
    effort: 1,
  })

  let topologyStepCount = 0
  while (
    topologySolver.getCurrentPhase() !== TOPOLOGY_PHASE &&
    !topologySolver.failed &&
    !topologySolver.solved &&
    topologyStepCount < MAX_TOPOLOGY_STEPS
  ) {
    topologySolver.step()
    topologyStepCount++
  }

  if (topologySolver.failed) {
    throw new Error(
      `Capacity topology generation failed: ${topologySolver.error ?? "unknown error"}`,
    )
  }
  if (topologySolver.getCurrentPhase() !== TOPOLOGY_PHASE) {
    throw new Error(
      `Capacity topology generation stopped in phase "${topologySolver.getCurrentPhase()}" after ${topologyStepCount} steps`,
    )
  }

  const nodes = topologySolver.capacityNodes as CapacityMeshNode[] | null
  const edges = topologySolver.capacityEdges as CapacityMeshEdge[] | null
  const pointPairRouteJson = topologySolver.srjWithPointPairs
  if (!nodes || !edges || !pointPairRouteJson) {
    throw new Error("Capacity topology generation did not produce a mesh")
  }

  const targetNodes = nodes.filter((node) => node._containsTarget)
  if (targetNodes.length === 0) {
    throw new Error("Capacity topology contains no terminal nodes")
  }

  const nodeMap = new Map(nodes.map((node) => [node.capacityMeshNodeId, node]))
  const adjacencyMap = buildAdjacencyMap(nodes, edges)
  const connectionsWithEndpoints = pointPairRouteJson.connections.map(
    (connection) => {
      if (connection.pointsToConnect.length < 2) {
        throw new Error(
          `Connection "${connection.name}" has fewer than two endpoints`,
        )
      }
      const startNode = findClosestTargetNode(
        connection.pointsToConnect[0]!,
        targetNodes,
      )
      const endNode = findClosestTargetNode(
        connection.pointsToConnect[connection.pointsToConnect.length - 1]!,
        targetNodes,
      )
      return {
        connection,
        startNode,
        endNode,
        straightLineDistance: distance(startNode.center, endNode.center),
      }
    },
  )

  connectionsWithEndpoints.sort(
    (a, b) => a.straightLineDistance - b.straightLineDistance,
  )

  const paths = connectionsWithEndpoints.map(
    ({ connection, startNode, endNode }): RoutedDemandPath => ({
      connection,
      nodeIds: findDemandPath({
        connection,
        startNode,
        endNode,
        nodeMap,
        adjacencyMap,
      }),
    }),
  )

  return {
    nodes: convertPathsToRoutingNodes(paths, nodes),
    routedConnectionCount: paths.length,
    routedPaths: paths.map(({ connection, nodeIds }) => ({
      connectionName: connection.name,
      nodeIds,
    })),
  }
}
