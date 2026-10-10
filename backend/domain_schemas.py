from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator, model_validator

from schemas import StudentProfileCreate, StudentProfileOut

MAX_GRAPH_NODES = 500
MAX_GRAPH_EDGES = 1000
MAX_CANDIDATE_NODES = 25
MAX_PROPOSED_EDGES = 50
MAX_EXPANSION_NODE_IDS = 50
ReferenceId = Annotated[str, Field(min_length=1, max_length=128)]

NodeType = Literal["education", "career", "exploration", "certification"]
EdgeType = Literal["progression", "alternative", "conditional", "dependency", "prerequisite"]

VALID_NODE_TYPES = frozenset({"education", "career", "exploration", "certification"})
VALID_EDGE_TYPES = frozenset({"progression", "alternative", "conditional", "dependency", "prerequisite"})


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Node(StrictModel):
    node_id: str = Field(min_length=1, max_length=128)
    node_type: NodeType
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    duration_estimate_months: FiniteFloat | None = Field(default=None, ge=0)
    cost_estimate: FiniteFloat | None = Field(default=None, ge=0)
    cost_currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    milestone_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    institution_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    evidence_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    prerequisite_node_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)

    @field_validator("node_type", mode="before")
    @classmethod
    def normalize_node_type(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().casefold()
        return value

    @model_validator(mode="after")
    def validate_cost_currency(self):
        if self.cost_estimate is not None and self.cost_currency is None:
            raise ValueError("cost_currency is required when cost_estimate is provided")
        if self.cost_estimate is None and self.cost_currency is not None:
            raise ValueError("cost_currency requires a cost_estimate")
        return self


class Edge(StrictModel):
    edge_id: str = Field(min_length=1, max_length=128)
    source_node_id: str = Field(min_length=1, max_length=128)
    target_node_id: str = Field(min_length=1, max_length=128)
    edge_type: EdgeType
    condition: str | None = Field(default=None, max_length=1000)

    @field_validator("edge_type", mode="before")
    @classmethod
    def normalize_edge_type(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().casefold()
        return value

    @model_validator(mode="after")
    def validate_condition(self):
        if self.edge_type == "conditional":
            if self.condition is None or not self.condition.strip():
                raise ValueError("condition must be a non-empty string when edge_type is 'conditional'")
        else:
            if self.condition is not None:
                raise ValueError(
                    f"condition is only allowed when edge_type is 'conditional', but got edge_type '{self.edge_type}'"
                )
        return self


class PathwayGraph(StrictModel):
    pathway_id: str = Field(min_length=1, max_length=128)
    nodes: list[Node] = Field(max_length=MAX_GRAPH_NODES)
    edges: list[Edge] = Field(max_length=MAX_GRAPH_EDGES)
    target_outcome: str | None = Field(default=None, max_length=1000)
    schema_version: str = Field(default="1.0", min_length=1, max_length=32)


class GraphGenerationRequest(StrictModel):
    student_profile_snapshot: StudentProfileCreate | StudentProfileOut
    current_graph: PathwayGraph | None = None
    current_node_ids_to_expand: list[str] = Field(default_factory=list, max_length=MAX_EXPANSION_NODE_IDS)
    candidate_node_count: int = Field(ge=1, le=MAX_CANDIDATE_NODES)
    generation_intent: Literal["continue", "explore_alternatives", "recover_from_blocked_route"]

    @model_validator(mode="after")
    def validate_expansion_nodes(self):
        if len(self.current_node_ids_to_expand) != len(set(self.current_node_ids_to_expand)):
            raise ValueError("current_node_ids_to_expand must not contain duplicates")
        if self.current_graph is None:
            if self.current_node_ids_to_expand:
                raise ValueError("current_node_ids_to_expand requires current_graph")
            return self

        from graph_engine import validate_graph

        validate_graph(self.current_graph)
        if not self.current_node_ids_to_expand:
            raise ValueError("current_node_ids_to_expand must contain at least one node ID when current_graph is provided")
        graph_node_ids = {node.node_id for node in self.current_graph.nodes}
        missing_ids = sorted(set(self.current_node_ids_to_expand) - graph_node_ids)
        if missing_ids:
            raise ValueError(f"current_node_ids_to_expand references missing nodes: {missing_ids}")
        return self


class NodeEndpointRef(StrictModel):
    kind: Literal["existing_node", "candidate"]
    node_id: str | None = Field(default=None, min_length=1, max_length=128)
    candidate_id: str | None = Field(default=None, min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_reference(self):
        if self.kind == "existing_node":
            if self.node_id is None or self.candidate_id is not None:
                raise ValueError("existing_node reference requires 'node_id' and forbids 'candidate_id'")
        elif self.kind == "candidate":
            if self.candidate_id is None or self.node_id is not None:
                raise ValueError("candidate reference requires 'candidate_id' and forbids 'node_id'")
        return self

    @property
    def target_id(self) -> str:
        return self.node_id if self.kind == "existing_node" else self.candidate_id  # type: ignore[return-value]

    @classmethod
    def existing(cls, node_id: str) -> "NodeEndpointRef":
        return cls(kind="existing_node", node_id=node_id)

    @classmethod
    def candidate(cls, candidate_id: str) -> "NodeEndpointRef":
        return cls(kind="candidate", candidate_id=candidate_id)


CandidatePrerequisiteRef = NodeEndpointRef


class CandidateNode(StrictModel):
    candidate_id: str = Field(min_length=1, max_length=128)
    node_type: NodeType
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    duration_estimate_months: FiniteFloat | None = Field(default=None, ge=0)
    cost_estimate: FiniteFloat | None = Field(default=None, ge=0)
    cost_currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    milestone_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    institution_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    evidence_ids: list[ReferenceId] = Field(default_factory=list, max_length=100)
    prerequisite_refs: list[NodeEndpointRef] = Field(default_factory=list, max_length=100)

    @field_validator("node_type", mode="before")
    @classmethod
    def normalize_node_type(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().casefold()
        return value

    @model_validator(mode="after")
    def validate_cost_currency(self):
        if self.cost_estimate is not None and self.cost_currency is None:
            raise ValueError("cost_currency is required when cost_estimate is provided")
        if self.cost_estimate is None and self.cost_currency is not None:
            raise ValueError("cost_currency requires a cost_estimate")
        return self

    @model_validator(mode="after")
    def validate_unverified_metadata_ids(self):
        if self.milestone_ids:
            raise ValueError("milestone_ids cannot be verified against trusted data and must be empty")
        if self.institution_ids:
            raise ValueError("institution_ids cannot be verified against trusted data and must be empty")
        if self.evidence_ids:
            raise ValueError("evidence_ids cannot be verified against trusted data and must be empty")
        return self


class ProposedEdge(StrictModel):
    edge_key: str = Field(min_length=1, max_length=128)
    source: NodeEndpointRef
    target: NodeEndpointRef
    edge_type: EdgeType
    condition: str | None = Field(default=None, max_length=1000)

    @field_validator("edge_type", mode="before")
    @classmethod
    def normalize_edge_type(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().casefold()
        return value

    @model_validator(mode="after")
    def validate_condition(self):
        if self.edge_type == "conditional":
            if self.condition is None or not self.condition.strip():
                raise ValueError("condition must be a non-empty string when edge_type is 'conditional'")
        else:
            if self.condition is not None:
                raise ValueError(
                    f"condition is only allowed when edge_type is 'conditional', but got edge_type '{self.edge_type}'"
                )
        return self


class CandidateProposal(StrictModel):
    candidate_nodes: list[CandidateNode] = Field(max_length=MAX_CANDIDATE_NODES)
    proposed_edges: list[ProposedEdge] = Field(default_factory=list, max_length=MAX_PROPOSED_EDGES)


GraphProposalOutput = CandidateProposal