"""EduPath-AI Phase 1 Graph Playground.

A minimal temporary Streamlit frontend for manually testing Phase 1 (Graph Creation):
- Initial roadmap generation from student profile
- Forward continuation / expansion from a selected node
- Alternative pathway exploration branching from a selected node
- Interactive Graphviz roadmap visualization and structural graph inspection
"""

import os
from pathlib import Path
import sys

# Ensure backend modules can be imported
backend_path = Path(__file__).resolve().parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv

load_dotenv()
load_dotenv(backend_path / ".env")

import streamlit as st

from domain_schemas import GraphGenerationRequest, PathwayGraph
from generator_service import (
    GraphGenerationError,
    LLMConfigurationError,
    LLMProviderError,
    LLMResponseParsingError,
    generate_pathway_graph,
)
from graph_engine import GraphValidationError
from schemas import (
    AnnualBudgetIn,
    FundingPreferencesIn,
    Interest,
    Priority,
    StrengthIn,
    StrengthName,
    StudentProfileCreate,
    SubjectIn,
)

# Page configuration
st.set_page_config(
    page_title="EduPath AI - Phase 1 Graph Playground",
    page_icon="🗺️",
    layout="wide",
)

# Initialize Session State
if "current_graph" not in st.session_state:
    st.session_state.current_graph = None
if "last_action" not in st.session_state:
    st.session_state.last_action = None


def render_dot_graph(graph: PathwayGraph) -> str:
    """Build a Graphviz DOT representation of the pathway graph."""
    lines = [
        "digraph PathwayRoadmap {",
        "  rankdir=LR;",
        '  graph [bgcolor="transparent", ranksep="1.0", nodesep="0.5"];',
        '  node [shape="box", style="rounded,filled", fontname="Helvetica", fontsize=11, margin="0.25,0.15"];',
        '  edge [fontname="Helvetica", fontsize=9];',
    ]

    type_styles = {
        "education": ('fillcolor="#E0F2FE"', 'color="#0284C7"'),
        "career": ('fillcolor="#DCFCE7"', 'color="#16A34A"'),
        "exploration": ('fillcolor="#F3E8FF"', 'color="#9333EA"'),
        "certification": ('fillcolor="#FEF3C7"', 'color="#D97706"'),
    }

    edge_styles = {
        "progression": ('color="#0284C7"', 'style="solid"', '2.0'),
        "alternative": ('color="#9333EA"', 'style="dashed"', '1.8'),
        "conditional": ('color="#D97706"', 'style="dashed"', '1.8'),
        "prerequisite": ('color="#475569"', 'style="solid"', '1.5'),
        "dependency": ('color="#64748B"', 'style="dotted"', '1.5'),
    }

    for node in graph.nodes:
        fill, stroke = type_styles.get(node.node_type, ('fillcolor="#F1F5F9"', 'color="#64748B"'))
        cost_str = (
            f"\\nCost: {node.cost_currency or ''} {int(node.cost_estimate):,}"
            if node.cost_estimate is not None
            else ""
        )
        dur_str = (
            f"\\nDuration: {int(node.duration_estimate_months)}m"
            if node.duration_estimate_months is not None
            else ""
        )
        clean_title = node.title.replace('"', '\\"')
        label = f"{clean_title}\\n[{node.node_type.upper()}]{dur_str}{cost_str}"
        lines.append(f'  "{node.node_id}" [label="{label}", {fill}, {stroke}];')

    for edge in graph.edges:
        color, style, width = edge_styles.get(edge.edge_type, ('color="#64748B"', 'style="solid"', '1.0'))
        label = edge.edge_type
        if edge.condition:
            clean_cond = edge.condition.replace('"', '\\"')
            label = f"{edge.edge_type}\\n({clean_cond})"
        lines.append(
            f'  "{edge.source_node_id}" -> "{edge.target_node_id}" '
            f'[label="{label}", {color}, {style}, penwidth={width}];'
        )

    lines.append("}")
    return "\n".join(lines)


# Header & Description
st.title("🗺️ EduPath AI - Phase 1 Graph Playground")
st.markdown(
    "Temporary interactive playground for manually testing **Phase 1 (Graph Creation)**. "
    "Calls the existing `generator_service.py` and `graph_engine.py` pipeline."
)

# Sidebar: Student Profile Details
with st.sidebar:
    st.header("👤 Student Profile Details")
    st.caption("Sensible defaults for a Class 10 student exploring options in India.")

    with st.expander("🎓 Demographics & Status", expanded=True):
        education_stage = "class10"
        st.text_input("Education Stage", value="Class 10", disabled=True)
        preferred_name = st.text_input("Student Name", value="Aarav")
        country = st.text_input("Country", value="India")
        region = st.text_input("State / Region", value="Maharashtra")
        curriculum = st.selectbox("Curriculum", ["CBSE", "ICSE", "State Board", "Other"], index=0)
        academic_status = st.selectbox(
            "Academic Status", ["completed", "currently_studying", "awaiting_results"], index=0
        )
        preferred_language = st.text_input("Preferred Language", value="English")

    with st.expander("💡 Interests & Goals", expanded=True):
        all_interests: list[Interest] = [
            "technology_coding",
            "mathematics_logic",
            "science_discovery",
            "biology_healthcare",
            "business_finance",
            "creativity_design",
            "social_sciences_communication",
            "environment_sustainability",
            "practical_technical_work",
            "helping_people",
            "sports_physical_activities",
            "exploring_new_ideas",
            "still_exploring",
        ]
        selected_interests = st.multiselect(
            "Interests",
            options=all_interests,
            default=["technology_coding", "mathematics_logic"],
        )
        interest_desc = st.text_area(
            "Interest Description",
            value="Interested in computers, technology, and problem-solving, exploring options after Class 10.",
            height=80,
        )
        career_certainty = st.selectbox(
            "Career Certainty",
            options=["exploring", "few_ideas", "specific_career"],
            index=0,
            help="Class 10 exploration default is 'exploring'.",
        )
        all_priorities: list[Priority] = [
            "career_opportunities",
            "interest_in_subject",
            "stability",
            "affordability",
            "creativity",
            "flexibility",
            "social_impact",
        ]
        selected_priorities = st.multiselect(
            "Priorities",
            options=all_priorities,
            default=["career_opportunities", "interest_in_subject"],
        )
        preferred_dest = st.selectbox("Preferred Destination", ["india", "abroad", "both", "undecided"], index=0)

    with st.expander("💰 Budget & Funding", expanded=False):
        budget_amount = st.number_input(
            "Annual Budget (INR)", min_value=0.0, value=150000.0, step=10000.0
        )
        budget_status = st.selectbox("Budget Status", ["estimated", "fixed", "not_sure"], index=0)
        scholarships = st.checkbox("Interested in Scholarships", value=True)
        loans = st.checkbox("Willing to Consider Loans", value=False)

    with st.expander("📊 Academic Records & Strengths", expanded=False):
        overall_pct = st.number_input("Overall Percentage", min_value=0.0, max_value=100.0, value=85.0, step=0.5)
        overall_status = st.selectbox("Result Status", ["completed", "predicted", "awaited", "unavailable"], index=0)
        st.write("Default subjects: Mathematics (85%), Science (88%), English (82%)")
        st.write("Top Strength: Logical Problem Solving (5/5)")

    with st.expander("⚙️ Generation Parameters", expanded=False):
        candidate_count = st.slider("Candidate Nodes per Call", min_value=1, max_value=5, value=3)
        model_override = st.text_input(
            "Groq Model (leave blank for default)",
            value=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        )

# Construct validated student profile from inputs
student_profile = StudentProfileCreate(
    education_stage=education_stage,
    preferred_name=preferred_name or None,
    country=country,
    region=region or None,
    curriculum=curriculum,
    academic_status=academic_status,
    preferred_language=preferred_language or None,
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
            marks=88,
            maximum_marks=100,
            result_status="completed",
            favourite=True,
            challenging=False,
        ),
        SubjectIn(
            name="English",
            marks=82,
            maximum_marks=100,
            result_status="completed",
            favourite=False,
            challenging=False,
        ),
    ],
    overall_percentage=overall_pct,
    overall_result_status=overall_status,
    interests=selected_interests if selected_interests else ["technology_coding"],
    strengths=[
        StrengthIn(
            name="logical_problem_solving",
            rating=5,
            rating_status="rated",
        )
    ],
    interest_description=interest_desc,
    annual_budget=AnnualBudgetIn(
        currency="INR",
        amount=budget_amount,
        budget_status=budget_status,
    ),
    funding_preferences=FundingPreferencesIn(
        interested_in_scholarships=scholarships,
        willing_to_consider_loans=loans,
    ),
    preferred_destination=preferred_dest,
    priorities=selected_priorities if selected_priorities else ["career_opportunities"],
    career_certainty=career_certainty,
)

# Main Actions Section
st.subheader("⚡ Graph Actions")
action_col1, action_col2, action_col3 = st.columns([1.5, 2, 1])

with action_col1:
    generate_clicked = st.button("🚀 Generate Roadmap", type="primary", use_container_width=True)

with action_col3:
    if st.button("🔄 Reset Graph", use_container_width=True):
        st.session_state.current_graph = None
        st.session_state.last_action = None
        st.rerun()

# Handle Initial Generation
if generate_clicked:
    with st.spinner("Calling Groq LLM & Graph Engine to generate initial roadmap..."):
        try:
            req = GraphGenerationRequest(
                student_profile_snapshot=student_profile,
                current_graph=None,
                current_node_ids_to_expand=[],
                candidate_node_count=candidate_count,
                generation_intent="explore_alternatives",
            )
            model_arg = model_override.strip() if model_override.strip() else None
            new_graph = generate_pathway_graph(req, model=model_arg)
            st.session_state.current_graph = new_graph
            st.session_state.last_action = "Initial roadmap generated successfully."
            st.success("✅ Initial roadmap generated successfully!")
        except LLMConfigurationError as exc:
            st.error(f"❌ LLM Configuration Error: {exc}")
        except LLMProviderError as exc:
            st.error(f"❌ LLM Provider / Groq Error: {exc}")
        except LLMResponseParsingError as exc:
            st.error(f"❌ LLM Output Parsing Error: {exc}")
        except GraphValidationError as exc:
            st.error(f"❌ Graph Engine Validation Error: {exc}")
        except Exception as exc:
            st.error(f"❌ Unexpected Error: {exc}")

current_graph: PathwayGraph | None = st.session_state.current_graph

# Node Selection & Expansion / Alternative Section
if current_graph is not None and current_graph.nodes:
    st.markdown("---")
    st.subheader("🌿 Expand & Explore Pathways")

    nodes_by_id = {node.node_id: node for node in current_graph.nodes}
    node_labels = {
        node.node_id: f"[{node.node_type.upper()}] {node.title} (ID: {node.node_id[:8]}...)"
        for node in current_graph.nodes
    }

    exp_col1, exp_col2, exp_col3 = st.columns([2, 1, 1])

    with exp_col1:
        selected_node_id = st.selectbox(
            "Select a Node to branch from:",
            options=list(node_labels.keys()),
            format_func=lambda nid: node_labels[nid],
        )

    with exp_col2:
        expand_clicked = st.button("🌱 Expand Selected Node", use_container_width=True)
    with exp_col3:
        alt_clicked = st.button("🔀 Explore Alternatives", use_container_width=True)

    # Handle Expand Selected Node (Continuation Flow)
    if expand_clicked:
        with st.spinner(f"Expanding forward from '{nodes_by_id[selected_node_id].title}'..."):
            try:
                req = GraphGenerationRequest(
                    student_profile_snapshot=student_profile,
                    current_graph=current_graph,
                    current_node_ids_to_expand=[selected_node_id],
                    candidate_node_count=min(candidate_count, 3),
                    generation_intent="continue",
                )
                model_arg = model_override.strip() if model_override.strip() else None
                updated_graph = generate_pathway_graph(req, model=model_arg)
                st.session_state.current_graph = updated_graph
                st.session_state.last_action = (
                    f"Expanded node '{nodes_by_id[selected_node_id].title}' (intent: continue)."
                )
                st.success("✅ Node expanded forward successfully! Existing graph preserved.")
                st.rerun()
            except LLMConfigurationError as exc:
                st.error(f"❌ LLM Configuration Error: {exc}")
            except LLMProviderError as exc:
                st.error(f"❌ LLM Provider / Groq Error: {exc}")
            except LLMResponseParsingError as exc:
                st.error(f"❌ LLM Output Parsing Error: {exc}")
            except GraphValidationError as exc:
                st.error(f"❌ Graph Engine Validation Error: {exc}")
            except Exception as exc:
                st.error(f"❌ Unexpected Error: {exc}")

    # Handle Explore Alternatives Flow
    if alt_clicked:
        with st.spinner(f"Exploring alternative branches from '{nodes_by_id[selected_node_id].title}'..."):
            try:
                req = GraphGenerationRequest(
                    student_profile_snapshot=student_profile,
                    current_graph=current_graph,
                    current_node_ids_to_expand=[selected_node_id],
                    candidate_node_count=min(candidate_count, 3),
                    generation_intent="explore_alternatives",
                )
                model_arg = model_override.strip() if model_override.strip() else None
                updated_graph = generate_pathway_graph(req, model=model_arg)
                st.session_state.current_graph = updated_graph
                st.session_state.last_action = (
                    f"Generated alternatives from '{nodes_by_id[selected_node_id].title}'."
                )
                st.success("✅ Alternative branches generated successfully! Existing graph preserved.")
                st.rerun()
            except LLMConfigurationError as exc:
                st.error(f"❌ LLM Configuration Error: {exc}")
            except LLMProviderError as exc:
                st.error(f"❌ LLM Provider / Groq Error: {exc}")
            except LLMResponseParsingError as exc:
                st.error(f"❌ LLM Output Parsing Error: {exc}")
            except GraphValidationError as exc:
                st.error(f"❌ Graph Engine Validation Error: {exc}")
            except Exception as exc:
                st.error(f"❌ Unexpected Error: {exc}")

# Display Graph Section
if current_graph is not None:
    st.markdown("---")
    st.subheader("📊 Pathway Roadmap Visualization")

    # Metrics
    mcol1, mcol2, mcol3 = st.columns(3)
    mcol1.metric("Total Nodes", len(current_graph.nodes))
    mcol2.metric("Total Edges", len(current_graph.edges))
    mcol3.metric("Pathway ID", current_graph.pathway_id[:16] + "...")

    if st.session_state.last_action:
        st.info(f"ℹ️ Last Event: {st.session_state.last_action}")

    # Visual Graph Rendering (Graphviz with fallback)
    try:
        dot_code = render_dot_graph(current_graph)
        st.graphviz_chart(dot_code, width="stretch")
    except Exception as gv_err:
        st.warning(
            f"Graphviz visual rendering unavailable ({gv_err}). "
            "Falling back to structured node and edge tables below."
        )

    # Detailed Node and Edge Data Display
    tab_nodes, tab_edges, tab_json = st.tabs(["📌 Nodes", "🔗 Edges", "📄 Raw Graph JSON"])

    with tab_nodes:
        node_records = []
        for n in current_graph.nodes:
            node_records.append(
                {
                    "Node ID": n.node_id,
                    "Title": n.title,
                    "Type": n.node_type.upper(),
                    "Duration (Months)": n.duration_estimate_months if n.duration_estimate_months is not None else "N/A",
                    "Cost": f"{n.cost_currency or ''} {int(n.cost_estimate):,}" if n.cost_estimate is not None else "N/A",
                    "Prerequisites": ", ".join(n.prerequisite_node_ids) if n.prerequisite_node_ids else "None",
                    "Description": n.description,
                }
            )
        st.dataframe(node_records, use_container_width=True)

    with tab_edges:
        if current_graph.edges:
            nodes_map = {n.node_id: n.title for n in current_graph.nodes}
            edge_records = []
            for e in current_graph.edges:
                edge_records.append(
                    {
                        "Edge ID": e.edge_id,
                        "Source Node ID": e.source_node_id,
                        "Source Title": nodes_map.get(e.source_node_id, "Unknown"),
                        "Edge Type": e.edge_type.upper(),
                        "Target Node ID": e.target_node_id,
                        "Target Title": nodes_map.get(e.target_node_id, "Unknown"),
                        "Condition": e.condition or "None",
                    }
                )
            st.dataframe(edge_records, use_container_width=True)
        else:
            st.info("No edges in the current graph.")

    with tab_json:
        st.json(current_graph.model_dump())

else:
    st.info("💡 Click **'🚀 Generate Roadmap'** above to generate an initial pathway graph.")
