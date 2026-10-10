import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domain_schemas import (
    Edge,
    GraphGenerationRequest,
    Node,
    PathwayGraph,
)
from generator_service import (
    GraphGenerationError,
    LLMConfigurationError,
    LLMProviderError,
    LLMResponseParsingError,
)
from graph_engine import GraphValidationError
from main import app


def make_sample_request_dict() -> dict:
    """Return a valid GraphGenerationRequest payload dict."""
    return {
        "student_profile_snapshot": {
            "education_stage": "class10",
            "preferred_name": "Aarav",
            "country": "India",
            "region": "Maharashtra",
            "curriculum": "State Board",
            "academic_status": "currently_studying",
            "preferred_language": "English",
            "subjects": [
                {
                    "name": "Mathematics",
                    "marks": 85.0,
                    "maximum_marks": 100.0,
                    "result_status": "completed",
                    "favourite": True,
                    "challenging": False,
                }
            ],
            "overall_percentage": 85.0,
            "overall_result_status": "completed",
            "interests": ["technology_coding", "mathematics_logic"],
            "strengths": [
                {
                    "name": "logical_problem_solving",
                    "rating": 4,
                    "rating_status": "rated",
                }
            ],
            "interest_description": "I enjoy mathematics and computer science.",
            "annual_budget": {
                "currency": "INR",
                "amount": 150000.0,
                "budget_status": "estimated",
            },
            "funding_preferences": {
                "interested_in_scholarships": True,
                "willing_to_consider_loans": False,
            },
            "preferred_destination": "india",
            "priorities": ["affordability", "career_opportunities"],
            "career_certainty": "exploring",
        },
        "current_graph": None,
        "current_node_ids_to_expand": [],
        "candidate_node_count": 3,
        "generation_intent": "explore_alternatives",
    }


def make_sample_pathway_graph() -> PathwayGraph:
    """Return a valid sample PathwayGraph."""
    return PathwayGraph(
        pathway_id="pw_test_123",
        nodes=[
            Node(
                node_id="node_1",
                node_type="education",
                title="Class 11 Science (PCM)",
                description="Higher secondary education focusing on Physics, Chemistry, and Mathematics.",
                duration_estimate_months=24.0,
                cost_estimate=50000.0,
                cost_currency="INR",
            ),
            Node(
                node_id="node_2",
                node_type="career",
                title="Software Engineer",
                description="Professional software development role.",
                duration_estimate_months=48.0,
                cost_estimate=None,
                cost_currency=None,
            ),
        ],
        edges=[
            Edge(
                edge_id="edge_1",
                source_node_id="node_1",
                target_node_id="node_2",
                edge_type="progression",
                condition=None,
            )
        ],
        target_outcome="Tech Career Pathway",
        schema_version="1.0",
    )


class TestGraphRoutes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_route_is_registered(self):
        """Verify POST /api/graph/generate is registered in the FastAPI app."""
        openapi_paths = app.openapi()["paths"]
        self.assertIn("/api/graph/generate", openapi_paths)
        self.assertIn("post", openapi_paths["/api/graph/generate"])

    @patch("graph_routes.generate_pathway_graph")
    def test_valid_initial_generation_request(self, mock_generate):
        """Valid initial generation request returns 200 OK with expected PathwayGraph structure."""
        expected_graph = make_sample_pathway_graph()
        mock_generate.return_value = expected_graph

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["pathway_id"], "pw_test_123")
        self.assertEqual(len(data["nodes"]), 2)
        self.assertEqual(data["nodes"][0]["node_id"], "node_1")
        self.assertEqual(data["nodes"][0]["node_type"], "education")
        self.assertEqual(data["nodes"][0]["title"], "Class 11 Science (PCM)")
        self.assertEqual(len(data["edges"]), 1)
        self.assertEqual(data["edges"][0]["edge_id"], "edge_1")
        self.assertEqual(data["edges"][0]["source_node_id"], "node_1")
        self.assertEqual(data["edges"][0]["target_node_id"], "node_2")

        mock_generate.assert_called_once()
        call_arg = mock_generate.call_args[0][0]
        self.assertIsInstance(call_arg, GraphGenerationRequest)
        self.assertEqual(call_arg.candidate_node_count, 3)
        self.assertEqual(call_arg.generation_intent, "explore_alternatives")

    @patch("graph_routes.generate_pathway_graph")
    def test_valid_expansion_generation_request(self, mock_generate):
        """Valid expansion generation request with existing graph returns 200 OK."""
        existing_graph = make_sample_pathway_graph()
        expected_expanded = PathwayGraph(
            pathway_id="pw_test_123",
            nodes=existing_graph.nodes
            + [
                Node(
                    node_id="node_3",
                    node_type="career",
                    title="Data Analyst",
                    description="Analytics and visualization career route.",
                )
            ],
            edges=existing_graph.edges
            + [
                Edge(
                    edge_id="edge_2",
                    source_node_id="node_1",
                    target_node_id="node_3",
                    edge_type="alternative",
                )
            ],
            target_outcome="Expanded Pathway",
            schema_version="1.0",
        )
        mock_generate.return_value = expected_expanded

        payload = make_sample_request_dict()
        payload["current_graph"] = existing_graph.model_dump()
        payload["current_node_ids_to_expand"] = ["node_1"]
        payload["generation_intent"] = "continue"

        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["nodes"]), 3)
        self.assertEqual(len(data["edges"]), 2)
        mock_generate.assert_called_once()

    def test_invalid_request_missing_required_fields(self):
        """Request missing candidate_node_count or generation_intent is rejected with 422."""
        payload = make_sample_request_dict()
        del payload["candidate_node_count"]

        response = self.client.post("/api/graph/generate", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_candidate_count_out_of_bounds(self):
        """candidate_node_count < 1 or > 25 is rejected with 422."""
        payload_zero = make_sample_request_dict()
        payload_zero["candidate_node_count"] = 0
        response = self.client.post("/api/graph/generate", json=payload_zero)
        self.assertEqual(response.status_code, 422)

        payload_excess = make_sample_request_dict()
        payload_excess["candidate_node_count"] = 26
        response = self.client.post("/api/graph/generate", json=payload_excess)
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_unsupported_intent(self):
        """Unsupported generation_intent value is rejected with 422."""
        payload = make_sample_request_dict()
        payload["generation_intent"] = "invalid_intent_value"

        response = self.client.post("/api/graph/generate", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_extra_fields_forbidden(self):
        """StrictModel rejects unexpected extra fields with 422."""
        payload = make_sample_request_dict()
        payload["unexpected_injected_field"] = "malicious_data"

        response = self.client.post("/api/graph/generate", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_expansion_node_ids_without_current_graph(self):
        """current_node_ids_to_expand without current_graph is rejected with 422."""
        payload = make_sample_request_dict()
        payload["current_graph"] = None
        payload["current_node_ids_to_expand"] = ["non_existent_node"]

        response = self.client.post("/api/graph/generate", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_request_expansion_missing_node_id(self):
        """current_node_ids_to_expand referencing node not in current_graph is rejected with 422."""
        existing_graph = make_sample_pathway_graph()
        payload = make_sample_request_dict()
        payload["current_graph"] = existing_graph.model_dump()
        payload["current_node_ids_to_expand"] = ["missing_node_id_404"]

        response = self.client.post("/api/graph/generate", json=payload)
        self.assertEqual(response.status_code, 422)

    @patch("graph_routes.generate_pathway_graph")
    def test_configuration_error_returns_500_sanitized(self, mock_generate):
        """LLMConfigurationError returns 500 without leaking API keys or secrets."""
        mock_generate.side_effect = LLMConfigurationError(
            "GROQ_API_KEY environment variable is not set and secret gsk_abcdef123456 is missing"
        )

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 500)
        detail = response.json().get("detail", "")
        self.assertEqual(detail, "AI generation service configuration error")
        self.assertNotIn("GROQ_API_KEY", detail)
        self.assertNotIn("gsk_", detail)

    @patch("graph_routes.generate_pathway_graph")
    def test_provider_error_returns_502_sanitized(self, mock_generate):
        """LLMProviderError returns 502 Bad Gateway without leaking provider internal details."""
        mock_generate.side_effect = LLMProviderError(
            "Groq API call failed: Connection refused to api.groq.com/openai/v1 at auth header Bearer gsk_secret"
        )

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 502)
        detail = response.json().get("detail", "")
        self.assertEqual(detail, "AI provider service call failed. Please try again later.")
        self.assertNotIn("api.groq.com", detail)
        self.assertNotIn("gsk_secret", detail)

    @patch("graph_routes.generate_pathway_graph")
    def test_response_parsing_error_returns_502_sanitized(self, mock_generate):
        """LLMResponseParsingError returns 502 Bad Gateway without leaking raw dump."""
        mock_generate.side_effect = LLMResponseParsingError(
            "Groq response is not valid JSON: Expecting value: line 1 column 1 (char 0)"
        )

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 502)
        detail = response.json().get("detail", "")
        self.assertEqual(detail, "Failed to parse or validate AI provider response.")

    @patch("graph_routes.generate_pathway_graph")
    def test_graph_validation_error_returns_422(self, mock_generate):
        """GraphValidationError returns 422 with validation errors."""
        mock_generate.side_effect = GraphValidationError(
            ["dependency cycle detected between node_1 and node_2", "invalid edge reference"]
        )

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 422)
        detail = response.json().get("detail", "")
        self.assertIn("Graph validation failed", detail)
        self.assertIn("dependency cycle detected", detail)

    @patch("graph_routes.generate_pathway_graph")
    def test_generic_generation_error_returns_500(self, mock_generate):
        """Generic GraphGenerationError returns 500."""
        mock_generate.side_effect = GraphGenerationError("Something unexpected went wrong")

        payload = make_sample_request_dict()
        response = self.client.post("/api/graph/generate", json=payload)

        self.assertEqual(response.status_code, 500)
        detail = response.json().get("detail", "")
        self.assertEqual(detail, "Failed to generate pathway graph.")

    def test_cors_allows_localhost_3000_and_5173(self):
        """CORS headers allow localhost:3000, 127.0.0.1:3000, and 5173 ports."""
        origins_to_test = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        for origin in origins_to_test:
            response = self.client.options(
                "/api/graph/generate",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                },
            )
            self.assertEqual(
                response.headers.get("access-control-allow-origin"),
                origin,
                f"Failed CORS origin check for {origin}",
            )


if __name__ == "__main__":
    unittest.main()
