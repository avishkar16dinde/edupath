import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import ValidationError

load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env")

from domain_schemas import (
    CandidateProposal,
    GraphGenerationRequest,
    PathwayGraph,
)
from graph_engine import GraphValidationError, apply_candidate_proposal


class GraphGenerationError(Exception):
    """Base exception for pathway graph generation failures."""


class LLMConfigurationError(GraphGenerationError):
    """Raised when the LLM client or credentials are missing or invalid."""


class LLMProviderError(GraphGenerationError):
    """Raised when the LLM provider API call fails."""


class LLMResponseParsingError(GraphGenerationError):
    """Raised when the LLM response is not valid JSON or fails schema validation."""


def _format_num(val: Any) -> str:
    if isinstance(val, (int, float)):
        if float(val).is_integer():
            return str(int(val))
        return f"{val:g}"
    return str(val)


def format_student_profile_summary(profile: Any) -> str:
    """Format the student profile into a structured, readable summary for the LLM."""
    if hasattr(profile, "model_dump"):
        data = profile.model_dump()
    elif isinstance(profile, dict):
        data = profile
    else:
        return str(profile)

    lines: list[str] = []

    # Basic demographics and academic status
    stage = data.get("education_stage", "Unknown")
    name = data.get("preferred_name") or "Student"
    country = data.get("country") or "Not specified"
    region = data.get("region") or "Not specified"
    curriculum = data.get("curriculum") or "Not specified"
    status = data.get("academic_status") or "Not specified"
    lang = data.get("preferred_language") or "English"

    lines.append(f"- Student Name: {name}")
    lines.append(f"- Education Stage: {stage} ({status})")
    lines.append(f"- Location: {region}, {country}")
    lines.append(f"- Curriculum: {curriculum}")
    lines.append(f"- Preferred Language: {lang}")

    # Overall academic performance
    overall_pct = data.get("overall_percentage")
    overall_status = data.get("overall_result_status")
    if overall_pct is not None:
        lines.append(f"- Overall Percentage: {_format_num(overall_pct)}% ({overall_status or 'completed'})")
    elif overall_status:
        lines.append(f"- Overall Result Status: {overall_status}")

    # Subjects
    subjects = data.get("subjects", [])
    if subjects:
        subj_strs = []
        for s in subjects:
            s_name = s.get("name", "Subject")
            s_marks = s.get("marks")
            s_max = s.get("maximum_marks")
            s_fav = " (Favourite)" if s.get("favourite") else ""
            s_chal = " (Challenging)" if s.get("challenging") else ""
            mark_info = (
                f"{_format_num(s_marks)}/{_format_num(s_max)}"
                if s_marks is not None and s_max is not None
                else "marks pending"
            )
            subj_strs.append(f"{s_name}: {mark_info}{s_fav}{s_chal}")
        lines.append("- Subjects: " + "; ".join(subj_strs))

    # Interests and written description
    interests = data.get("interests", [])
    if interests:
        lines.append(f"- Stated Interests: {', '.join(interests)}")
    interest_desc = data.get("interest_description")
    if interest_desc:
        lines.append(f"- Student's Own Words / Interest Description: \"{interest_desc}\"")

    # Strengths
    strengths = data.get("strengths", [])
    if strengths:
        str_strs = [f"{st.get('name')}: rating {st.get('rating')}/5" for st in strengths if st.get("name")]
        if str_strs:
            lines.append("- Strengths: " + ", ".join(str_strs))

    # Budget & funding
    budget = data.get("annual_budget") or {}
    if budget.get("amount") is not None:
        lines.append(
            f"- Annual Budget: {budget.get('currency', 'INR')} {_format_num(budget.get('amount'))} ({budget.get('budget_status', 'estimated')})"
        )
    funding = data.get("funding_preferences") or {}
    scholarships = funding.get("interested_in_scholarships")
    loans = funding.get("willing_to_consider_loans")
    funding_notes = []
    if scholarships:
        funding_notes.append("Interested in scholarships")
    if loans is not None:
        funding_notes.append("Willing to consider loans" if loans else "Prefers no loans")
    if funding_notes:
        lines.append("- Funding Preferences: " + ", ".join(funding_notes))

    # Career certainty & priorities
    certainty = data.get("career_certainty")
    if certainty:
        lines.append(f"- Career Certainty: {certainty}")
    priorities = data.get("priorities", [])
    if priorities:
        lines.append(f"- Key Priorities: {', '.join(priorities)}")
    dest = data.get("preferred_destination")
    if dest:
        lines.append(f"- Preferred Destination: {dest}")

    return "\n".join(lines)


def build_generation_prompt(request: GraphGenerationRequest) -> list[dict[str, str]]:
    """Build the system and user messages for Groq candidate proposal generation."""
    profile_summary = format_student_profile_summary(request.student_profile_snapshot)

    system_prompt = (
        "You are the EduPath AI Career & Education Simulation Engine.\n"
        "Your task is to generate realistic, inspiring, and structurally sound education-to-career "
        "pathway candidate proposals for students, especially those exploring options or undecided.\n\n"
        "### STRICT OUTPUT FORMAT RULES\n"
        f"1. Output MUST be a single valid JSON object strictly matching the CandidateProposal schema with EXACTLY {request.candidate_node_count} candidate nodes:\n"
        "   {\n"
        '     "candidate_nodes": [\n'
        "       {\n"
        '         "candidate_id": "cand_1",\n'
        '         "node_type": "education" | "career" | "exploration" | "certification",\n'
        '         "title": "Concise Stage Title (1-200 chars)",\n'
        '         "description": "Clear explanation of this stage, subjects/skills involved, indicative duration/cost range, and relevance to the student (1-4000 chars)",\n'
        '         "duration_estimate_months": number | null,\n'
        '         "cost_estimate": number | null,\n'
        '         "cost_currency": "INR" | "USD" | null,\n'
        '         "milestone_ids": [],\n'
        '         "institution_ids": [],\n'
        '         "evidence_ids": [],\n'
        '         "prerequisite_refs": [\n'
        '           {"kind": "candidate", "candidate_id": "cand_X"} OR {"kind": "existing_node", "node_id": "node_Y"}\n'
        "         ]\n"
        "       }\n"
        "     ],\n"
        '     "proposed_edges": [\n'
        "       {\n"
        '         "edge_key": "edge_1",\n'
        '         "source": {"kind": "candidate", "candidate_id": "cand_A"} OR {"kind": "existing_node", "node_id": "node_A"},\n'
        '         "target": {"kind": "candidate", "candidate_id": "cand_B"} OR {"kind": "existing_node", "node_id": "node_B"},\n'
        '         "edge_type": "progression" | "alternative" | "conditional" | "dependency" | "prerequisite",\n'
        '         "condition": "Non-empty string if conditional, null otherwise"\n'
        "       }\n"
        "     ]\n"
        "   }\n\n"
        "2. Node & Edge Type Constraints:\n"
        "   - Node types MUST ONLY be: 'education', 'career', 'exploration', 'certification'.\n"
        "   - Edge types MUST ONLY be: 'progression', 'alternative', 'conditional', 'dependency', 'prerequisite'.\n"
        "   - 'condition' MUST be a non-empty string when edge_type is 'conditional', and MUST be null for all other edge types.\n"
        "   - 'milestone_ids', 'institution_ids', and 'evidence_ids' MUST be empty arrays `[]`.\n"
        "   - Temporary IDs: use 'cand_1', 'cand_2', etc. for candidate_id, and 'edge_1', 'edge_2', etc. for edge_key. Every temporary key must be unique.\n"
        "   - No self-loops (source and target endpoints must not be the same node).\n"
        "   - Dependency/prerequisite edges and prerequisite_refs must form a strict Directed Acyclic Graph (no cycles).\n\n"
        "3. Graph Relationship Semantics:\n"
        "   - Use 'alternative' for parallel educational or career options branching from a decision point (e.g. Science vs. Commerce vs. Polytechnic Diploma).\n"
        "   - Use 'progression' for sequential stages within a route (e.g. Class 11 -> Class 12 -> Bachelor's Degree).\n"
        "   - Use 'conditional' when advancing requires meeting explicitly stated criteria (e.g. minimum marks or specific subject requirements).\n"
        "   - Use 'prerequisite_refs' ONLY for genuine formal entry requirements (e.g. Class 10 completion for Class 11, or Class 12 for B.Tech), NOT for optional or recommended prep.\n\n"
        "4. Estimates vs. Verified Facts:\n"
        "   - Costs (cost_estimate) and durations (duration_estimate_months) are indicative estimates that vary by institution (government vs. private), program, state, and year.\n"
        "   - In node descriptions, phrase figures as estimated ranges and clarify whether cost is annual or total for the stage.\n"
        "   - NEVER present unverified figures as guaranteed admission eligibility, fixed fee structures, scholarships, or guaranteed salaries.\n\n"
        "5. Post-Class 10 Educational Pathways Guidance:\n"
        "   - Class 10 graduates have multiple parallel entry routes:\n"
        "     (a) Higher Secondary (Class 11 & 12): Streams like Science (PCM/PCB), Commerce, Humanities/Arts, or Vocational streams, leading to Undergraduate Degrees (B.Tech, B.Sc, B.Com, BA, BCA, B.Des, etc.).\n"
        "     (b) Polytechnic Diploma (typically 3 years): Technical engineering diplomas (Computer, Mechanical, Electrical, Civil, etc.) entered directly after Class 10, leading to junior technician/engineer roles OR Lateral Entry into 2nd year B.Tech.\n"
        "     (c) ITI & Vocational Training (1–2 years): Practical trade certificates (Electrician, Fitter, COPA, Welder, etc.) entered directly after Class 10, leading to apprenticeships or skilled trade employment.\n"
        "   - Crucial: Polytechnic Diplomas and ITI training are direct post-Class 10 alternatives; do NOT make Class 12 a universal prerequisite for a 3-year polytechnic diploma or ITI route.\n"
        "   - Undecided Students ('exploring'): When career certainty is 'exploring', favor broad, accessible foundational options that allow discovering interests without premature lock-in. Root candidate nodes must represent genuine educational choices rather than generic meta-activities like 'Self-Assessment'."
    )

    user_lines: list[str] = [
        "### STUDENT PROFILE",
        profile_summary,
        "",
        "### GENERATION PARAMETERS",
        f"- Intent: {request.generation_intent}",
        f"- Required Candidate Node Count: EXACTLY {request.candidate_node_count} nodes (Your 'candidate_nodes' array MUST have a length of exactly {request.candidate_node_count}, containing cand_1 to cand_{request.candidate_node_count}).",
        "",
    ]

    # Intent-specific guidance
    if request.generation_intent == "continue":
        user_lines.extend(
            [
                "### INTENT OBJECTIVE: FORWARD PROGRESSION (CONTINUE ROUTE)",
                "- Generate the next sequential chronological stages progressing forward along the selected path.",
                "- Connect candidates to the next logical education milestones, practical training, or career outcomes.",
                "- Prefer 'progression' edges for direct chronological sequence.",
                "",
            ]
        )
    elif request.generation_intent == "explore_alternatives":
        user_lines.extend(
            [
                "### INTENT OBJECTIVE: EXPLORE ALTERNATIVE PATHWAYS (BRANCHING ROUTES)",
                "- Generate genuinely different parallel routes, distinct stream choices, or alternative specializations branching from the decision point.",
                "- Provide viable alternatives rather than continuing the same single trajectory.",
                "- Prefer 'alternative' edges originating from the selected node to represent divergent choices.",
                "- Avoid duplicating routes or branches already present in the existing graph.",
                "",
            ]
        )
    elif request.generation_intent == "recover_from_blocked_route":
        user_lines.extend(
            [
                "### INTENT OBJECTIVE: RECOVER FROM BLOCKED ROUTE (DETOURS & ALTERNATE QUALIFICATIONS)",
                "- Generate plausible recovery options, bridge courses, vocational diplomas, or substitute qualifications departing from the selected node.",
                "- Use only the available student and graph context; do not invent unstated reasons why a path is blocked.",
                "- Prefer 'alternative' or 'conditional' edges to provide accessible secondary options.",
                "",
            ]
        )

    if request.current_graph is None:
        user_lines.extend(
            [
                "### GENERATION MODE: INITIAL PATHWAY GENERATION",
                "- Starting from the student's current education stage, generate an initial exploration pathway with branching options across distinct post-Class 10 routes.",
                "- Because this is initial generation, all endpoints in `prerequisite_refs` and `proposed_edges` MUST use `kind: \"candidate\"` referencing candidate IDs within this proposal.",
                "- Do NOT use `kind: \"existing_node\"`.",
            ]
        )
    else:
        existing_nodes_desc = "\n".join(
            f"  * Node ID: `{n.node_id}` | Type: `{n.node_type}` | Title: \"{n.title}\""
            for n in request.current_graph.nodes
        )
        node_titles = {n.node_id: n.title for n in request.current_graph.nodes}
        if request.current_graph.edges:
            existing_edges_desc = "\n".join(
                f"  * Edge: `{e.source_node_id}` (\"{node_titles.get(e.source_node_id, 'Node')}\") "
                f"-[{e.edge_type.upper()}{f' (Condition: {e.condition})' if e.condition else ''}]-> "
                f"`{e.target_node_id}` (\"{node_titles.get(e.target_node_id, 'Node')}\")"
                for e in request.current_graph.edges
            )
        else:
            existing_edges_desc = "  (No existing edges in current graph)"

        target_nodes = [
            n for n in request.current_graph.nodes if n.node_id in request.current_node_ids_to_expand
        ]
        target_nodes_desc = "\n".join(
            f"  * Expansion Target Node: `{n.node_id}` (Title: \"{n.title}\", Type: `{n.node_type}`)\n    Description: {n.description}"
            for n in target_nodes
        )

        user_lines.extend(
            [
                "### GENERATION MODE: GRAPH EXPANSION",
                "Existing Pathway Nodes in Current Graph:",
                existing_nodes_desc,
                "",
                "Existing Connections in Current Graph:",
                existing_edges_desc,
                "",
                "Selected Target Node(s) to Expand:",
                target_nodes_desc,
                "",
                "- You MUST expand from or connect new candidates to the selected target node(s).",
                "- At least one candidate node or proposed edge MUST connect to a target node using `{\"kind\": \"existing_node\", \"node_id\": \"<TARGET_ID>\"}`.",
                "- Candidate nodes in this proposal must be referenced with `{\"kind\": \"candidate\", \"candidate_id\": \"cand_X\"}`.",
                "- Do not invent new node_ids for existing nodes; use their exact existing Node IDs.",
            ]
        )

    user_lines.append("\nReturn ONLY the JSON object conforming to CandidateProposal.")

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n".join(user_lines)},
    ]


def generate_pathway_graph(
    request: GraphGenerationRequest | dict[str, Any],
    client: Any | None = None,
    model: str | None = None,
) -> PathwayGraph:
    """Orchestrate end-to-end pathway graph generation via Groq and graph engine validation.

    Args:
        request: GraphGenerationRequest object or dictionary.
        client: Optional injected Groq client (e.g. mock client for unit testing).
        model: Optional model name override. Defaults to GROQ_MODEL env var or 'llama-3.3-70b-versatile'.

    Returns:
        PathwayGraph: Validated complete pathway graph with permanent IDs.

    Raises:
        GraphValidationError: If request or graph engine validation fails.
        LLMConfigurationError: If Groq credentials/client cannot be initialized.
        LLMProviderError: If the Groq API call fails.
        LLMResponseParsingError: If LLM output cannot be parsed into a valid CandidateProposal.
    """
    if isinstance(request, dict):
        try:
            parsed_request = GraphGenerationRequest.model_validate(request)
        except ValidationError as exc:
            raise GraphValidationError([f"invalid graph generation request: {exc}"]) from exc
    else:
        parsed_request = request

    # Initialize Groq client if not injected
    if client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise LLMConfigurationError(
                "GROQ_API_KEY environment variable is not set and no client was provided"
            )
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
        except Exception as exc:
            raise LLMConfigurationError(f"Failed to initialize Groq client: {exc}") from exc

    resolved_model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    messages = build_generation_prompt(parsed_request)

    # Invoke Groq API
    try:
        response = client.chat.completions.create(
            model=resolved_model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
        )
    except Exception as exc:
        raise LLMProviderError(f"Groq API call failed: {exc}") from exc

    # Parse response content
    try:
        choice = response.choices[0]
        content = choice.message.content
        if not content or not content.strip():
            raise LLMResponseParsingError("Groq returned empty response content")
        raw_json = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMResponseParsingError(f"Groq response is not valid JSON: {exc}") from exc
    except (AttributeError, IndexError) as exc:
        raise LLMResponseParsingError(f"Malformed Groq response structure: {exc}") from exc

    # Validate against CandidateProposal schema
    try:
        proposal = CandidateProposal.model_validate(raw_json)
    except ValidationError as exc:
        raise LLMResponseParsingError(f"Candidate proposal schema validation failed: {exc}") from exc

    # Ingest and atomically validate via graph engine
    return apply_candidate_proposal(parsed_request, proposal)
