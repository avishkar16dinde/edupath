import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

# Match the import convention used by the existing backend tests.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from test_generator_service import make_test_profile
from domain_schemas import (
    GraphGenerationRequest,
    CandidateProposal,
    CandidateNode,
    ProposedEdge,
    NodeEndpointRef,
    PathwayGraph,
    Node,
)
from graph_engine import apply_candidate_proposal


# 1. Invalid generation intent validation
def test_invalid_generation_intent_raises_validation_error():
    with pytest.raises(ValidationError) as exc_info:
        GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="unsupported_intent",
        )
    assert "generation_intent" in str(exc_info.value)


# 2. Dependency-edge preservation across proposal application
def test_dependency_edge_preserved_when_applying_proposal():
    request = GraphGenerationRequest(
        student_profile_snapshot=make_test_profile(),
        candidate_node_count=2,
        generation_intent="continue",
    )

    candidate_a = CandidateNode(
        candidate_id="cand_a",
        node_type="education",
        title="Node A",
        description="A",
    )
    candidate_b = CandidateNode(
        candidate_id="cand_b",
        node_type="education",
        title="Node B",
        description="B",
    )
    edge = ProposedEdge(
        edge_key="dep_ab",
        source=NodeEndpointRef.candidate("cand_a"),
        target=NodeEndpointRef.candidate("cand_b"),
        edge_type="dependency",
    )
    proposal = CandidateProposal(
        candidate_nodes=[candidate_a, candidate_b],
        proposed_edges=[edge],
    )

    result_graph = apply_candidate_proposal(request, proposal)

    dep_edges = [e for e in result_graph.edges if e.edge_type == "dependency"]
    assert len(dep_edges) == 1
    node_ids = {n.node_id for n in result_graph.nodes}
    assert dep_edges[0].source_node_id in node_ids
    assert dep_edges[0].target_node_id in node_ids


# 3. Metadata preservation across sequential expansions
def test_metadata_preserved_across_expansion():
    existing_node = Node(
        node_id="node_1",
        node_type="education",
        title="Existing Node",
        description="Existing",
        milestone_ids=["m1"],
        institution_ids=["i1"],
        evidence_ids=["e1"],
    )
    existing_graph = PathwayGraph(
        pathway_id="test_pathway",
        nodes=[existing_node],
        edges=[],
        target_outcome="Become Engineer",
        schema_version="1.0",
    )

    request = GraphGenerationRequest(
        student_profile_snapshot=make_test_profile(),
        current_graph=existing_graph,
        current_node_ids_to_expand=["node_1"],
        candidate_node_count=1,
        generation_intent="continue",
    )

    candidate = CandidateNode(
        candidate_id="cand_new",
        node_type="education",
        title="New Node",
        description="New",
        prerequisite_refs=[NodeEndpointRef.existing("node_1")],
    )
    edge = ProposedEdge(
        edge_key="edge_new",
        source=NodeEndpointRef.existing("node_1"),
        target=NodeEndpointRef.candidate("cand_new"),
        edge_type="progression",
    )
    proposal = CandidateProposal(
        candidate_nodes=[candidate],
        proposed_edges=[edge],
    )

    result_graph = apply_candidate_proposal(request, proposal)

    assert result_graph.pathway_id == existing_graph.pathway_id
    assert result_graph.target_outcome == existing_graph.target_outcome
    assert result_graph.schema_version == existing_graph.schema_version

    original = next(n for n in result_graph.nodes if n.node_id == "node_1")
    assert original.milestone_ids == ["m1"]
    assert original.institution_ids == ["i1"]
    assert original.evidence_ids == ["e1"]


# 4. Whitespace-only conditional edge should be rejected by schema validation.
def test_whitespace_only_conditional_edge_is_invalid():
    with pytest.raises(
        ValidationError,
        match="condition must be a non-empty string",
    ):
        ProposedEdge(
            edge_key="cond_ws",
            source=NodeEndpointRef.candidate("cand_source"),
            target=NodeEndpointRef.candidate("cand_target"),
            edge_type="conditional",
            condition="   ",
        )
