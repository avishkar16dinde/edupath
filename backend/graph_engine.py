from collections import deque
from collections.abc import Sequence
from typing import Any
import uuid

from pydantic import ValidationError

from domain_schemas import (
    MAX_CANDIDATE_NODES,
    MAX_GRAPH_EDGES,
    MAX_GRAPH_NODES,
    MAX_PROPOSED_EDGES,
    CandidateNode,
    CandidateProposal,
    Edge,
    GraphGenerationRequest,
    Node,
    NodeEndpointRef,
    PathwayGraph,
    ProposedEdge,
)

# Progression and alternative edges may cycle; only prerequisite relations impose ordering.
DEPENDENCY_EDGE_TYPES = frozenset({"dependency", "prerequisite"})


class GraphValidationError(ValueError):
    def __init__(self, errors: Sequence[str]):
        self.errors = tuple(errors)
        super().__init__("Graph validation failed: " + "; ".join(self.errors))


def validate_graph(graph: PathwayGraph) -> PathwayGraph:
    errors: list[str] = []
    if len(graph.nodes) > MAX_GRAPH_NODES:
        errors.append(f"graph exceeds the {MAX_GRAPH_NODES}-node limit")
    if len(graph.edges) > MAX_GRAPH_EDGES:
        errors.append(f"graph exceeds the {MAX_GRAPH_EDGES}-edge limit")

    nodes_by_id: dict[str, Node] = {}
    for node in graph.nodes:
        if node.node_id in nodes_by_id:
            errors.append(f"node '{node.node_id}' has a duplicate node_id")
        else:
            nodes_by_id[node.node_id] = node

    edge_ids: set[str] = set()
    adjacency: dict[str, set[str]] = {node_id: set() for node_id in nodes_by_id}
    indegree = {node_id: 0 for node_id in nodes_by_id}

    def add_dependency(source_id: str, target_id: str) -> None:
        if source_id in adjacency and target_id in adjacency and target_id not in adjacency[source_id]:
            adjacency[source_id].add(target_id)
            indegree[target_id] += 1

    for node in graph.nodes:
        for prerequisite_id in node.prerequisite_node_ids:
            if prerequisite_id not in nodes_by_id:
                errors.append(
                    f"node '{node.node_id}' references missing prerequisite node '{prerequisite_id}'"
                )
            else:
                add_dependency(prerequisite_id, node.node_id)

    for edge in graph.edges:
        if edge.edge_id in edge_ids:
            errors.append(f"edge '{edge.edge_id}' has a duplicate edge_id")
        edge_ids.add(edge.edge_id)

        if edge.source_node_id == edge.target_node_id:
            errors.append(f"edge '{edge.edge_id}' is a self-loop on node '{edge.source_node_id}'")

        source_exists = edge.source_node_id in nodes_by_id
        target_exists = edge.target_node_id in nodes_by_id
        if not source_exists:
            errors.append(f"edge '{edge.edge_id}' references missing source node '{edge.source_node_id}'")
        if not target_exists:
            errors.append(f"edge '{edge.edge_id}' references missing target node '{edge.target_node_id}'")

        if edge.edge_type.casefold() in DEPENDENCY_EDGE_TYPES:
            if source_exists and target_exists:
                add_dependency(edge.source_node_id, edge.target_node_id)

    ready = deque(node_id for node_id, count in indegree.items() if count == 0)
    visited_count = 0
    while ready:
        node_id = ready.popleft()
        visited_count += 1
        for dependent_id in adjacency[node_id]:
            indegree[dependent_id] -= 1
            if indegree[dependent_id] == 0:
                ready.append(dependent_id)
    if visited_count != len(nodes_by_id):
        cyclic_nodes = sorted(node_id for node_id, count in indegree.items() if count > 0)
        errors.append(f"dependency cycle detected involving nodes {cyclic_nodes}")

    if errors:
        raise GraphValidationError(errors)
    return graph


def update_graph(
    existing_graph: PathwayGraph,
    candidate_nodes: Sequence[Node | dict[str, Any]],
    proposed_edges: Sequence[Edge | dict[str, Any]],
) -> PathwayGraph:
    if len(candidate_nodes) > MAX_CANDIDATE_NODES:
        raise GraphValidationError(
            [f"update exceeds the {MAX_CANDIDATE_NODES}-candidate-node batch limit"]
        )
    if len(proposed_edges) > MAX_PROPOSED_EDGES:
        raise GraphValidationError(
            [f"update exceeds the {MAX_PROPOSED_EDGES}-proposed-edge batch limit"]
        )

    validate_graph(existing_graph)
    # Validate candidate nodes and edges, accepting both dicts and model instances
    parsed_nodes = []
    for node in candidate_nodes:
        if isinstance(node, Node):
            parsed_nodes.append(node)
        else:
            try:
                parsed_nodes.append(Node.model_validate(node))
            except ValidationError as exc:
                raise GraphValidationError([f"invalid node data: {exc}"]) from exc
    parsed_edges = []
    for edge in proposed_edges:
        if isinstance(edge, Edge):
            parsed_edges.append(edge)
        else:
            try:
                parsed_edges.append(Edge.model_validate(edge))
            except ValidationError as exc:
                raise GraphValidationError([f"invalid edge data: {exc}"]) from exc

    # Revalidate serialized records so the returned graph owns independent models.
    combined = PathwayGraph.model_validate(
        {
            **existing_graph.model_dump(),
            "nodes": [
                *(node.model_dump() for node in existing_graph.nodes),
                *(node.model_dump() for node in parsed_nodes),
            ],
            "edges": [
                *(edge.model_dump() for edge in existing_graph.edges),
                *(edge.model_dump() for edge in parsed_edges),
            ],
        }
    )
    return validate_graph(combined)


def apply_candidate_proposal(
    request: GraphGenerationRequest | dict[str, Any],
    proposal: CandidateProposal | dict[str, Any],
) -> PathwayGraph:
    if isinstance(request, dict):
        try:
            request = GraphGenerationRequest.model_validate(request)
        except ValidationError as exc:
            raise GraphValidationError([f"invalid graph generation request: {exc}"]) from exc

    if isinstance(proposal, dict):
        try:
            proposal = CandidateProposal.model_validate(proposal)
        except ValidationError as exc:
            raise GraphValidationError([f"malformed candidate proposal: {exc}"]) from exc

    errors: list[str] = []

    # 1. Exact candidate count enforcement
    if len(proposal.candidate_nodes) != request.candidate_node_count:
        errors.append(
            f"candidate proposal contains {len(proposal.candidate_nodes)} nodes, "
            f"expected exactly {request.candidate_node_count}"
        )

    # 2. Duplicate candidate_id check
    candidate_ids: set[str] = set()
    for candidate in proposal.candidate_nodes:
        if candidate.candidate_id in candidate_ids:
            errors.append(f"candidate node '{candidate.candidate_id}' has duplicate candidate_id")
        candidate_ids.add(candidate.candidate_id)

    # 3. Duplicate edge_key check
    edge_keys: set[str] = set()
    for edge in proposal.proposed_edges:
        if edge.edge_key in edge_keys:
            errors.append(f"proposed edge '{edge.edge_key}' has duplicate edge_key")
        edge_keys.add(edge.edge_key)

    # 4. Existing node IDs from current_graph
    existing_graph = request.current_graph
    existing_node_ids: set[str] = set()
    if existing_graph is not None:
        validate_graph(existing_graph)
        existing_node_ids = {n.node_id for n in existing_graph.nodes}

    # 5. Collision between candidate_id and existing node_id
    for candidate in proposal.candidate_nodes:
        if candidate.candidate_id in existing_node_ids:
            errors.append(
                f"candidate_id '{candidate.candidate_id}' collides with existing graph node_id"
            )

    # 6. Candidate prerequisite references resolution & self-prerequisite check
    for candidate in proposal.candidate_nodes:
        seen_prereqs: set[tuple[str, str]] = set()
        for prereq in candidate.prerequisite_refs:
            ref_key = (prereq.kind, prereq.target_id)
            if ref_key in seen_prereqs:
                errors.append(
                    f"candidate node '{candidate.candidate_id}' has duplicate prerequisite reference to '{prereq.target_id}'"
                )
            seen_prereqs.add(ref_key)

            if prereq.kind == "candidate":
                if prereq.candidate_id == candidate.candidate_id:
                    errors.append(
                        f"candidate node '{candidate.candidate_id}' cannot have itself as a prerequisite"
                    )
                elif prereq.candidate_id not in candidate_ids:
                    errors.append(
                        f"candidate node '{candidate.candidate_id}' references missing candidate prerequisite '{prereq.candidate_id}'"
                    )
            elif prereq.kind == "existing_node":
                if existing_graph is None:
                    errors.append(
                        f"candidate node '{candidate.candidate_id}' references existing node '{prereq.node_id}' in an initial generation request"
                    )
                elif prereq.node_id not in existing_node_ids:
                    errors.append(
                        f"candidate node '{candidate.candidate_id}' references missing existing prerequisite node '{prereq.node_id}'"
                    )

    # 7. Proposed edge endpoint resolution and self-loop check
    for edge in proposal.proposed_edges:
        # Check source
        if edge.source.kind == "candidate":
            if edge.source.candidate_id not in candidate_ids:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references missing candidate source '{edge.source.candidate_id}'"
                )
        elif edge.source.kind == "existing_node":
            if existing_graph is None:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references existing source node '{edge.source.node_id}' in an initial generation request"
                )
            elif edge.source.node_id not in existing_node_ids:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references missing existing source node '{edge.source.node_id}'"
                )

        # Check target
        if edge.target.kind == "candidate":
            if edge.target.candidate_id not in candidate_ids:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references missing candidate target '{edge.target.candidate_id}'"
                )
        elif edge.target.kind == "existing_node":
            if existing_graph is None:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references existing target node '{edge.target.node_id}' in an initial generation request"
                )
            elif edge.target.node_id not in existing_node_ids:
                errors.append(
                    f"proposed edge '{edge.edge_key}' references missing existing target node '{edge.target.node_id}'"
                )

        # Self-loop check
        if edge.source.kind == edge.target.kind and edge.source.target_id == edge.target.target_id:
            errors.append(
                f"proposed edge '{edge.edge_key}' is a self-loop on node '{edge.source.target_id}'"
            )

    # 8. Expansion request connectivity and candidate reachability requirement
    if existing_graph is not None and request.current_node_ids_to_expand:
        expansion_ids = set(request.current_node_ids_to_expand)

        # Build undirected adjacency between candidate nodes and expansion anchor nodes
        adj: dict[str, set[str]] = {cand.candidate_id: set() for cand in proposal.candidate_nodes}
        for exp_id in expansion_ids:
            adj[exp_id] = set()

        for edge in proposal.proposed_edges:
            src_id = (
                edge.source.node_id
                if edge.source.kind == "existing_node"
                else edge.source.candidate_id
            )
            tgt_id = (
                edge.target.node_id
                if edge.target.kind == "existing_node"
                else edge.target.candidate_id
            )
            if src_id in adj and tgt_id in adj:
                adj[src_id].add(tgt_id)
                adj[tgt_id].add(src_id)

        for candidate in proposal.candidate_nodes:
            cand_id = candidate.candidate_id
            for prereq in candidate.prerequisite_refs:
                prereq_id = (
                    prereq.node_id
                    if prereq.kind == "existing_node"
                    else prereq.candidate_id
                )
                if prereq_id in adj:
                    adj[cand_id].add(prereq_id)
                    adj[prereq_id].add(cand_id)

        visited: set[str] = set(expansion_ids)
        queue = deque(sorted(expansion_ids))

        while queue:
            curr = queue.popleft()
            for neighbor in adj.get(curr, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        unreachable_candidates = sorted(
            cand.candidate_id
            for cand in proposal.candidate_nodes
            if cand.candidate_id not in visited
        )

        if unreachable_candidates:
            if len(unreachable_candidates) == len(proposal.candidate_nodes):
                errors.append(
                    f"expansion proposal must contain at least one connection to selected expansion nodes {sorted(expansion_ids)}"
                )
            else:
                errors.append(
                    f"expansion proposal contains disconnected candidate nodes {unreachable_candidates} not connected to expansion nodes {sorted(expansion_ids)}"
                )

    if errors:
        raise GraphValidationError(errors)

    # 9. Allocate permanent IDs and construct combined graph
    candidate_to_node_id: dict[str, str] = {
        candidate.candidate_id: f"node_{uuid.uuid4().hex}"
        for candidate in proposal.candidate_nodes
    }

    new_nodes: list[Node] = []
    for candidate in proposal.candidate_nodes:
        prereq_ids = [
            prereq.node_id if prereq.kind == "existing_node" else candidate_to_node_id[prereq.candidate_id]  # type: ignore[index]
            for prereq in candidate.prerequisite_refs
        ]
        new_nodes.append(
            Node(
                node_id=candidate_to_node_id[candidate.candidate_id],
                node_type=candidate.node_type,
                title=candidate.title,
                description=candidate.description,
                duration_estimate_months=candidate.duration_estimate_months,
                cost_estimate=candidate.cost_estimate,
                cost_currency=candidate.cost_currency,
                milestone_ids=[],
                institution_ids=[],
                evidence_ids=[],
                prerequisite_node_ids=prereq_ids,
            )
        )

    new_edges: list[Edge] = []
    for edge in proposal.proposed_edges:
        source_id = (
            edge.source.node_id
            if edge.source.kind == "existing_node"
            else candidate_to_node_id[edge.source.candidate_id]  # type: ignore[index]
        )
        target_id = (
            edge.target.node_id
            if edge.target.kind == "existing_node"
            else candidate_to_node_id[edge.target.candidate_id]  # type: ignore[index]
        )
        new_edges.append(
            Edge(
                edge_id=f"edge_{uuid.uuid4().hex}",
                source_node_id=source_id,
                target_node_id=target_id,
                edge_type=edge.edge_type,
                condition=edge.condition,
            )
        )

    # Prerequisite consistency:
    # Ensure every declared prerequisite on candidate nodes is represented by a visible edge.
    # Avoid duplicate prerequisite edges if the proposal already declared the same relationship in proposed_edges.
    existing_prereq_pairs: set[tuple[str, str]] = set()
    if existing_graph is not None:
        for edge in existing_graph.edges:
            if edge.edge_type in DEPENDENCY_EDGE_TYPES:
                existing_prereq_pairs.add((edge.source_node_id, edge.target_node_id))
    for edge in new_edges:
        if edge.edge_type in DEPENDENCY_EDGE_TYPES:
            existing_prereq_pairs.add((edge.source_node_id, edge.target_node_id))

    for candidate in proposal.candidate_nodes:
        target_id = candidate_to_node_id[candidate.candidate_id]
        for prereq in candidate.prerequisite_refs:
            source_id = (
                prereq.node_id
                if prereq.kind == "existing_node"
                else candidate_to_node_id[prereq.candidate_id]
            )
            if (source_id, target_id) not in existing_prereq_pairs:
                new_edges.append(
                    Edge(
                        edge_id=f"edge_{uuid.uuid4().hex}",
                        source_node_id=source_id,
                        target_node_id=target_id,
                        edge_type="prerequisite",
                        condition=None,
                    )
                )
                existing_prereq_pairs.add((source_id, target_id))

    if existing_graph is None:
        combined = PathwayGraph(
            pathway_id=f"pathway_{uuid.uuid4().hex}",
            nodes=new_nodes,
            edges=new_edges,
            target_outcome=None,
            schema_version="1.0",
        )
    else:
        combined = PathwayGraph.model_validate(
            {
                **existing_graph.model_dump(),
                "nodes": [
                    *(n.model_dump() for n in existing_graph.nodes),
                    *(n.model_dump() for n in new_nodes),
                ],
                "edges": [
                    *(e.model_dump() for e in existing_graph.edges),
                    *(e.model_dump() for e in new_edges),
                ],
            }
        )

    return validate_graph(combined)