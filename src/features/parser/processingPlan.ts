import type {
  SourceNode,
} from "../source/source";

import type {
  ParserAssignment,
  ParserAssignments,
} from "./parser";


export interface ProcessingPlan {
  parserPaths: Record<string, string[]>;
  ignoredPaths: string[];
  unassignedPaths: string[];
}


function addParserPath(
  parserPaths: Record<string, string[]>,
  parserId: string,
  path: string,
) {
  if (!parserPaths[parserId]) {
    parserPaths[parserId] = [];
  }

  parserPaths[parserId].push(path);
}


function resolveNode(
  node: SourceNode,
  assignments: ParserAssignments,
  inheritedAssignment: ParserAssignment | undefined,
  plan: ProcessingPlan,
) {
  const explicitAssignment =
    assignments[node.path];

  const effectiveAssignment =
    explicitAssignment ??
    inheritedAssignment;

  /*
   * Ignore applies to the complete subtree unless
   * a descendant explicitly overrides it.
   */
  if (node.kind === "file") {
    if (!effectiveAssignment) {
      plan.unassignedPaths.push(
        node.path,
      );

      return;
    }

    if (
      effectiveAssignment.type === "ignore"
    ) {
      plan.ignoredPaths.push(
        node.path,
      );

      return;
    }

    addParserPath(
      plan.parserPaths,
      effectiveAssignment.parserId,
      node.path,
    );

    return;
  }

  for (const child of node.children) {
    resolveNode(
      child,
      assignments,
      effectiveAssignment,
      plan,
    );
  }
}


export function buildProcessingPlan(
  nodes: SourceNode[],
  assignments: ParserAssignments,
): ProcessingPlan {
  const plan: ProcessingPlan = {
    parserPaths: {},
    ignoredPaths: [],
    unassignedPaths: [],
  };

  for (const node of nodes) {
    resolveNode(
      node,
      assignments,
      undefined,
      plan,
    );
  }

  return plan;
}


export function countAssignedFiles(
  plan: ProcessingPlan,
): number {
  return Object.values(
    plan.parserPaths,
  ).reduce(
    (total, paths) =>
      total + paths.length,
    0,
  );
}


export function countParserJobs(
  plan: ProcessingPlan,
): number {
  return Object.keys(
    plan.parserPaths,
  ).length;
}


export function processingPlanReady(
  plan: ProcessingPlan,
): boolean {
  return (
    countAssignedFiles(plan) > 0 &&
    plan.unassignedPaths.length === 0
  );
}