/**
 * EduPath AI - Pathway Graph Domain Types
 * Strictly aligned with backend/domain_schemas.py and graph_engine.py
 */

import type { StudentProfileCreate, StudentProfileOut } from './studentProfile';

export type NodeType = "education" | "career" | "exploration" | "certification";

export type EdgeType = "progression" | "alternative" | "conditional" | "dependency" | "prerequisite";

export type GenerationIntent = "continue" | "explore_alternatives" | "recover_from_blocked_route";

export interface GraphNode {
  node_id: string;
  node_type: NodeType;
  title: string;
  description: string;
  duration_estimate_months: number | null;
  cost_estimate: number | null;
  cost_currency: string | null;
  milestone_ids?: string[];
  institution_ids?: string[];
  evidence_ids?: string[];
  prerequisite_node_ids?: string[];
}

export type Node = GraphNode;

export interface GraphEdge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  condition: string | null;
}

export type Edge = GraphEdge;

export interface PathwayGraph {
  pathway_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  target_outcome: string | null;
  schema_version: string;
}

/**
 * Graph generation and expansion payload matching backend GraphGenerationRequest
 */
export interface GraphGenerationRequest {
  student_profile_snapshot: StudentProfileCreate | StudentProfileOut | Record<string, any>;
  current_graph: PathwayGraph | null;
  current_node_ids_to_expand: string[];
  candidate_node_count: number;
  generation_intent: GenerationIntent;
}
