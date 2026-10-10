import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from graph_engine import GraphValidationError, apply_candidate_proposal
from generator_service import generate_pathway_graph
from domain_schemas import GraphGenerationRequest
from test_generator_service import make_test_profile, make_mock_groq_client

class InvalidGenerationIntentTest(unittest.TestCase):
    def test_unsupported_intent_is_rejected(self):
        """Pydantic should reject a generation_intent not in the allowed Literal set."""
        bad_request = {
            "student_profile_snapshot": make_test_profile(),
            "candidate_node_count": 1,
            "generation_intent": "invalid_intent",
        }
        # generate_pathway_graph validates the request before any LLM call.
        with self.assertRaises(GraphValidationError) as ctx:
            generate_pathway_graph(bad_request, client=MagicMock())
        self.assertIn("invalid graph generation request", str(ctx.exception))


class DependencyEdgePreservationTest(unittest.TestCase):
    def test_dependency_edge_type_is_kept(self):
        """A proposal with a dependency edge should retain that edge_type after ingestion."""
        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_A",
                    "node_type": "education",
                    "title": "Stage A",
                    "description": "Desc A",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_B",
                    "node_type": "career",
                    "title": "Stage B",
                    "description": "Desc B",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_dep",
                    "source": {"kind": "candidate", "candidate_id": "cand_A"},
                    "target": {"kind": "candidate", "candidate_id": "cand_B"},
                    "edge_type": "dependency",
                    "condition": None,
                }
            ],
        }
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        result = apply_candidate_proposal(request, proposal)
        self.assertEqual(len(result.edges), 1)
        self.assertEqual(result.edges[0].edge_type, "dependency")


        # ---- Initial generation ---------------------------------------------------
        init_proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_1",
                    "node_type": "education",
                    "title": "Initial Stage",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                }
            ],
            "proposed_edges": [],
        }
        init_req = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="explore_alternatives",
        )
        graph1 = generate_pathway_graph(
            init_req,
            client=make_mock_groq_client(init_proposal),
        )

        # Simulate trusted metadata already attached to the original node.
        # AI-generated CandidateNode objects must not supply these IDs.
        graph1.nodes[0].milestone_ids = ["m1"]
        graph1.nodes[0].institution_ids = ["i1"]
        graph1.nodes[0].evidence_ids = ["e1"]

class WhitespaceConditionalEdgeTest(unittest.TestCase):
    def test_whitespace_condition_is_rejected(self):
        """A conditional edge with only whitespace should raise a validation error."""
        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_A",
                    "node_type": "education",
                    "title": "Node A",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_B",
                    "node_type": "career",
                    "title": "Node B",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_ws",
                    "source": {"kind": "candidate", "candidate_id": "cand_A"},
                    "target": {"kind": "candidate", "candidate_id": "cand_B"},
                    "edge_type": "conditional",
                    "condition": "   ",
                }
            ],
        }
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        with self.assertRaises(GraphValidationError) as ctx:
            apply_candidate_proposal(request, proposal)
        self.assertIn("condition must be a non-empty string", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()
