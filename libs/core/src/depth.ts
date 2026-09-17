/**
 * depth: how far below the entry points every terrain file sits (§5.1, D13).
 *
 * `depth(f)` is the longest path from any entry point to `f` over the import
 * graph with its cycles collapsed, so a cycle shares one depth and a diamond
 * takes its longer arm. Depths quantise into at most seven bands, the terraces;
 * a file no entry point reaches sits in the deepest one, unreachable (D26).
 */

import { classifyFile } from './modules.js';
import type { ImportEdge } from './modules.js';
import type { Band } from './schema.js';

/** The terraces a map draws at most (§5.1). */
export const MAX_BANDS = 7;

export type FileDepth = {
  readonly path: string;
  readonly band: number;
  readonly reachable: boolean;
  /** The longest path from an entry point; absent when none reaches the file (C2). */
  readonly depth?: number;
};

export type Depths = {
  /** Every terrain file, sorted by path. */
  readonly files: readonly FileDepth[];
  /** One band per index from 0 to the deepest, each with the depths it holds. */
  readonly bands: readonly Band[];
};

type Mark = { readonly index: number; low: number; onStack: boolean };
type Frame = { readonly node: string; readonly mark: Mark; next: number };

function isTerrain(path: string): boolean {
  return classifyFile(path) === 'source';
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function popComponent(stack: { node: string; mark: Mark }[], root: string): string[] {
  const members: string[] = [];
  for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
    top.mark.onStack = false;
    members.push(top.node);
    if (top.node === root) break;
  }
  return members;
}

/**
 * Tarjan's strongly connected components, walked with an explicit stack so a
 * long import chain cannot overflow the call stack. Tarjan finishes a
 * component only after every component it reaches, so the result, reversed,
 * is a topological order of the condensed graph.
 */
function condense(nodes: readonly string[], successors: ReadonlyMap<string, readonly string[]>): string[][] {
  const marks = new Map<string, Mark>();
  const stack: { node: string; mark: Mark }[] = [];
  const components: string[][] = [];
  const open = (node: string): Frame => {
    const mark: Mark = { index: marks.size, low: marks.size, onStack: true };
    marks.set(node, mark);
    stack.push({ node, mark });
    return { node, mark, next: 0 };
  };

  for (const root of nodes) {
    if (marks.has(root)) continue;
    const frames = [open(root)];
    for (let frame = frames.at(-1); frame !== undefined; frame = frames.at(-1)) {
      const to = successors.get(frame.node)?.[frame.next];
      if (to !== undefined) {
        frame.next += 1;
        const seen = marks.get(to);
        if (seen === undefined) frames.push(open(to));
        else if (seen.onStack) frame.mark.low = Math.min(frame.mark.low, seen.index);
        continue;
      }
      frames.pop();
      const parent = frames.at(-1);
      if (parent !== undefined) parent.mark.low = Math.min(parent.mark.low, frame.mark.low);
      if (frame.mark.low === frame.mark.index) components.push(popComponent(stack, frame.node));
    }
  }
  return components;
}

/** Longest path per component, walked in topological order; `undefined` where no entry point reaches. */
function longestPaths(
  order: readonly (readonly string[])[],
  successors: ReadonlyMap<string, readonly string[]>,
  entries: ReadonlySet<string>,
): Map<string, number> {
  const componentOf = new Map<string, number>();
  order.forEach((members, component) => {
    for (const member of members) componentOf.set(member, component);
  });
  const depths = order.map((members): number | undefined =>
    members.some((member) => entries.has(member)) ? 0 : undefined,
  );
  order.forEach((members, component) => {
    const depth = depths[component];
    if (depth === undefined) return;
    for (const to of members.flatMap((member) => successors.get(member) ?? [])) {
      const target = componentOf.get(to);
      if (target === undefined || target === component) continue;
      depths[target] = Math.max(depths[target] ?? 0, depth + 1);
    }
  });

  const byNode = new Map<string, number>();
  order.forEach((members, component) => {
    const depth = depths[component];
    if (depth !== undefined) for (const member of members) byNode.set(member, depth);
  });
  return byNode;
}

/** The band a depth falls in: the depth itself while it fits, else equal-width slices of `0..maxDepth`. */
export function bandOf(depth: number, maxDepth: number): number {
  return maxDepth < MAX_BANDS ? depth : Math.floor((depth * MAX_BANDS) / (maxDepth + 1));
}

function bandsUpTo(maxDepth: number): Band[] {
  const bands: Band[] = [];
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const index = bandOf(depth, maxDepth);
    const last = bands.at(-1);
    if (last?.index === index) bands[bands.length - 1] = { ...last, depth_max: depth };
    else bands.push({ index, depth_min: depth, depth_max: depth });
  }
  return bands;
}

/**
 * Place every terrain file on a terrace. The nodes are the source files among
 * `files`, the edge ends and the entry points; tests and non-TypeScript paths
 * are dropped wherever they appear, so a test is never an entry point and
 * never a node (D4). `files` names the terrain files no edge touches, which
 * would otherwise go missing.
 */
export function computeDepth(
  edges: readonly ImportEdge[],
  entryPoints: readonly string[],
  files: readonly string[] = [],
): Depths {
  const entries = new Set(entryPoints.filter(isTerrain));
  const links = edges.filter(({ from, to }) => from !== to && isTerrain(from) && isTerrain(to));
  const nodes = [...new Set([...files.filter(isTerrain), ...entries, ...links.flatMap(({ from, to }) => [from, to])])];
  nodes.sort(byPath);

  const targets = new Map<string, Set<string>>();
  for (const { from, to } of links) targets.set(from, (targets.get(from) ?? new Set<string>()).add(to));
  const successors = new Map([...targets].map(([from, set]) => [from, [...set].toSorted(byPath)]));

  const depths = longestPaths(condense(nodes, successors).toReversed(), successors, entries);
  const maxDepth = [...depths.values()].reduce((deepest, depth) => Math.max(deepest, depth), 0);
  const deepest = bandOf(maxDepth, maxDepth);
  return {
    files: nodes.map((path) => {
      const depth = depths.get(path);
      return depth === undefined
        ? { path, band: deepest, reachable: false }
        : { path, band: bandOf(depth, maxDepth), reachable: true, depth };
    }),
    bands: nodes.length === 0 ? [] : bandsUpTo(maxDepth),
  };
}
