import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domain_schemas import (
    CandidateProposal,
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
    build_generation_prompt,
    format_student_profile_summary,
    generate_pathway_graph,
)
from graph_engine import GraphValidationError
from schemas import (
    AnnualBudgetIn,
    FundingPreferencesIn,
    StrengthIn,
    StudentProfileCreate,
    SubjectIn,
)


def make_test_profile() -> StudentProfileCreate:
    return StudentProfileCreate(
        education_stage="class10",
        preferred_name="Aarav",
        country="India",
        region="Maharashtra",
        curriculum="State Board",
        academic_status="currently_studying",
        preferred_language="English",
        subjects=[
            SubjectIn(
                name="Mathematics",
                marks=85,
                maximum_marks=100,
                result_status="completed",
                favourite=True,
                challenging=False,
            ),
            SubjectIn(
                name="Science",
                marks=90,
                maximum_marks=100,
                result_status="completed",
                favourite=True,
                challenging=False,
            ),
        ],
        overall_percentage=87.5,
        overall_result_status="completed",
        interests=["technology_coding", "mathematics_logic"],
        strengths=[
            StrengthIn(
                name="logical_problem_solving",
                rating=5,
                rating_status="rated",
            )
        ],
        interest_description="I love solving math puzzles and building web applications.",
        annual_budget=AnnualBudgetIn(
            currency="INR",
            amount=150000,
            budget_status="estimated",
        ),
        funding_preferences=FundingPreferencesIn(
            interested_in_scholarships=True,
            willing_to_consider_loans=False,
        ),
        preferred_destination="india",
        career_certainty="few_ideas",
        priorities=["career_opportunities", "stability"],
    )


def make_mock_groq_client(response_json: dict | str) -> MagicMock:
    mock_client = MagicMock()
    content_str = response_json if isinstance(response_json, str) else json.dumps(response_json)

    mock_choice = MagicMock()
    mock_choice.message.content = content_str

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


class PromptConstructionTests(unittest.TestCase):
    def test_format_student_profile_summary_contains_all_key_fields(self):
        profile = make_test_profile()
        summary = format_student_profile_summary(profile)

        self.assertIn("Aarav", summary)
        self.assertIn("class10", summary)
        self.assertIn("Maharashtra, India", summary)
        self.assertIn("Mathematics: 85/100 (Favourite)", summary)
        self.assertIn("Science: 90/100 (Favourite)", summary)
        self.assertIn("87.5%", summary)
        self.assertIn("technology_coding", summary)
        self.assertIn("logical_problem_solving: rating 5/5", summary)
        self.assertIn("I love solving math puzzles", summary)
        self.assertIn("INR 150000", summary)
        self.assertIn("Interested in scholarships", summary)
        self.assertIn("Prefers no loans", summary)
        self.assertIn("career_opportunities", summary)

    def test_build_generation_prompt_initial_generation(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=3,
            generation_intent="explore_alternatives",
        )
        messages = build_generation_prompt(request)

        self.assertEqual(len(messages), 2)
        system_content = messages[0]["content"]
        user_content = messages[1]["content"]

        # System prompt checks
        self.assertIn("CandidateProposal", system_content)
        self.assertIn("education", system_content)
        self.assertIn("progression", system_content)

        # User prompt checks
        self.assertIn("INITIAL PATHWAY GENERATION", user_content)
        self.assertIn("Aarav", user_content)
        self.assertIn("EXACTLY 3 nodes", user_content)
        self.assertIn("explore_alternatives", user_content)
        self.assertIn("kind: \"candidate\"", user_content)

    def test_build_generation_prompt_expansion(self):
        existing_node = Node(
            node_id="node_foundation",
            node_type="education",
            title="Class 10 Completion",
            description="Completed secondary school.",
        )
        existing_graph = PathwayGraph(
            pathway_id="pathway_123",
            nodes=[existing_node],
            edges=[],
            target_outcome="Higher Education",
            schema_version="1.0",
        )
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            current_graph=existing_graph,
            current_node_ids_to_expand=["node_foundation"],
            candidate_node_count=2,
            generation_intent="continue",
        )
        messages = build_generation_prompt(request)
        user_content = messages[1]["content"]

        self.assertIn("GRAPH EXPANSION", user_content)
        self.assertIn("node_foundation", user_content)
        self.assertIn("Class 10 Completion", user_content)
        self.assertIn("Expansion Target Node: `node_foundation`", user_content)
        self.assertIn("kind\": \"existing_node\"", user_content)

    def test_build_generation_prompt_intent_guidance_for_all_intents(self):
        for intent, expected_heading, expected_phrase in (
            ("continue", "FORWARD PROGRESSION", "next sequential chronological stages"),
            ("explore_alternatives", "EXPLORE ALTERNATIVE PATHWAYS", "genuinely different parallel routes"),
            ("recover_from_blocked_route", "RECOVER FROM BLOCKED ROUTE", "plausible recovery options"),
        ):
            with self.subTest(intent=intent):
                request = GraphGenerationRequest(
                    student_profile_snapshot=make_test_profile(),
                    candidate_node_count=2,
                    generation_intent=intent,
                )
                messages = build_generation_prompt(request)
                user_content = messages[1]["content"]

                self.assertIn(expected_heading, user_content)
                self.assertIn(expected_phrase, user_content)

    def test_build_generation_prompt_expansion_serializes_existing_edges_and_conditions(self):
        node_a = Node(node_id="node_10th", node_type="education", title="Class 10", description="Secondary school")
        node_b = Node(node_id="node_pcm", node_type="education", title="Science PCM", description="Physics Chemistry Maths")
        edge = Edge(
            edge_id="edge_cond_1",
            source_node_id="node_10th",
            target_node_id="node_pcm",
            edge_type="conditional",
            condition="Minimum 75% in Science & Mathematics",
        )
        graph = PathwayGraph(
            pathway_id="pathway_edge_test",
            nodes=[node_a, node_b],
            edges=[edge],
            target_outcome="Science Career",
            schema_version="1.0",
        )
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            current_graph=graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )
        messages = build_generation_prompt(request)
        user_content = messages[1]["content"]

        self.assertIn("Existing Connections in Current Graph:", user_content)
        self.assertIn("`node_10th` (\"Class 10\") -[CONDITIONAL (Condition: Minimum 75% in Science & Mathematics)]-> `node_pcm` (\"Science PCM\")", user_content)
        self.assertIn("Avoid duplicating routes or branches already present", user_content)


class GeneratorServicePipelineTests(unittest.TestCase):
    def test_successful_initial_generation(self):
        proposal_dict = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_1",
                    "node_type": "education",
                    "title": "Senior Secondary Science (PCM)",
                    "description": "Two years of Physics, Chemistry, and Mathematics preparing for engineering.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 80000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_2",
                    "node_type": "career",
                    "title": "Software Engineering Exploration",
                    "description": "Undergraduate studies in computer engineering and software systems.",
                    "duration_estimate_months": 48,
                    "cost_estimate": 400000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [
                        {"kind": "candidate", "candidate_id": "cand_1"}
                    ],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_1",
                    "source": {"kind": "candidate", "candidate_id": "cand_1"},
                    "target": {"kind": "candidate", "candidate_id": "cand_2"},
                    "edge_type": "progression",
                    "condition": None,
                }
            ],
        }
        mock_client = make_mock_groq_client(proposal_dict)

        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=2,
            generation_intent="explore_alternatives",
        )

        result = generate_pathway_graph(request, client=mock_client, model="llama-3.3-70b-versatile")

        self.assertIsInstance(result, PathwayGraph)
        self.assertEqual(len(result.nodes), 2)
        # 1 progression edge + 1 synthesized prerequisite edge = 2 edges
        self.assertEqual(len(result.edges), 2)
        self.assertTrue(result.pathway_id.startswith("pathway_"))

        # Verify mock client call
        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        self.assertEqual(call_kwargs["model"], "llama-3.3-70b-versatile")
        self.assertEqual(call_kwargs["response_format"], {"type": "json_object"})

    def test_successful_graph_expansion(self):
        existing_node = Node(
            node_id="node_foundation",
            node_type="education",
            title="Class 10 Completion",
            description="Completed secondary school.",
        )
        existing_graph = PathwayGraph(
            pathway_id="pathway_fixed_id",
            nodes=[existing_node],
            edges=[],
            target_outcome="Software Engineer",
            schema_version="1.0",
        )
        proposal_dict = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_branch",
                    "node_type": "education",
                    "title": "Diploma in Computer Technology",
                    "description": "3-year polytechnic diploma route.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 100000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [
                        {"kind": "existing_node", "node_id": "node_foundation"}
                    ],
                }
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_poly",
                    "source": {"kind": "existing_node", "node_id": "node_foundation"},
                    "target": {"kind": "candidate", "candidate_id": "cand_branch"},
                    "edge_type": "alternative",
                    "condition": None,
                }
            ],
        }
        mock_client = make_mock_groq_client(proposal_dict)

        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            current_graph=existing_graph,
            current_node_ids_to_expand=["node_foundation"],
            candidate_node_count=1,
            generation_intent="continue",
        )

        result = generate_pathway_graph(request, client=mock_client)

        self.assertEqual(result.pathway_id, "pathway_fixed_id")
        self.assertEqual(len(result.nodes), 2)
        # 1 alternative edge + 1 synthesized prerequisite edge = 2 edges
        self.assertEqual(len(result.edges), 2)
        node_ids = [n.node_id for n in result.nodes]
        self.assertIn("node_foundation", node_ids)

    def test_invalid_json_raises_llm_response_parsing_error(self):
        mock_client = make_mock_groq_client("This is not JSON at all {broken")
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="continue",
        )

        with self.assertRaises(LLMResponseParsingError):
            generate_pathway_graph(request, client=mock_client)

    def test_schema_invalid_response_raises_llm_response_parsing_error(self):
        # Missing candidate_nodes key entirely
        mock_client = make_mock_groq_client({"random_key": "invalid data"})
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="continue",
        )

        with self.assertRaises(LLMResponseParsingError):
            generate_pathway_graph(request, client=mock_client)

    def test_incorrect_candidate_count_raises_graph_validation_error(self):
        # Request asks for 2 nodes, proposal returns 1 node
        proposal_dict = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_1",
                    "node_type": "education",
                    "title": "Stage 1",
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
        mock_client = make_mock_groq_client(proposal_dict)
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=2,
            generation_intent="continue",
        )

        with self.assertRaisesRegex(GraphValidationError, "expected exactly 2"):
            generate_pathway_graph(request, client=mock_client)

    def test_graph_engine_cycle_validation_failure_raises_graph_validation_error(self):
        # Dependency cycle between cand_1 and cand_2
        proposal_dict = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_1",
                    "node_type": "education",
                    "title": "Stage 1",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_2"}],
                },
                {
                    "candidate_id": "cand_2",
                    "node_type": "education",
                    "title": "Stage 2",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_1"}],
                },
            ],
            "proposed_edges": [],
        }
        mock_client = make_mock_groq_client(proposal_dict)
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=2,
            generation_intent="continue",
        )

        with self.assertRaisesRegex(GraphValidationError, "dependency cycle detected"):
            generate_pathway_graph(request, client=mock_client)

    def test_disconnected_expansion_raises_graph_validation_error(self):
        existing_node = Node(
            node_id="node_foundation",
            node_type="education",
            title="Class 10 Completion",
            description="Completed secondary school.",
        )
        existing_graph = PathwayGraph(
            pathway_id="pathway_fixed_id",
            nodes=[existing_node],
            edges=[],
            target_outcome="Software Engineer",
            schema_version="1.0",
        )
        # Candidate does not connect to node_foundation
        proposal_dict = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_isolated",
                    "node_type": "education",
                    "title": "Isolated Stage",
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
        mock_client = make_mock_groq_client(proposal_dict)
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            current_graph=existing_graph,
            current_node_ids_to_expand=["node_foundation"],
            candidate_node_count=1,
            generation_intent="continue",
        )

        with self.assertRaisesRegex(GraphValidationError, "expansion proposal must contain at least one connection"):
            generate_pathway_graph(request, client=mock_client)

    def test_groq_provider_failure_raises_llm_provider_error(self):
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = RuntimeError("Groq rate limit exceeded (503)")

        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="continue",
        )

        with self.assertRaises(LLMProviderError) as ctx:
            generate_pathway_graph(request, client=mock_client)
        self.assertIn("Groq rate limit exceeded", str(ctx.exception))

    def test_missing_api_key_raises_llm_configuration_error(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=1,
            generation_intent="continue",
        )

        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(LLMConfigurationError) as ctx:
                generate_pathway_graph(request, client=None)
            self.assertIn("GROQ_API_KEY", str(ctx.exception))


class BenchmarkScenarioTests(unittest.TestCase):
    """Offline benchmark scenarios evaluating pathway quality without network calls."""

    def test_prompt_includes_educational_routing_and_relationship_guidance(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=make_test_profile(),
            candidate_node_count=4,
            generation_intent="explore_alternatives",
        )
        messages = build_generation_prompt(request)
        system_content = messages[0]["content"]

        self.assertIn("Polytechnic Diploma", system_content)
        self.assertIn("ITI & Vocational Training", system_content)
        self.assertIn("Higher Secondary", system_content)
        self.assertIn("Polytechnic Diplomas and ITI training are direct post-Class 10 alternatives", system_content)
        self.assertIn("Estimates vs. Verified Facts", system_content)
        self.assertIn("alternative", system_content)
        self.assertIn("progression", system_content)
        self.assertIn("conditional", system_content)

    def test_scenario_a_undecided_practical_tech_student(self):
        # Scenario A: Undecided practical/tech student (65% aggregate, budget INR 50,000/yr, exploring)
        profile_a = StudentProfileCreate(
            education_stage="class10",
            preferred_name="Aman",
            country="India",
            region="Rajasthan",
            curriculum="State Board",
            academic_status="completed",
            preferred_language="Hindi and English",
            subjects=[
                SubjectIn(name="Mathematics", marks=68, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="Science", marks=64, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="Social Science", marks=62, maximum_marks=100, result_status="completed", favourite=False, challenging=False),
                SubjectIn(name="English", marks=66, maximum_marks=100, result_status="completed", favourite=False, challenging=False),
            ],
            overall_percentage=65.0,
            overall_result_status="completed",
            interests=["technology_coding", "science_discovery", "practical_technical_work"],
            strengths=[
                StrengthIn(name="practical_problem_solving", rating=4, rating_status="rated"),
            ],
            interest_description="I enjoy repairing electronic gadgets and writing basic code. Unsure which path to choose.",
            annual_budget=AnnualBudgetIn(currency="INR", amount=50000, budget_status="estimated"),
            funding_preferences=FundingPreferencesIn(interested_in_scholarships=True, willing_to_consider_loans=False),
            preferred_destination="india",
            career_certainty="exploring",
            priorities=["career_opportunities", "stability", "affordability"],
        )

        request_a = GraphGenerationRequest(
            student_profile_snapshot=profile_a,
            candidate_node_count=4,
            generation_intent="explore_alternatives",
        )

        # Verify prompt construction contains Scenario A specific details
        messages = build_generation_prompt(request_a)
        user_content = messages[1]["content"]
        self.assertIn("Aman", user_content)
        self.assertIn("65%", user_content)
        self.assertIn("INR 50000", user_content)
        self.assertIn("practical_technical_work", user_content)
        self.assertIn("exploring", user_content)

        # Mock proposal with direct post-10 polytechnic route (no Class 12 requirement)
        proposal_a = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_sc11",
                    "node_type": "education",
                    "title": "Class 11-12 (Science Stream - PCM)",
                    "description": "Senior secondary education with Physics, Chemistry and Maths. Estimated ₹10,000–₹25,000/year at state schools.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 40000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_poly",
                    "node_type": "education",
                    "title": "3-Year Polytechnic Diploma in Computer Engineering",
                    "description": "Direct entry technical diploma after Class 10 covering hardware, networking and software. Estimated ₹15,000–₹35,000/year at government polytechnic.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 75000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],  # Directly accessible after Class 10!
                },
                {
                    "candidate_id": "cand_cert",
                    "node_type": "certification",
                    "title": "Hardware & Networking Certification",
                    "description": "3-month practical certification for gadget and network troubleshooting.",
                    "duration_estimate_months": 3,
                    "cost_estimate": 6000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_career",
                    "node_type": "career",
                    "title": "Junior Network Technician",
                    "description": "Entry-level technical role in IT support and networking infrastructure.",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_poly"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_alt",
                    "source": {"kind": "candidate", "candidate_id": "cand_sc11"},
                    "target": {"kind": "candidate", "candidate_id": "cand_poly"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_prog",
                    "source": {"kind": "candidate", "candidate_id": "cand_poly"},
                    "target": {"kind": "candidate", "candidate_id": "cand_career"},
                    "edge_type": "progression",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal_a)
        graph_a = generate_pathway_graph(request_a, client=mock_client)

        self.assertIsInstance(graph_a, PathwayGraph)
        self.assertEqual(len(graph_a.nodes), 4)
        node_titles = [n.title for n in graph_a.nodes]
        self.assertIn("3-Year Polytechnic Diploma in Computer Engineering", node_titles)
        self.assertIn("Class 11-12 (Science Stream - PCM)", node_titles)

        # Verify polytechnic node has NO prerequisite on Class 12
        poly_node = [n for n in graph_a.nodes if "Polytechnic" in n.title][0]
        self.assertEqual(poly_node.prerequisite_node_ids, [])

    def test_scenario_b_creative_commerce_student(self):
        # Scenario B: Creative/commerce-oriented student (85% aggregate, budget INR 200,000/yr, few ideas)
        profile_b = StudentProfileCreate(
            education_stage="class10",
            preferred_name="Priya",
            country="India",
            region="Karnataka",
            curriculum="CBSE",
            academic_status="completed",
            preferred_language="English",
            subjects=[
                SubjectIn(name="Mathematics", marks=88, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="Social Science", marks=92, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="English", marks=86, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="Science", marks=74, maximum_marks=100, result_status="completed", favourite=False, challenging=True),
            ],
            overall_percentage=85.0,
            overall_result_status="completed",
            interests=["creativity_design", "business_finance"],
            strengths=[
                StrengthIn(name="creativity", rating=5, rating_status="rated"),
                StrengthIn(name="numerical_reasoning", rating=4, rating_status="rated"),
            ],
            interest_description="I love digital illustrations, branding, and understanding how businesses manage money.",
            annual_budget=AnnualBudgetIn(currency="INR", amount=200000, budget_status="fixed"),
            funding_preferences=FundingPreferencesIn(interested_in_scholarships=True, willing_to_consider_loans=True),
            preferred_destination="india",
            career_certainty="few_ideas",
            priorities=["creativity", "career_opportunities"],
        )

        request_b = GraphGenerationRequest(
            student_profile_snapshot=profile_b,
            candidate_node_count=4,
            generation_intent="explore_alternatives",
        )

        # Verify prompt contains Scenario B specific context
        messages = build_generation_prompt(request_b)
        user_content = messages[1]["content"]
        self.assertIn("Priya", user_content)
        self.assertIn("85%", user_content)
        self.assertIn("INR 200000", user_content)
        self.assertIn("creativity_design", user_content)
        self.assertIn("business_finance", user_content)

        # Mock proposal with Commerce and Design branching options
        proposal_b = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_comm",
                    "node_type": "education",
                    "title": "Class 11-12 Commerce with Applied Mathematics",
                    "description": "Senior secondary foundation in Accountancy, Economics, Business Studies and Mathematics. Estimated ₹30,000–₹80,000/year.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 100000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_arts",
                    "node_type": "education",
                    "title": "Class 11-12 Humanities with Fine Arts & Design",
                    "description": "Senior secondary stream emphasizing visual arts, design fundamentals and communication. Estimated ₹25,000–₹70,000/year.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 80000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],
                },
                {
                    "candidate_id": "cand_bdes",
                    "node_type": "education",
                    "title": "Bachelor of Design (B.Des) in Visual Communication",
                    "description": "4-year undergraduate design program. Estimated ₹1,00,000–₹2,00,000/year.",
                    "duration_estimate_months": 48,
                    "cost_estimate": 600000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_arts"}],
                },
                {
                    "candidate_id": "cand_bcom",
                    "node_type": "education",
                    "title": "Bachelor of Commerce (B.Com / BBA in Finance)",
                    "description": "3-year degree in commerce and corporate finance. Estimated ₹40,000–₹1,20,000/year.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 250000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_comm"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_alt_stream",
                    "source": {"kind": "candidate", "candidate_id": "cand_comm"},
                    "target": {"kind": "candidate", "candidate_id": "cand_arts"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_cond_bdes",
                    "source": {"kind": "candidate", "candidate_id": "cand_arts"},
                    "target": {"kind": "candidate", "candidate_id": "cand_bdes"},
                    "edge_type": "conditional",
                    "condition": "Design entrance exam clearance and minimum 60% in Class 12",
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal_b)
        graph_b = generate_pathway_graph(request_b, client=mock_client)

        self.assertIsInstance(graph_b, PathwayGraph)
        self.assertEqual(len(graph_b.nodes), 4)
        cond_edges = [e for e in graph_b.edges if e.edge_type == "conditional"]
        self.assertEqual(len(cond_edges), 1)
        self.assertIn("Design entrance exam", cond_edges[0].condition)

    def test_scenario_c_budget_constrained_workforce_student(self):
        # Scenario C: Budget-constrained student seeking early workforce route (52% aggregate, budget INR 20,000/yr)
        profile_c = StudentProfileCreate(
            education_stage="class10",
            preferred_name="Karan",
            country="India",
            region="Uttar Pradesh",
            curriculum="State Board",
            academic_status="completed",
            preferred_language="Hindi",
            subjects=[
                SubjectIn(name="Mathematics", marks=50, maximum_marks=100, result_status="completed", favourite=False, challenging=True),
                SubjectIn(name="Science", marks=52, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
                SubjectIn(name="Social Science", marks=54, maximum_marks=100, result_status="completed", favourite=False, challenging=False),
                SubjectIn(name="Hindi", marks=56, maximum_marks=100, result_status="completed", favourite=True, challenging=False),
            ],
            overall_percentage=53.0,
            overall_result_status="completed",
            interests=["practical_technical_work", "helping_people"],
            strengths=[
                StrengthIn(name="practical_problem_solving", rating=4, rating_status="rated"),
            ],
            interest_description="I need an affordable technical course that leads directly to earning in 1-2 years.",
            annual_budget=AnnualBudgetIn(currency="INR", amount=20000, budget_status="fixed"),
            funding_preferences=FundingPreferencesIn(interested_in_scholarships=True, willing_to_consider_loans=False),
            preferred_destination="india",
            career_certainty="exploring",
            priorities=["affordability", "stability"],
        )

        request_c = GraphGenerationRequest(
            student_profile_snapshot=profile_c,
            candidate_node_count=3,
            generation_intent="explore_alternatives",
        )

        # Verify prompt reflects Scenario C context
        messages = build_generation_prompt(request_c)
        user_content = messages[1]["content"]
        self.assertIn("Karan", user_content)
        self.assertIn("53%", user_content)
        self.assertIn("INR 20000", user_content)
        self.assertIn("affordability", user_content)

        # Mock proposal with Government ITI and Apprenticeship route
        proposal_c = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_iti",
                    "node_type": "education",
                    "title": "2-Year Government ITI Electrician Trade",
                    "description": "Practical vocational trade training directly after Class 10. Estimated ₹2,000–₹5,000/year at government ITI.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 8000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [],  # Directly accessible after Class 10!
                },
                {
                    "candidate_id": "cand_apprentice",
                    "node_type": "exploration",
                    "title": "National Apprenticeship Training Scheme (NATS)",
                    "description": "1-year on-the-job industrial apprenticeship with monthly government stipend.",
                    "duration_estimate_months": 12,
                    "cost_estimate": 0,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_iti"}],
                },
                {
                    "candidate_id": "cand_job",
                    "node_type": "career",
                    "title": "Certified Industrial Electrician",
                    "description": "Full-time technical employment in manufacturing or infrastructure maintenance.",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_apprentice"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_iti_to_apprentice",
                    "source": {"kind": "candidate", "candidate_id": "cand_iti"},
                    "target": {"kind": "candidate", "candidate_id": "cand_apprentice"},
                    "edge_type": "progression",
                    "condition": None,
                },
                {
                    "edge_key": "edge_apprentice_to_job",
                    "source": {"kind": "candidate", "candidate_id": "cand_apprentice"},
                    "target": {"kind": "candidate", "candidate_id": "cand_job"},
                    "edge_type": "progression",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal_c)
        graph_c = generate_pathway_graph(request_c, client=mock_client)

        self.assertIsInstance(graph_c, PathwayGraph)
        self.assertEqual(len(graph_c.nodes), 3)
        self.assertEqual(graph_c.nodes[0].cost_estimate, 8000)
        self.assertEqual(graph_c.nodes[0].prerequisite_node_ids, [])


class GraphExpansionTests(unittest.TestCase):
    """Offline unit tests for reliable graph expansion using mock Groq responses."""

    def setUp(self):
        self.profile = make_test_profile()
        self.existing_node_1 = Node(
            node_id="node_10th",
            node_type="education",
            title="Class 10 Secondary Education",
            description="Completed secondary board exam.",
            duration_estimate_months=12,
            cost_estimate=15000,
            cost_currency="INR",
            milestone_ids=[],
            institution_ids=[],
            evidence_ids=[],
            prerequisite_node_ids=[],
        )
        self.existing_node_2 = Node(
            node_id="node_pcm",
            node_type="education",
            title="Class 11-12 Science Stream (PCM)",
            description="Senior secondary physics, chemistry and mathematics.",
            duration_estimate_months=24,
            cost_estimate=40000,
            cost_currency="INR",
            milestone_ids=[],
            institution_ids=[],
            evidence_ids=[],
            prerequisite_node_ids=["node_10th"],
        )
        self.existing_edge = Edge(
            edge_id="edge_10th_to_pcm",
            source_node_id="node_10th",
            target_node_id="node_pcm",
            edge_type="progression",
            condition=None,
        )
        self.base_graph = PathwayGraph(
            pathway_id="pathway_permanent_123",
            nodes=[self.existing_node_1, self.existing_node_2],
            edges=[self.existing_edge],
            target_outcome="Software Engineering Career",
            schema_version="1.0",
        )

    def test_expansion_preserves_pathway_metadata_original_nodes_and_edges(self):
        # Expand 'node_pcm' with 2 new candidate stages
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=2,
            generation_intent="continue",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_btech",
                    "node_type": "education",
                    "title": "B.Tech in Computer Science & Engineering",
                    "description": "4-year engineering degree.",
                    "duration_estimate_months": 48,
                    "cost_estimate": 400000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_pcm"}],
                },
                {
                    "candidate_id": "cand_swe",
                    "node_type": "career",
                    "title": "Junior Software Engineer",
                    "description": "Entry-level full-time software engineering role.",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_btech"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_pcm_to_btech",
                    "source": {"kind": "existing_node", "node_id": "node_pcm"},
                    "target": {"kind": "candidate", "candidate_id": "cand_btech"},
                    "edge_type": "progression",
                    "condition": None,
                },
                {
                    "edge_key": "edge_btech_to_swe",
                    "source": {"kind": "candidate", "candidate_id": "cand_btech"},
                    "target": {"kind": "candidate", "candidate_id": "cand_swe"},
                    "edge_type": "progression",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        result = generate_pathway_graph(request, client=mock_client)

        # 1. Metadata preservation
        self.assertEqual(result.pathway_id, "pathway_permanent_123")
        self.assertEqual(result.target_outcome, "Software Engineering Career")
        self.assertEqual(result.schema_version, "1.0")

        # 2. Total node count (2 original + 2 new = 4)
        self.assertEqual(len(result.nodes), 4)

        # 3. Original nodes preserved intact
        nodes_by_id = {n.node_id: n for n in result.nodes}
        self.assertIn("node_10th", nodes_by_id)
        self.assertIn("node_pcm", nodes_by_id)
        self.assertEqual(nodes_by_id["node_10th"].title, self.existing_node_1.title)
        self.assertEqual(nodes_by_id["node_pcm"].title, self.existing_node_2.title)
        self.assertEqual(nodes_by_id["node_pcm"].prerequisite_node_ids, ["node_10th"])

        # 4. Original edge preserved
        edge_ids = [e.edge_id for e in result.edges]
        self.assertIn("edge_10th_to_pcm", edge_ids)

        # 5. New candidates connect to selected expansion node 'node_pcm'
        new_nodes = [n for n in result.nodes if n.node_id not in ("node_10th", "node_pcm")]
        self.assertEqual(len(new_nodes), 2)
        btech_node = [n for n in new_nodes if "B.Tech" in n.title][0]
        self.assertIn("node_pcm", btech_node.prerequisite_node_ids)

    def test_multi_hop_branch_expansion_from_selected_node(self):
        # Expand 'node_10th' with a 3-step polytechnic vocational branch
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_10th"],
            candidate_node_count=3,
            generation_intent="explore_alternatives",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_poly",
                    "node_type": "education",
                    "title": "3-Year Diploma in Electrical Engineering",
                    "description": "Polytechnic diploma directly after Class 10.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 70000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_10th"}],
                },
                {
                    "candidate_id": "cand_intern",
                    "node_type": "exploration",
                    "title": "Power Plant Industrial Internship",
                    "description": "6-month practical field internship.",
                    "duration_estimate_months": 6,
                    "cost_estimate": 0,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_poly"}],
                },
                {
                    "candidate_id": "cand_tech_job",
                    "node_type": "career",
                    "title": "Substation Junior Engineer / Technician",
                    "description": "Technical employment in state electricity board.",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_intern"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_10th_to_poly",
                    "source": {"kind": "existing_node", "node_id": "node_10th"},
                    "target": {"kind": "candidate", "candidate_id": "cand_poly"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_poly_to_intern",
                    "source": {"kind": "candidate", "candidate_id": "cand_poly"},
                    "target": {"kind": "candidate", "candidate_id": "cand_intern"},
                    "edge_type": "progression",
                    "condition": None,
                },
                {
                    "edge_key": "edge_intern_to_job",
                    "source": {"kind": "candidate", "candidate_id": "cand_intern"},
                    "target": {"kind": "candidate", "candidate_id": "cand_tech_job"},
                    "edge_type": "progression",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        result = generate_pathway_graph(request, client=mock_client)

        self.assertEqual(len(result.nodes), 5)  # 2 original + 3 new = 5
        self.assertEqual(result.pathway_id, "pathway_permanent_123")

        # Verify multi-hop connections are valid
        nodes_by_title = {n.title: n for n in result.nodes}
        poly_node = nodes_by_title["3-Year Diploma in Electrical Engineering"]
        intern_node = nodes_by_title["Power Plant Industrial Internship"]
        job_node = nodes_by_title["Substation Junior Engineer / Technician"]

        self.assertIn("node_10th", poly_node.prerequisite_node_ids)
        self.assertIn(poly_node.node_id, intern_node.prerequisite_node_ids)
        self.assertIn(intern_node.node_id, job_node.prerequisite_node_ids)

    def test_expansion_with_conditional_branch_preserved(self):
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=1,
            generation_intent="continue",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_iit",
                    "node_type": "education",
                    "title": "B.Tech at Indian Institute of Technology (IIT)",
                    "description": "Premier undergraduate engineering education.",
                    "duration_estimate_months": 48,
                    "cost_estimate": 800000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_pcm"}],
                }
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_pcm_to_iit",
                    "source": {"kind": "existing_node", "node_id": "node_pcm"},
                    "target": {"kind": "candidate", "candidate_id": "cand_iit"},
                    "edge_type": "conditional",
                    "condition": "Rank in JEE Advanced entrance examination",
                }
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        result = generate_pathway_graph(request, client=mock_client)

        self.assertEqual(len(result.nodes), 3)
        cond_edge = [e for e in result.edges if e.edge_type == "conditional"][0]
        self.assertEqual(cond_edge.condition, "Rank in JEE Advanced entrance examination")
        self.assertEqual(cond_edge.source_node_id, "node_pcm")

    def test_expansion_disconnected_proposal_rejected(self):
        # Proposal candidates connect to each other, but not to 'node_pcm'
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=2,
            generation_intent="continue",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_iso1",
                    "node_type": "education",
                    "title": "Isolated Stage 1",
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
                    "candidate_id": "cand_iso2",
                    "node_type": "education",
                    "title": "Isolated Stage 2",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "candidate", "candidate_id": "cand_iso1"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_iso",
                    "source": {"kind": "candidate", "candidate_id": "cand_iso1"},
                    "target": {"kind": "candidate", "candidate_id": "cand_iso2"},
                    "edge_type": "progression",
                    "condition": None,
                }
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        with self.assertRaisesRegex(GraphValidationError, "expansion proposal must contain at least one connection"):
            generate_pathway_graph(request, client=mock_client)

    def test_expansion_dependency_cycle_rejected(self):
        # Candidate makes existing node_10th dependent on cand_1, while cand_1 is dependent on existing node_pcm
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=1,
            generation_intent="continue",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_cycle",
                    "node_type": "education",
                    "title": "Cyclic Stage",
                    "description": "Desc",
                    "duration_estimate_months": None,
                    "cost_estimate": None,
                    "cost_currency": None,
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_pcm"}],
                }
            ],
            "proposed_edges": [
                # Existing graph has: node_10th -> node_pcm
                # Candidate has: cand_cycle (prereq node_pcm)
                # Adding dependency: cand_cycle -> node_10th creates cycle: node_10th -> node_pcm -> cand_cycle -> node_10th
                {
                    "edge_key": "edge_cycle_back",
                    "source": {"kind": "candidate", "candidate_id": "cand_cycle"},
                    "target": {"kind": "existing_node", "node_id": "node_10th"},
                    "edge_type": "prerequisite",
                    "condition": None,
                }
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        with self.assertRaisesRegex(GraphValidationError, "dependency cycle detected"):
            generate_pathway_graph(request, client=mock_client)

    def test_expansion_explore_alternatives_branches_parallel_options_from_target(self):
        # Expand 'node_10th' with 3 distinct parallel alternative branches (Polytechnic, ITI, Vocational)
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_10th"],
            candidate_node_count=3,
            generation_intent="explore_alternatives",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_poly",
                    "node_type": "education",
                    "title": "3-Year Polytechnic Diploma in Civil Engineering",
                    "description": "Direct entry technical diploma in civil infrastructure.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 60000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_10th"}],
                },
                {
                    "candidate_id": "cand_iti",
                    "node_type": "education",
                    "title": "2-Year ITI Draftsman Trade Certificate",
                    "description": "Hands-on drafting and CAD training.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 10000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_10th"}],
                },
                {
                    "candidate_id": "cand_comm",
                    "node_type": "education",
                    "title": "Class 11-12 Commerce Stream",
                    "description": "Senior secondary commerce and economics.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 35000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_10th"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_alt_poly",
                    "source": {"kind": "existing_node", "node_id": "node_10th"},
                    "target": {"kind": "candidate", "candidate_id": "cand_poly"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_alt_iti",
                    "source": {"kind": "existing_node", "node_id": "node_10th"},
                    "target": {"kind": "candidate", "candidate_id": "cand_iti"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_alt_comm",
                    "source": {"kind": "existing_node", "node_id": "node_10th"},
                    "target": {"kind": "candidate", "candidate_id": "cand_comm"},
                    "edge_type": "alternative",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        result = generate_pathway_graph(request, client=mock_client)

        # 2 original nodes + 3 alternative branches = 5 nodes
        self.assertEqual(len(result.nodes), 5)
        self.assertEqual(result.pathway_id, "pathway_permanent_123")

        # Verify all 3 parallel alternative edges originate from node_10th
        alt_edges = [
            e for e in result.edges
            if e.edge_type == "alternative" and e.source_node_id == "node_10th"
        ]
        self.assertEqual(len(alt_edges), 3)

        # Verify no dependency cycles
        new_node_ids = {n.node_id for n in result.nodes if n.node_id not in ("node_10th", "node_pcm")}
        self.assertEqual(len(new_node_ids), 3)
        for nid in new_node_ids:
            node = [n for n in result.nodes if n.node_id == nid][0]
            self.assertEqual(node.prerequisite_node_ids, ["node_10th"])

    def test_expansion_recover_from_blocked_route_branches_alternative_options(self):
        # Scenario: Recover from a blocked path by providing alternative vocational/bridge options
        request = GraphGenerationRequest(
            student_profile_snapshot=self.profile,
            current_graph=self.base_graph,
            current_node_ids_to_expand=["node_pcm"],
            candidate_node_count=2,
            generation_intent="recover_from_blocked_route",
        )

        proposal = {
            "candidate_nodes": [
                {
                    "candidate_id": "cand_bca",
                    "node_type": "education",
                    "title": "Bachelor of Computer Applications (BCA)",
                    "description": "Accessible computing degree without rigid engineering entrance requirements.",
                    "duration_estimate_months": 36,
                    "cost_estimate": 150000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_pcm"}],
                },
                {
                    "candidate_id": "cand_diploma_lateral",
                    "node_type": "education",
                    "title": "2-Year Polytechnic Lateral Entry (Direct 2nd Year)",
                    "description": "Bridge technical diploma accessible after Class 12 Science.",
                    "duration_estimate_months": 24,
                    "cost_estimate": 45000,
                    "cost_currency": "INR",
                    "milestone_ids": [],
                    "institution_ids": [],
                    "evidence_ids": [],
                    "prerequisite_refs": [{"kind": "existing_node", "node_id": "node_pcm"}],
                },
            ],
            "proposed_edges": [
                {
                    "edge_key": "edge_alt_bca",
                    "source": {"kind": "existing_node", "node_id": "node_pcm"},
                    "target": {"kind": "candidate", "candidate_id": "cand_bca"},
                    "edge_type": "alternative",
                    "condition": None,
                },
                {
                    "edge_key": "edge_alt_lateral",
                    "source": {"kind": "existing_node", "node_id": "node_pcm"},
                    "target": {"kind": "candidate", "candidate_id": "cand_diploma_lateral"},
                    "edge_type": "alternative",
                    "condition": None,
                },
            ],
        }

        mock_client = make_mock_groq_client(proposal)
        result = generate_pathway_graph(request, client=mock_client)

        self.assertEqual(len(result.nodes), 4)
        alt_edges = [
            e for e in result.edges
            if e.edge_type == "alternative" and e.source_node_id == "node_pcm"
        ]
        self.assertEqual(len(alt_edges), 2)


if __name__ == "__main__":
    unittest.main()
