import type { Bounds, RoutingCapacityNode } from "./types"

export interface CongestedCapacityRegionCandidate {
  node: RoutingCapacityNode
  bounds: Bounds
  probabilityOfFailure: number
}

export interface MergedCongestedCapacityRegion {
  nodes: RoutingCapacityNode[]
  bounds: Bounds
  probabilityOfFailure: number
}

interface PreparedCandidate {
  originalIndex: number
  candidate: CongestedCapacityRegionCandidate
  area: number
  connectionNames: Set<string>
}

const getBoundsArea = (bounds: Bounds): number =>
  Math.max(0, bounds.maxX - bounds.minX) *
  Math.max(0, bounds.maxY - bounds.minY)

const getIntersectionArea = (a: Bounds, b: Bounds): number => {
  const width = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  const height = Math.max(
    0,
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY),
  )

  return width * height
}

const getConnectionNames = (node: RoutingCapacityNode): Set<string> =>
  new Set(
    node.portPoints
      .map(
        (portPoint) => portPoint.rootConnectionName ?? portPoint.connectionName,
      )
      .filter((connectionName) => connectionName.length > 0),
  )

const getSetSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0

  let intersectionSize = 0
  for (const value of a) {
    if (b.has(value)) intersectionSize += 1
  }

  return intersectionSize / (a.size + b.size - intersectionSize)
}

const shouldMergeCandidates = (
  a: PreparedCandidate,
  b: PreparedCandidate,
): boolean => {
  if (a.area === 0 || b.area === 0) return false

  const intersectionArea = getIntersectionArea(
    a.candidate.bounds,
    b.candidate.bounds,
  )
  if (intersectionArea === 0) return false

  const smallerAreaCoverage = intersectionArea / Math.min(a.area, b.area)
  const areaSimilarity = Math.min(a.area, b.area) / Math.max(a.area, b.area)

  // Nearly identical mesh nodes describe the same physical bottleneck even
  // when each node happens to contain a different subset of connections.
  if (smallerAreaCoverage >= 0.8 && areaSimilarity >= 0.5) return true

  // Less exact geometric duplicates must also describe mostly the same
  // routing traffic before they are combined.
  const connectionSimilarity = getSetSimilarity(
    a.connectionNames,
    b.connectionNames,
  )

  return smallerAreaCoverage >= 0.5 && connectionSimilarity >= 0.5
}

const unionBounds = (bounds: Bounds[]): Bounds => ({
  minX: Math.min(...bounds.map((bound) => bound.minX)),
  maxX: Math.max(...bounds.map((bound) => bound.maxX)),
  minY: Math.min(...bounds.map((bound) => bound.minY)),
  maxY: Math.max(...bounds.map((bound) => bound.maxY)),
})

export const mergeCongestedCapacityRegions = (
  candidates: CongestedCapacityRegionCandidate[],
): MergedCongestedCapacityRegion[] => {
  const parents = candidates.map((_, index) => index)
  const preparedCandidates: PreparedCandidate[] = candidates
    .map((candidate, originalIndex) => ({
      originalIndex,
      candidate,
      area: getBoundsArea(candidate.bounds),
      connectionNames: getConnectionNames(candidate.node),
    }))
    .sort((a, b) => a.candidate.bounds.minX - b.candidate.bounds.minX)

  const findRoot = (index: number): number => {
    let root = index
    while (parents[root] !== root) root = parents[root]!

    let current = index
    while (parents[current] !== current) {
      const next = parents[current]!
      parents[current] = root
      current = next
    }

    return root
  }

  const mergeRoots = (firstIndex: number, secondIndex: number): void => {
    const firstRoot = findRoot(firstIndex)
    const secondRoot = findRoot(secondIndex)
    if (firstRoot === secondRoot) return
    parents[secondRoot] = firstRoot
  }

  for (
    let firstPosition = 0;
    firstPosition < preparedCandidates.length;
    firstPosition += 1
  ) {
    const first = preparedCandidates[firstPosition]!
    for (
      let secondPosition = firstPosition + 1;
      secondPosition < preparedCandidates.length;
      secondPosition += 1
    ) {
      const second = preparedCandidates[secondPosition]!
      if (second.candidate.bounds.minX >= first.candidate.bounds.maxX) break
      if (!shouldMergeCandidates(first, second)) continue
      mergeRoots(first.originalIndex, second.originalIndex)
    }
  }

  const candidatesByRoot = new Map<number, CongestedCapacityRegionCandidate[]>()

  for (let index = 0; index < candidates.length; index += 1) {
    const root = findRoot(index)
    const group = candidatesByRoot.get(root) ?? []
    group.push(candidates[index]!)
    candidatesByRoot.set(root, group)
  }

  return [...candidatesByRoot.values()].map((group) => ({
    nodes: group.map((candidate) => candidate.node),
    bounds: unionBounds(group.map((candidate) => candidate.bounds)),
    probabilityOfFailure: Math.max(
      ...group.map((candidate) => candidate.probabilityOfFailure),
    ),
  }))
}
