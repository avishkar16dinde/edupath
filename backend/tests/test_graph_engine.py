import sys
import unittest
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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
from graph_engine import (
    GraphValidationError,
    apply_candidate_proposal,
    update_graph,
    validate_graph,
)


def make_node(node_id: str, **values) -> Node:
    return Node(
        node_id=node_id,
        node_type="education",
        title=f"Stage {node_id}",
        description=f"Description for {node_id}",
        **values,
    )


def make_edge(
    edge_id: str,
    source: str,
    target: str,
    edge_type: str = "progression",
    condition: str | None = None,
) -> Edge:
    return Edge(
        edge_id=edge_id,
        source_node_id=source,
        target_node_id=target,
        edge_type=edge_type,
        condition=condition,
    )


def make_graph(nodes: list[Node], edges: list[Edge]) -> PathwayGraph:
    return PathwayGraph(pathway_id="pathway-1", nodes=nodes, edges=edges)


def make_profile_snapshot() -> dict:
    return {
        "country": "India",
        "curriculum": "CBSE",
        "academic_status": "currently_studying",
        "subjects": [],
        "overall_result_status": "unavailable",
        "interests": [],
        "strengths": [],
        "interest_description": "",
        "annual_budget": {"currency": "INR", "amount": None, "budget_status": "not_sure"},
        "funding_preferences": {
            "interested_in_scholarships": False,
            "willing_to_consider_loans": False,
        },
        "preferred_destination": "undecided",
        "priorities": [],
        "career_certainty": "exploring",
    }


def make_candidate(
    candidate_id: str,
    prerequisite_refs: list[NodeEndpointRef] | None = None,
    **values,
) -> CandidateNode:
    return CandidateNode(
        candidate_id=candidate_id,
        node_type="education",
        title=f"Stage {candidate_id}",
        description=f"Description for {candidate_id}",
        prerequisite_refs=prerequisite_refs or [],
        **values,
    )


def make_proposed_edge(
    edge_key: str,
    source: NodeEndpointRef,
    target: NodeEndpointRef,
    edge_type: str = "progression",
    condition: str | None = None,
) -> ProposedEdge:
    return ProposedEdge(
        edge_key=edge_key,
        source=source,
        target=target,
        edge_type=edge_type,
        condition=condition,
    )


def make_proposal(
    candidates: list[CandidateNode],
    edges: list[ProposedEdge] | None = None,
) -> CandidateProposal:
    return CandidateProposal(
        candidate_nodes=candidates,
        proposed_edges=edges or [],
    )


class GraphValidationTests(unittest.TestCase):
    def test_valid_linear_pathway(self):
        graph = make_graph(
            [make_node("start"), make_node("middle"), make_node("finish")],
            [make_edge("e1", "start", "middle"), make_edge("e2", "middle", "finish")],
        )

        self.assertIs(validate_graph(graph), graph)

    def test_valid_alternative_branches(self):
        graph = make_graph(
            [make_node("start"), make_node("option-a"), make_node("option-b"), make_node("goal")],
            [
                make_edge("e1", "start", "option-a"),
                make_edge("e2", "start", "option-b"),
                make_edge("e3", "option-a", "goal"),
                make_edge("e4", "option-b", "goal"),
            ],
        )

        self.assertIs(validate_graph(graph), graph)

    def test_ordinary_progression_cycles_are_allowed(self):
        graph = make_graph(
            [make_node("start"), make_node("option-a"), make_node("option-b")],
            [
                make_edge("e1", "start", "option-a"),
                make_edge("e2", "start", "option-b", "alternative"),
                make_edge("e3", "option-a", "option-b"),
                make_edge("e4", "option-b", "start", "alternative"),
            ],
        )

        self.assertIs(validate_graph(graph), graph)

    def test_duplicate_node_ids_are_rejected(self):
        graph = make_graph([make_node("same"), make_node("same")], [])

        with self.assertRaisesRegex(GraphValidationError, "duplicate node_id"):
            validate_graph(graph)

    def test_duplicate_edge_ids_are_rejected(self):
        graph = make_graph(
            [make_node("a"), make_node("b"), make_node("c")],
            [make_edge("same", "a", "b"), make_edge("same", "b", "c")],
        )

        with self.assertRaisesRegex(GraphValidationError, "duplicate edge_id"):
            validate_graph(graph)

    def test_missing_edge_endpoints_are_rejected(self):
        graph = make_graph([make_node("present")], [make_edge("bad", "missing", "present")])

        with self.assertRaisesRegex(GraphValidationError, "edge 'bad'.*missing source"):
            validate_graph(graph)

    def test_self_loop_is_rejected(self):
        graph = make_graph([make_node("loop")], [make_edge("bad", "loop", "loop")])

        with self.assertRaisesRegex(GraphValidationError, "self-loop"):
            validate_graph(graph)

    def test_cyclic_dependencies_are_rejected(self):
        graph = make_graph(
            [make_node("a"), make_node("b")],
            [make_edge("e1", "a", "b", "dependency"), make_edge("e2", "b", "a", "prerequisite")],
        )

        with self.assertRaisesRegex(GraphValidationError, "dependency cycle"):
            validate_graph(graph)

    def test_missing_prerequisite_is_rejected(self):
        graph = make_graph([make_node("advanced", prerequisite_node_ids=["missing"])], [])

        with self.assertRaisesRegex(GraphValidationError, "node 'advanced'.*missing prerequisite"):
            validate_graph(graph)

    def test_negative_duration_and_cost_are_rejected(self):
        for values in (
            {"duration_estimate_months": -1},
            {"cost_estimate": -1, "cost_currency": "USD"},
        ):
            with self.subTest(values=values), self.assertRaises(ValidationError):
                make_node("invalid", **values)

    def test_non_finite_duration_and_cost_are_rejected(self):
        for field in ("duration_estimate_months", "cost_estimate"):
            for value in (float("nan"), float("inf"), float("-inf")):
                values = {field: value}
                if field == "cost_estimate":
                    values["cost_currency"] = "USD"
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    make_node("invalid", **values)

    def test_graph_node_and_edge_count_limits(self):
        maximum_nodes = make_graph(
            [make_node(f"node-{index}") for index in range(MAX_GRAPH_NODES)],
            [],
        )
        self.assertIs(validate_graph(maximum_nodes), maximum_nodes)

        with self.assertRaises(ValidationError):
            make_graph([make_node(f"node-{index}") for index in range(MAX_GRAPH_NODES + 1)], [])

        endpoints = [make_node("source"), make_node("target")]
        maximum_edges = make_graph(
            endpoints,
            [make_edge(f"edge-{index}", "source", "target") for index in range(MAX_GRAPH_EDGES)],
        )
        self.assertIs(validate_graph(maximum_edges), maximum_edges)

        with self.assertRaises(ValidationError):
            make_graph(
                endpoints,
                [make_edge(f"edge-{index}", "source", "target") for index in range(MAX_GRAPH_EDGES + 1)],
            )

    def test_candidate_batch_size_is_bounded(self):
        existing = make_graph([make_node("start")], [])
        maximum_batch = [make_node(f"candidate-{index}") for index in range(MAX_CANDIDATE_NODES)]
        updated = update_graph(existing, maximum_batch, [])
        self.assertEqual(len(updated.nodes), MAX_CANDIDATE_NODES + 1)

        candidates = [make_node(f"candidate-{index}") for index in range(MAX_CANDIDATE_NODES + 1)]

        with self.assertRaisesRegex(GraphValidationError, "candidate-node batch limit"):
            update_graph(existing, candidates, [])

    def test_proposed_edge_batch_size_is_bounded(self):
        existing = make_graph([make_node("source"), make_node("target")], [])
        maximum_batch = [
            make_edge(f"edge-{index}", "source", "target")
            for index in range(MAX_PROPOSED_EDGES)
        ]
        updated = update_graph(existing, [], maximum_batch)
        self.assertEqual(len(updated.edges), MAX_PROPOSED_EDGES)

        oversized_batch = [
            make_edge(f"edge-{index}", "source", "target")
            for index in range(MAX_PROPOSED_EDGES + 1)
        ]
        with self.assertRaisesRegex(GraphValidationError, "proposed-edge batch limit"):
            update_graph(existing, [], oversized_batch)

    def test_generation_request_accepts_initial_generation(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )

        self.assertIsNone(request.current_graph)

    def test_generation_request_validates_current_graph(self):
        invalid_graph = make_graph([make_node("duplicate"), make_node("duplicate")], [])

        with self.assertRaisesRegex(ValidationError, "duplicate node_id"):
            GraphGenerationRequest(
                student_profile_snapshot=make_profile_snapshot(),
                current_graph=invalid_graph,
                candidate_node_count=1,
                generation_intent="continue",
            )

    def test_generation_request_accepts_valid_expansion(self):
        graph = make_graph([make_node("start")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=graph,
            current_node_ids_to_expand=["start"],
            candidate_node_count=1,
            generation_intent="recover_from_blocked_route",
        )

        self.assertEqual(request.current_node_ids_to_expand, ["start"])

    def test_valid_incremental_update_isolates_node_and_edge_objects(self):
        existing = make_graph(
            [make_node("start"), make_node("middle")],
            [make_edge("existing-edge", "start", "middle", edge_type="conditional", condition="original")],
        )

        updated = update_graph(
            existing,
            [make_node("next")],
            [make_edge("new-edge", "middle", "next")],
        )

        self.assertEqual([node.node_id for node in updated.nodes], ["start", "middle", "next"])
        self.assertEqual(len(updated.edges), 2)
        self.assertIsNot(updated, existing)
        self.assertIsNot(updated.nodes[0], existing.nodes[0])
        self.assertIsNot(updated.edges[0], existing.edges[0])

        updated.nodes[0].title = "Changed returned node"
        updated.edges[0].condition = "changed returned edge"
        self.assertEqual(existing.nodes[0].title, "Stage start")
        self.assertEqual(existing.edges[0].condition, "original")

    def test_invalid_update_is_atomic(self):
        existing = make_graph([make_node("start")], [])
        original_snapshot = existing.model_dump()

        with self.assertRaises(GraphValidationError):
            update_graph(existing, [make_node("next")], [make_edge("bad", "start", "missing")])

        self.assertEqual(existing.model_dump(), original_snapshot)

    def test_update_rejects_conflicting_node_ids(self):
        existing = make_graph([make_node("start")], [])
        original_snapshot = existing.model_dump()

        with self.assertRaisesRegex(GraphValidationError, "duplicate node_id"):
            update_graph(existing, [make_node("start")], [])

        self.assertEqual(existing.model_dump(), original_snapshot)

    def test_update_rejects_conflicting_edge_ids(self):
        existing = make_graph(
            [make_node("start"), make_node("finish")],
            [make_edge("shared-edge", "start", "finish")],
        )
        original_snapshot = existing.model_dump()

        with self.assertRaisesRegex(GraphValidationError, "duplicate edge_id"):
            update_graph(
                existing,
                [],
                [make_edge("shared-edge", "start", "finish")],
            )

        self.assertEqual(existing.model_dump(), original_snapshot)


class CandidateProposalIngestionTests(unittest.TestCase):
    def test_initial_generation_allocates_uuid_ids_and_resolves_references(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("cand-1")
        c2 = make_candidate("cand-2", prerequisite_refs=[NodeEndpointRef.candidate("cand-1")])
        edge = make_proposed_edge(
            "e1",
            source=NodeEndpointRef.candidate("cand-1"),
            target=NodeEndpointRef.candidate("cand-2"),
            edge_type="prerequisite",
        )
        proposal = make_proposal([c1, c2], [edge])

        result = apply_candidate_proposal(request, proposal)

        self.assertEqual(len(result.nodes), 2)
        self.assertEqual(len(result.edges), 1)

        # Node IDs must be newly generated and not the temporary keys
        node_ids = {node.node_id for node in result.nodes}
        self.assertEqual(len(node_ids), 2)
        self.assertNotIn("cand-1", node_ids)
        self.assertNotIn("cand-2", node_ids)

        nodes_by_title = {node.title: node for node in result.nodes}
        c1_node = nodes_by_title["Stage cand-1"]
        c2_node = nodes_by_title["Stage cand-2"]

        # Prerequisite reference must be mapped to c1's permanent node_id
        self.assertEqual(c2_node.prerequisite_node_ids, [c1_node.node_id])

        # Edge endpoints must match permanent node IDs
        result_edge = result.edges[0]
        self.assertNotEqual(result_edge.edge_id, "e1")
        self.assertEqual(result_edge.source_node_id, c1_node.node_id)
        self.assertEqual(result_edge.target_node_id, c2_node.node_id)

    def test_exact_candidate_count_is_enforced(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )

        with self.subTest("too few candidates"):
            proposal_too_few = make_proposal([make_candidate("cand-1")])
            with self.assertRaisesRegex(GraphValidationError, "expected exactly 2"):
                apply_candidate_proposal(request, proposal_too_few)

        with self.subTest("too many candidates"):
            proposal_too_many = make_proposal(
                [make_candidate("c1"), make_candidate("c2"), make_candidate("c3")]
            )
            with self.assertRaisesRegex(GraphValidationError, "expected exactly 2"):
                apply_candidate_proposal(request, proposal_too_many)

    def test_expansion_with_multi_step_branch_succeeds(self):
        existing = make_graph([make_node("start")], [])
        original_snapshot = existing.model_dump()

        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=2,
            generation_intent="continue",
        )

        c1 = make_candidate("cand-1")
        c2 = make_candidate("cand-2")
        e1 = make_proposed_edge(
            "edge-1",
            source=NodeEndpointRef.existing("start"),
            target=NodeEndpointRef.candidate("cand-1"),
        )
        e2 = make_proposed_edge(
            "edge-2",
            source=NodeEndpointRef.candidate("cand-1"),
            target=NodeEndpointRef.candidate("cand-2"),
        )
        proposal = make_proposal([c1, c2], [e1, e2])

        result = apply_candidate_proposal(request, proposal)

        # Existing graph is untouched
        self.assertEqual(existing.model_dump(), original_snapshot)
        self.assertEqual(len(result.nodes), 3)
        self.assertEqual(len(result.edges), 2)

        # Start node remains in graph with original ID
        start_nodes = [node for node in result.nodes if node.node_id == "start"]
        self.assertEqual(len(start_nodes), 1)

        nodes_by_title = {node.title: node for node in result.nodes}
        c1_node = nodes_by_title["Stage cand-1"]
        c2_node = nodes_by_title["Stage cand-2"]

        edges_by_source = {edge.source_node_id: edge for edge in result.edges}
        self.assertEqual(edges_by_source["start"].target_node_id, c1_node.node_id)
        self.assertEqual(edges_by_source[c1_node.node_id].target_node_id, c2_node.node_id)

    def test_expansion_with_prerequisite_connection_succeeds(self):
        existing = make_graph([make_node("foundation")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["foundation"],
            candidate_node_count=1,
            generation_intent="continue",
        )
        c1 = make_candidate("next", prerequisite_refs=[NodeEndpointRef.existing("foundation")])
        result = apply_candidate_proposal(request, make_proposal([c1]))

        self.assertEqual(len(result.nodes), 2)
        new_node = [n for n in result.nodes if n.node_id != "foundation"][0]
        self.assertEqual(new_node.prerequisite_node_ids, ["foundation"])
        self.assertEqual(len(result.edges), 1)
        self.assertEqual(result.edges[0].edge_type, "prerequisite")
        self.assertEqual(result.edges[0].source_node_id, "foundation")
        self.assertEqual(result.edges[0].target_node_id, new_node.node_id)

    def test_expansion_requires_at_least_one_connection_to_expansion_nodes(self):
        existing = make_graph([make_node("start"), make_node("other")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        # Connects to 'other', not 'start'
        proposal = make_proposal(
            [make_candidate("c1"), make_candidate("c2")],
            [
                make_proposed_edge(
                    "e1",
                    source=NodeEndpointRef.existing("other"),
                    target=NodeEndpointRef.candidate("c1"),
                ),
                make_proposed_edge(
                    "e2",
                    source=NodeEndpointRef.candidate("c1"),
                    target=NodeEndpointRef.candidate("c2"),
                ),
            ],
        )

        with self.assertRaisesRegex(GraphValidationError, "at least one connection to selected expansion nodes"):
            apply_candidate_proposal(request, proposal)

    def test_expansion_request_requires_non_empty_expansion_node_ids(self):
        existing = make_graph([make_node("start")], [])
        with self.assertRaisesRegex(ValidationError, "current_node_ids_to_expand must contain at least one node ID"):
            GraphGenerationRequest(
                student_profile_snapshot=make_profile_snapshot(),
                current_graph=existing,
                current_node_ids_to_expand=[],
                candidate_node_count=1,
                generation_intent="continue",
            )

    def test_rejects_duplicate_candidate_id(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        proposal = make_proposal([make_candidate("duplicate"), make_candidate("duplicate")])
        with self.assertRaisesRegex(GraphValidationError, "duplicate candidate_id"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_duplicate_edge_key(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        proposal = make_proposal(
            [c1, c2],
            [
                make_proposed_edge("same-key", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("c2")),
                make_proposed_edge("same-key", NodeEndpointRef.candidate("c2"), NodeEndpointRef.candidate("c1")),
            ],
        )
        with self.assertRaisesRegex(GraphValidationError, "duplicate edge_key"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_unresolved_candidate_reference(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )
        proposal = make_proposal(
            [make_candidate("c1")],
            [make_proposed_edge("e1", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("missing"))],
        )
        with self.assertRaisesRegex(GraphValidationError, "missing candidate target"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_unresolved_existing_reference(self):
        existing = make_graph([make_node("start")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=1,
            generation_intent="continue",
        )
        proposal = make_proposal(
            [make_candidate("c1")],
            [
                make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("c1")),
                make_proposed_edge("e2", NodeEndpointRef.candidate("c1"), NodeEndpointRef.existing("nonexistent")),
            ],
        )
        with self.assertRaisesRegex(GraphValidationError, "missing existing target node"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_existing_node_ref_in_initial_generation(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )
        proposal = make_proposal(
            [make_candidate("c1")],
            [make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("c1"))],
        )
        with self.assertRaisesRegex(GraphValidationError, "in an initial generation request"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_candidate_id_colliding_with_existing_node_id(self):
        existing = make_graph([make_node("start")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=1,
            generation_intent="continue",
        )
        proposal = make_proposal(
            [make_candidate("start")],
            [make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("start"))],
        )
        with self.assertRaisesRegex(GraphValidationError, "collides with existing graph node_id"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_self_loop_edge(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )
        proposal = make_proposal(
            [make_candidate("c1")],
            [make_proposed_edge("loop", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("c1"))],
        )
        with self.assertRaisesRegex(GraphValidationError, "self-loop"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_self_prerequisite(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )
        proposal = make_proposal(
            [make_candidate("c1", prerequisite_refs=[NodeEndpointRef.candidate("c1")])]
        )
        with self.assertRaisesRegex(GraphValidationError, "cannot have itself as a prerequisite"):
            apply_candidate_proposal(request, proposal)

    def test_rejects_unverified_metadata_ids(self):
        for field in ("milestone_ids", "institution_ids", "evidence_ids"):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                make_candidate("cand-1", **{field: ["unverified_id"]})

    def test_detects_dependency_cycle_in_proposal(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1", prerequisite_refs=[NodeEndpointRef.candidate("c2")])
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.candidate("c1")])
        proposal = make_proposal([c1, c2])

        with self.assertRaisesRegex(GraphValidationError, "dependency cycle detected"):
            apply_candidate_proposal(request, proposal)

    def test_allows_progression_cycles_in_proposal(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        edges = [
            make_proposed_edge("e1", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("c2"), "progression"),
            make_proposed_edge("e2", NodeEndpointRef.candidate("c2"), NodeEndpointRef.candidate("c1"), "alternative"),
        ]
        proposal = make_proposal([c1, c2], edges)
        result = apply_candidate_proposal(request, proposal)
        self.assertEqual(len(result.nodes), 2)
        self.assertEqual(len(result.edges), 2)

    def test_atomic_failure_preserves_existing_graph(self):
        existing = make_graph([make_node("start")], [])
        original_snapshot = existing.model_dump()

        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=2,
            generation_intent="continue",
        )
        # Valid c1, but c2 forms a dependency cycle back to start
        c1 = make_candidate("c1")
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.existing("start")])
        edges = [
            make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("c1")),
            make_proposed_edge("e2", NodeEndpointRef.candidate("c2"), NodeEndpointRef.existing("start"), edge_type="dependency"),
        ]
        proposal = make_proposal([c1, c2], edges)

        with self.assertRaises(GraphValidationError):
            apply_candidate_proposal(request, proposal)

        # Entire proposal is rejected and existing graph is 100% untouched
        self.assertEqual(existing.model_dump(), original_snapshot)


class ConditionalEdgeValidationTests(unittest.TestCase):
    def test_valid_permanent_conditional_edge(self):
        edge = Edge(
            edge_id="e1",
            source_node_id="src",
            target_node_id="tgt",
            edge_type="conditional",
            condition="Min 75% marks",
        )
        self.assertEqual(edge.condition, "Min 75% marks")

        edge_caps = Edge(
            edge_id="e2",
            source_node_id="src",
            target_node_id="tgt",
            edge_type="CONDITIONAL",
            condition="Valid condition",
        )
        self.assertEqual(edge_caps.condition, "Valid condition")

    def test_permanent_conditional_edge_missing_condition_rejected(self):
        with self.assertRaisesRegex(ValidationError, "condition must be a non-empty string"):
            Edge(
                edge_id="e1",
                source_node_id="src",
                target_node_id="tgt",
                edge_type="conditional",
                condition=None,
            )

    def test_permanent_conditional_edge_empty_or_whitespace_condition_rejected(self):
        for empty_val in ("", "   ", "\t\n"):
            with self.subTest(empty_val=empty_val), self.assertRaisesRegex(
                ValidationError, "condition must be a non-empty string"
            ):
                Edge(
                    edge_id="e1",
                    source_node_id="src",
                    target_node_id="tgt",
                    edge_type="conditional",
                    condition=empty_val,
                )

    def test_permanent_non_conditional_edge_with_condition_rejected(self):
        for non_cond_type in ("progression", "alternative", "dependency", "prerequisite"):
            with self.subTest(edge_type=non_cond_type), self.assertRaisesRegex(
                ValidationError, "condition is only allowed when edge_type is 'conditional'"
            ):
                Edge(
                    edge_id="e1",
                    source_node_id="src",
                    target_node_id="tgt",
                    edge_type=non_cond_type,
                    condition="Some condition",
                )

    def test_valid_proposed_conditional_edge(self):
        edge = ProposedEdge(
            edge_key="ek1",
            source=NodeEndpointRef.candidate("c1"),
            target=NodeEndpointRef.candidate("c2"),
            edge_type="conditional",
            condition="Must pass entrance test",
        )
        self.assertEqual(edge.condition, "Must pass entrance test")

        edge_caps = ProposedEdge(
            edge_key="ek2",
            source=NodeEndpointRef.candidate("c1"),
            target=NodeEndpointRef.candidate("c2"),
            edge_type="Conditional",
            condition="Must pass entrance test",
        )
        self.assertEqual(edge_caps.condition, "Must pass entrance test")

    def test_proposed_conditional_edge_missing_condition_rejected(self):
        with self.assertRaisesRegex(ValidationError, "condition must be a non-empty string"):
            ProposedEdge(
                edge_key="ek1",
                source=NodeEndpointRef.candidate("c1"),
                target=NodeEndpointRef.candidate("c2"),
                edge_type="conditional",
                condition=None,
            )

    def test_proposed_conditional_edge_empty_or_whitespace_condition_rejected(self):
        for empty_val in ("", "   ", "\t\n"):
            with self.subTest(empty_val=empty_val), self.assertRaisesRegex(
                ValidationError, "condition must be a non-empty string"
            ):
                ProposedEdge(
                    edge_key="ek1",
                    source=NodeEndpointRef.candidate("c1"),
                    target=NodeEndpointRef.candidate("c2"),
                    edge_type="conditional",
                    condition=empty_val,
                )

    def test_proposed_non_conditional_edge_with_condition_rejected(self):
        for non_cond_type in ("progression", "alternative", "dependency", "prerequisite"):
            with self.subTest(edge_type=non_cond_type), self.assertRaisesRegex(
                ValidationError, "condition is only allowed when edge_type is 'conditional'"
            ):
                ProposedEdge(
                    edge_key="ek1",
                    source=NodeEndpointRef.candidate("c1"),
                    target=NodeEndpointRef.candidate("c2"),
                    edge_type=non_cond_type,
                    condition="Some condition",
                )

    def test_apply_candidate_proposal_with_valid_conditional_edge(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        edge = make_proposed_edge(
            "e1",
            NodeEndpointRef.candidate("c1"),
            NodeEndpointRef.candidate("c2"),
            edge_type="conditional",
            condition="Must achieve 80% in mathematics",
        )
        proposal = make_proposal([c1, c2], [edge])
        result = apply_candidate_proposal(request, proposal)
        self.assertEqual(len(result.edges), 1)
        self.assertEqual(result.edges[0].edge_type, "conditional")
        self.assertEqual(result.edges[0].condition, "Must achieve 80% in mathematics")


class ControlledVocabularyTests(unittest.TestCase):
    def test_node_types_accept_canonical_and_case_insensitive_normalized(self):
        for raw, expected in (
            ("education", "education"),
            ("Education", "education"),
            ("CAREER", "career"),
            ("Exploration", "exploration"),
            ("certification", "certification"),
            ("  CERTIFICATION  ", "certification"),
        ):
            with self.subTest(raw=raw):
                node = Node(
                    node_id="n1",
                    node_type=raw,
                    title="Title",
                    description="Desc",
                )
                self.assertEqual(node.node_type, expected)

                cand = CandidateNode(
                    candidate_id="c1",
                    node_type=raw,
                    title="Title",
                    description="Desc",
                )
                self.assertEqual(cand.node_type, expected)

    def test_node_types_reject_invalid(self):
        for invalid_type in ("school", "job", "custom", "unknown", "", "   "):
            with self.subTest(invalid_type=invalid_type):
                with self.assertRaises(ValidationError):
                    Node(
                        node_id="n1",
                        node_type=invalid_type,
                        title="Title",
                        description="Desc",
                    )
                with self.assertRaises(ValidationError):
                    CandidateNode(
                        candidate_id="c1",
                        node_type=invalid_type,
                        title="Title",
                        description="Desc",
                    )

    def test_edge_types_accept_canonical_and_case_insensitive_normalized(self):
        for raw, expected in (
            ("progression", "progression"),
            ("Progression", "progression"),
            ("ALTERNATIVE", "alternative"),
            ("Dependency", "dependency"),
            ("PREREQUISITE", "prerequisite"),
            ("  conditional  ", "conditional"),
        ):
            with self.subTest(raw=raw):
                cond = "Pass exam" if expected == "conditional" else None
                edge = Edge(
                    edge_id="e1",
                    source_node_id="src",
                    target_node_id="tgt",
                    edge_type=raw,
                    condition=cond,
                )
                self.assertEqual(edge.edge_type, expected)

                prop_edge = ProposedEdge(
                    edge_key="ek1",
                    source=NodeEndpointRef.candidate("c1"),
                    target=NodeEndpointRef.candidate("c2"),
                    edge_type=raw,
                    condition=cond,
                )
                self.assertEqual(prop_edge.edge_type, expected)

    def test_edge_types_reject_invalid_preventing_cycle_bypass(self):
        for invalid_type in ("requires", "depends_on", "needs", "prereq", "custom", "unknown", ""):
            with self.subTest(invalid_type=invalid_type):
                with self.assertRaises(ValidationError):
                    Edge(
                        edge_id="e1",
                        source_node_id="src",
                        target_node_id="tgt",
                        edge_type=invalid_type,
                    )
                with self.assertRaises(ValidationError):
                    ProposedEdge(
                        edge_key="ek1",
                        source=NodeEndpointRef.candidate("c1"),
                        target=NodeEndpointRef.candidate("c2"),
                        edge_type=invalid_type,
                    )


class PrerequisiteConsistencyTests(unittest.TestCase):
    def test_prerequisite_without_explicit_edge_materializes_prerequisite_edge(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.candidate("c1")])
        proposal = make_proposal([c1, c2], edges=[])

        result = apply_candidate_proposal(request, proposal)

        self.assertEqual(len(result.nodes), 2)
        # Exactly one visible prerequisite edge must be synthesized
        self.assertEqual(len(result.edges), 1)
        prereq_edge = result.edges[0]
        self.assertEqual(prereq_edge.edge_type, "prerequisite")

        nodes_by_title = {n.title: n for n in result.nodes}
        c1_node = nodes_by_title["Stage c1"]
        c2_node = nodes_by_title["Stage c2"]
        self.assertEqual(prereq_edge.source_node_id, c1_node.node_id)
        self.assertEqual(prereq_edge.target_node_id, c2_node.node_id)
        self.assertEqual(c2_node.prerequisite_node_ids, [c1_node.node_id])

    def test_duplicate_prerequisite_declaration_avoids_duplicate_edge(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.candidate("c1")])
        explicit_edge = make_proposed_edge(
            "explicit-prereq",
            source=NodeEndpointRef.candidate("c1"),
            target=NodeEndpointRef.candidate("c2"),
            edge_type="prerequisite",
        )
        proposal = make_proposal([c1, c2], edges=[explicit_edge])

        result = apply_candidate_proposal(request, proposal)

        # Must NOT create a second duplicate edge
        self.assertEqual(len(result.edges), 1)
        self.assertEqual(result.edges[0].edge_type, "prerequisite")
        nodes_by_title = {n.title: n for n in result.nodes}
        self.assertEqual(result.edges[0].source_node_id, nodes_by_title["Stage c1"].node_id)
        self.assertEqual(result.edges[0].target_node_id, nodes_by_title["Stage c2"].node_id)

    def test_expansion_prerequisite_without_explicit_edge_materializes_edge(self):
        existing = make_graph([make_node("foundation")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["foundation"],
            candidate_node_count=1,
            generation_intent="continue",
        )
        c1 = make_candidate("advanced", prerequisite_refs=[NodeEndpointRef.existing("foundation")])
        proposal = make_proposal([c1], edges=[])

        result = apply_candidate_proposal(request, proposal)

        self.assertEqual(len(result.nodes), 2)
        self.assertEqual(len(result.edges), 1)
        self.assertEqual(result.edges[0].edge_type, "prerequisite")
        self.assertEqual(result.edges[0].source_node_id, "foundation")
        advanced_node = [n for n in result.nodes if n.node_id != "foundation"][0]
        self.assertEqual(result.edges[0].target_node_id, advanced_node.node_id)
        self.assertEqual(advanced_node.prerequisite_node_ids, ["foundation"])

    def test_dependency_cycle_from_synthesized_prerequisite_edges_rejected(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1", prerequisite_refs=[NodeEndpointRef.candidate("c2")])
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.candidate("c1")])
        proposal = make_proposal([c1, c2], edges=[])

        with self.assertRaisesRegex(GraphValidationError, "dependency cycle detected"):
            apply_candidate_proposal(request, proposal)


class ExpansionConnectivityAndIslandValidationTests(unittest.TestCase):
    def test_existing_to_existing_edges_cannot_satisfy_candidate_connectivity(self):
        existing = make_graph([make_node("start"), make_node("other")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=1,
            generation_intent="continue",
        )
        c1 = make_candidate("cand-1")
        # Proposed edge is between two existing nodes; cand-1 is disconnected
        e1 = make_proposed_edge(
            "e1",
            source=NodeEndpointRef.existing("start"),
            target=NodeEndpointRef.existing("other"),
        )
        proposal = make_proposal([c1], [e1])

        with self.assertRaisesRegex(
            GraphValidationError, "at least one connection to selected expansion nodes"
        ):
            apply_candidate_proposal(request, proposal)

    def test_disconnected_candidate_island_is_rejected(self):
        existing = make_graph([make_node("start")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=3,
            generation_intent="explore_alternatives",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        c3 = make_candidate("c3")
        # c1 connects to start, but c2 and c3 form an isolated island
        e1 = make_proposed_edge(
            "e1",
            source=NodeEndpointRef.existing("start"),
            target=NodeEndpointRef.candidate("c1"),
        )
        e2 = make_proposed_edge(
            "e2",
            source=NodeEndpointRef.candidate("c2"),
            target=NodeEndpointRef.candidate("c3"),
        )
        proposal = make_proposal([c1, c2, c3], [e1, e2])

        with self.assertRaisesRegex(
            GraphValidationError, "disconnected candidate nodes \\['c2', 'c3'\\] not connected to expansion nodes"
        ):
            apply_candidate_proposal(request, proposal)

    def test_valid_multi_hop_expansion_accepted(self):
        existing = make_graph([make_node("start")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=3,
            generation_intent="continue",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        c3 = make_candidate("c3")
        edges = [
            make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("c1")),
            make_proposed_edge("e2", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("c2")),
            make_proposed_edge("e3", NodeEndpointRef.candidate("c2"), NodeEndpointRef.candidate("c3")),
        ]
        proposal = make_proposal([c1, c2, c3], edges)
        result = apply_candidate_proposal(request, proposal)

        self.assertEqual(len(result.nodes), 4)
        self.assertEqual(len(result.edges), 3)

    def test_multiple_requested_expansion_targets_supported(self):
        existing = make_graph([make_node("anchor1"), make_node("anchor2")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["anchor1", "anchor2"],
            candidate_node_count=3,
            generation_intent="continue",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        c3 = make_candidate("c3")
        edges = [
            make_proposed_edge("e1", NodeEndpointRef.existing("anchor1"), NodeEndpointRef.candidate("c1")),
            make_proposed_edge("e2", NodeEndpointRef.candidate("c1"), NodeEndpointRef.candidate("c2")),
            make_proposed_edge("e3", NodeEndpointRef.existing("anchor2"), NodeEndpointRef.candidate("c3")),
        ]
        proposal = make_proposal([c1, c2, c3], edges)
        result = apply_candidate_proposal(request, proposal)

        self.assertEqual(len(result.nodes), 5)
        self.assertEqual(len(result.edges), 3)

    def test_candidates_connected_via_prerequisite_refs_accepted(self):
        existing = make_graph([make_node("foundation")], [])
        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["foundation"],
            candidate_node_count=2,
            generation_intent="continue",
        )
        c1 = make_candidate("c1", prerequisite_refs=[NodeEndpointRef.existing("foundation")])
        c2 = make_candidate("c2", prerequisite_refs=[NodeEndpointRef.candidate("c1")])
        proposal = make_proposal([c1, c2], edges=[])

        result = apply_candidate_proposal(request, proposal)
        self.assertEqual(len(result.nodes), 3)
        self.assertEqual(len(result.edges), 2)
        for edge in result.edges:
            self.assertEqual(edge.edge_type, "prerequisite")

    def test_failed_candidate_island_validation_preserves_existing_graph(self):
        existing = make_graph(
            [make_node("start"), make_node("other")],
            [make_edge("e-orig", "start", "other")],
        )
        original_snapshot = existing.model_dump()

        request = GraphGenerationRequest(
            student_profile_snapshot=make_profile_snapshot(),
            current_graph=existing,
            current_node_ids_to_expand=["start"],
            candidate_node_count=2,
            generation_intent="continue",
        )
        c1 = make_candidate("c1")
        c2 = make_candidate("c2")
        # c1 connects to start, but c2 is isolated
        e1 = make_proposed_edge("e1", NodeEndpointRef.existing("start"), NodeEndpointRef.candidate("c1"))
        proposal = make_proposal([c1, c2], [e1])

        with self.assertRaises(GraphValidationError):
            apply_candidate_proposal(request, proposal)

        # Existing graph remains untouched
        self.assertEqual(existing.model_dump(), original_snapshot)

    def test_distinct_parallel_edges_with_different_conditions_or_types_allowed(self):
        existing = make_graph([make_node("src"), make_node("tgt")], [])
        # Add two parallel edges between src and tgt with different types and conditions
        e1 = make_edge("e1", "src", "tgt", edge_type="progression")
        e2 = make_edge("e2", "src", "tgt", edge_type="conditional", condition="Requires merit rank < 1000")
        graph = make_graph(existing.nodes, [e1, e2])

        validated = validate_graph(graph)
        self.assertEqual(len(validated.edges), 2)
        self.assertEqual(validated.edges[0].edge_type, "progression")
        self.assertEqual(validated.edges[1].edge_type, "conditional")
        self.assertEqual(validated.edges[1].condition, "Requires merit rank < 1000")


if __name__ == "__main__":
    unittest.main()