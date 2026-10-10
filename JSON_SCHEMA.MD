    
# EduPath — Student Profile JSON Schema

## 1. Overview

This schema defines the student profile collected by EduPath.

The current scope is limited to students who are studying in Class 10, have completed Class 10, or are awaiting their Class 10 results.

The profile contains:
- Basic student information
- Academic background and subjects
- Interests and self-reported strengths
- Written description of interests
- Budget and funding preferences
- Study destination and personal priorities
- Career certainty

The `interest_description` field preserves the student's own words and must not be silently rewritten or replaced by AI-generated content.

## 2. Example Student Profile

```json
{
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
      "marks": 85,
      "maximum_marks": 100,
      "result_status": "completed",
      "favourite": true,
      "challenging": false
    },
    {
      "name": "Science",
      "marks": 91,
      "maximum_marks": 100,
      "result_status": "completed",
      "favourite": true,
      "challenging": false
    },
    {
      "name": "English",
      "marks": null,
      "maximum_marks": 100,
      "result_status": "awaited",
      "favourite": false,
      "challenging": false
    }
  ],
  "overall_percentage": null,
  "overall_result_status": "awaited",
  "interests": [
    "technology_coding",
    "mathematics_logic",
    "science_discovery"
  ],
  "strengths": [
    {
      "name": "logical_problem_solving",
      "rating": 4,
      "rating_status": "rated"
    },
    {
      "name": "creativity",
      "rating": null,
      "rating_status": "not_sure"
    }
  ],
  "interest_description": "I enjoy solving mathematical problems and exploring how technology works. I like experimenting with computers and creating projects that solve real-world problems.",
  "annual_budget": {
    "currency": "INR",
    "amount": 150000,
    "budget_status": "estimated"
  },
  "funding_preferences": {
    "interested_in_scholarships": true,
    "willing_to_consider_loans": false
  },
  "preferred_destination": "india",
  "priorities": [
    "affordability",
    "interest_in_subject",
    "career_opportunities"
  ],
  "career_certainty": "exploring",
  "created_at": "2026-10-10T10:00:00Z",
  "updated_at": "2026-10-10T10:00:00Z"
}
```

The values above are illustrative. In particular, missing marks are represented by `null`, not zero.

## 3. JSON Schema Definition

The following uses JSON Schema Draft 2020-12.

Save this definition separately as `student-profile.schema.json` if you want to validate student profile objects programmatically.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EduPath Class 10 Student Profile",
  "description": "Student profile for exploring education options after Class 10.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "education_stage",
    "country",
    "curriculum",
    "academic_status",
    "subjects",
    "interests",
    "strengths",
    "interest_description",
    "annual_budget",
    "funding_preferences",
    "preferred_destination",
    "priorities",
    "career_certainty"
  ],
  "properties": {
    "education_stage": {
      "type": "string",
      "const": "class10",
      "description": "Fixed internally for the current project scope."
    },
    "preferred_name": {
      "type": ["string", "null"],
      "maxLength": 80
    },
    "country": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "region": {
      "type": ["string", "null"],
      "maxLength": 100
    },
    "curriculum": {
      "type": "string",
      "enum": ["CBSE", "ICSE", "State Board", "Other"]
    },
    "academic_status": {
      "type": "string",
      "enum": [
        "currently_studying",
        "completed",
        "awaiting_results"
      ]
    },
    "preferred_language": {
      "type": ["string", "null"],
      "maxLength": 50
    },
    "subjects": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "marks",
          "maximum_marks",
          "result_status",
          "favourite",
          "challenging"
        ],
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          },
          "marks": {
            "type": ["number", "null"],
            "minimum": 0
          },
          "maximum_marks": {
            "type": ["number", "null"],
            "exclusiveMinimum": 0
          },
          "result_status": {
            "type": "string",
            "enum": [
              "completed",
              "predicted",
              "awaited",
              "unavailable"
            ]
          },
          "favourite": {
            "type": "boolean"
          },
          "challenging": {
            "type": "boolean"
          }
        }
      }
    },
    "overall_percentage": {
      "type": ["number", "null"],
      "minimum": 0,
      "maximum": 100
    },
    "overall_result_status": {
      "type": "string",
      "enum": [
        "completed",
        "predicted",
        "awaited",
        "unavailable"
      ]
    },
    "interests": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
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
          "still_exploring"
        ]
      }
    },
    "strengths": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "rating",
          "rating_status"
        ],
        "properties": {
          "name": {
            "type": "string",
            "enum": [
              "logical_problem_solving",
              "numerical_reasoning",
              "creativity",
              "communication",
              "teamwork",
              "attention_to_detail",
              "practical_problem_solving",
              "curiosity_independent_learning"
            ]
          },
          "rating": {
            "type": ["integer", "null"],
            "minimum": 1,
            "maximum": 5
          },
          "rating_status": {
            "type": "string",
            "enum": [
              "rated",
              "not_sure"
            ]
          }
        }
      }
    },
    "interest_description": {
      "type": "string",
      "maxLength": 1000,
      "description": "The student's own description of their interests, hobbies, favourite activities and problems they would like to solve."
    },
    "annual_budget": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "currency",
        "amount",
        "budget_status"
      ],
      "properties": {
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        },
        "amount": {
          "type": ["number", "null"],
          "minimum": 0
        },
        "budget_status": {
          "type": "string",
          "enum": [
            "estimated",
            "fixed",
            "not_sure"
          ]
        }
      }
    },
    "funding_preferences": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "interested_in_scholarships",
        "willing_to_consider_loans"
      ],
      "properties": {
        "interested_in_scholarships": {
          "type": "boolean"
        },
        "willing_to_consider_loans": {
          "type": "boolean"
        }
      }
    },
    "preferred_destination": {
      "type": "string",
      "enum": [
        "india",
        "abroad",
        "both",
        "undecided"
      ]
    },
    "priorities": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "affordability",
          "interest_in_subject",
          "career_opportunities",
          "stability",
          "creativity",
          "flexibility",
          "social_impact"
        ]
      }
    },
    "career_certainty": {
      "type": "string",
      "enum": [
        "specific_career",
        "few_ideas",
        "exploring"
      ]
    },
    "created_at": {
      "type": ["string", "null"],
      "format": "date-time"
    },
    "updated_at": {
      "type": ["string", "null"],
      "format": "date-time"
    }
  }
}
```

## 4. Important Validation Rules

Implement these checks in your frontend and backend:

1. `education_stage` must always be `class10`.
2. Subject marks must not exceed the maximum marks when both values are available.
3. Missing marks must remain `null`; do not convert them to zero.
4. If a strength rating is `null`, its status should be `not_sure`.
5. If `budget_status` is `not_sure`, `amount` should be `null`.
6. The `interest_description` field must preserve the student's original wording.
7. Interest and priority selections must not contain duplicate values.
8. The backend must validate incoming data before saving it.

JSON Schema alone does not enforce every cross-field rule. Implement rules 2, 4, and 5 using additional validation logic in TypeScript or FastAPI.

## 5. Suggested File Structure

```text
project/
├── frontend/
│   └── src/
│       ├── types/
│       │   └── studentProfile.ts
│       ├── services/
│       │   └── profileService.ts
│       └── pages/
│           ├── LandingPage.tsx
│           ├── OnboardingPage.tsx
│           └── FutureProfilePage.tsx
├── backend/
│   ├── schemas/
│   │   └── student_profile.py
│   └── main.py
└── docs/
    └── json-schema.md
```

Use `json-schema.md` for documentation, `student-profile.schema.json` for machine-readable JSON Schema validation, and a TypeScript interface or Pydantic model for application-level validation.

---

## 6. Graph Engine & Generation Schemas (Phase 1A & Phase 1B)

The backend implements strict schemas for pathway graph representation, generation requests, and AI-generated candidate proposals in `backend/domain_schemas.py` and validates/ingests them via `backend/graph_engine.py`.

### 6.1 Graph Representation Models

#### `Node`
Represents an ingested, permanent milestone or stage in a student's pathway graph.
```json
{
  "node_id": "string (1-128 chars, unique)",
  "node_type": "string (1-64 chars, e.g. 'education', 'career', 'certification')",
  "title": "string (1-200 chars)",
  "description": "string (1-4000 chars)",
  "duration_estimate_months": "number | null (finite, >= 0)",
  "cost_estimate": "number | null (finite, >= 0)",
  "cost_currency": "string | null (ISO 4217 3-letter code, e.g. 'INR')",
  "milestone_ids": ["string (reference id)"],
  "institution_ids": ["string (reference id)"],
  "evidence_ids": ["string (reference id)"],
  "prerequisite_node_ids": ["string (node_id)"]
}
```
- When `cost_estimate` is provided, `cost_currency` is required; `cost_currency` requires `cost_estimate`.

#### `Edge`
Represents a directed transition or dependency between permanent nodes.
```json
{
  "edge_id": "string (1-128 chars, unique)",
  "source_node_id": "string (existing node_id)",
  "target_node_id": "string (existing node_id)",
  "edge_type": "string (e.g. 'progression', 'alternative', 'conditional', 'dependency', 'prerequisite')",
  "condition": "string | null (max 1000 chars, required for 'conditional', forbidden otherwise)"
}
```
- **Condition Rule:** Whenever `edge_type` is `"conditional"` (case-insensitive), `condition` is required and must be a non-empty, non-whitespace string (e.g. `'Minimum 75% in Class 10 Science'`). For all other edge types, `condition` must be `null` / omitted.

#### `PathwayGraph`
The container representing a complete pathway graph.
```json
{
  "pathway_id": "string (1-128 chars)",
  "nodes": ["Node objects, max 500"],
  "edges": ["Edge objects, max 1000"],
  "target_outcome": "string | null (max 1000 chars)",
  "schema_version": "string (defaults to '1.0')"
}
```

---

### 6.2 Generation Request Schema (`GraphGenerationRequest`)

Submits student profile context and simulation parameters to the backend generator:
```json
{
  "student_profile_snapshot": { "...": "StudentProfileCreate or StudentProfileOut object" },
  "current_graph": "PathwayGraph | null",
  "current_node_ids_to_expand": ["string (node_ids in current_graph, max 50)"],
  "candidate_node_count": "integer (1 to 25)",
  "generation_intent": "continue | explore_alternatives | recover_from_blocked_route"
}
```

**Validation Rules:**
1. Absence of `current_graph` (`null`) indicates **initial generation**. In this mode, `current_node_ids_to_expand` must be empty.
2. Presence of `current_graph` indicates **pathway expansion**. It requires that:
   - `current_graph` passes structural graph validation.
   - `current_node_ids_to_expand` contains at least one node ID.
   - All IDs in `current_node_ids_to_expand` exist within `current_graph.nodes` without duplicates.
3. `candidate_node_count` specifies the exact number of candidate nodes expected from the proposal (1 to 25).

---

### 6.3 AI Candidate Proposal Contract (Phase 1B)

The generator must return a strict object conforming to `CandidateProposal`:
```json
{
  "candidate_nodes": [
    {
      "candidate_id": "string (1-128 chars, temporary key, unique per proposal)",
      "node_type": "string (1-64 chars)",
      "title": "string (1-200 chars)",
      "description": "string (1-4000 chars)",
      "duration_estimate_months": "number | null (finite, >= 0)",
      "cost_estimate": "number | null (finite, >= 0)",
      "cost_currency": "string | null (3-letter uppercase)",
      "milestone_ids": [],
      "institution_ids": [],
      "evidence_ids": [],
      "prerequisite_refs": [
        {
          "kind": "candidate",
          "candidate_id": "string (temporary candidate_id)"
        },
        {
          "kind": "existing_node",
          "node_id": "string (permanent node_id in current_graph)"
        }
      ]
    }
  ],
  "proposed_edges": [
    {
      "edge_key": "string (1-128 chars, temporary key, unique per proposal)",
      "source": {
        "kind": "existing_node | candidate",
        "node_id": "string (when kind is existing_node)",
        "candidate_id": "string (when kind is candidate)"
      },
      "target": {
        "kind": "existing_node | candidate",
        "node_id": "string (when kind is existing_node)",
        "candidate_id": "string (when kind is candidate)"
      },
      "edge_type": "string (e.g. 'progression', 'alternative', 'conditional', 'dependency', 'prerequisite')",
      "condition": "string | null (max 1000 chars, required for 'conditional', forbidden otherwise)"
    }
  ]
}
```

#### Typed References (`NodeEndpointRef`)
- Endpoints in `proposed_edges` and `prerequisite_refs` must explicitly specify `kind`:
  - `kind: "existing_node"`: Requires `node_id` referencing a node in `current_graph`. `candidate_id` must be omitted.
  - `kind: "candidate"`: Requires `candidate_id` referencing a sibling node in the proposal. `node_id` must be omitted.

#### Validation & Safe Ingestion Rules (`apply_candidate_proposal`)
1. **Exact Count:** `candidate_nodes` length must match `candidate_node_count` exactly.
2. **Key Uniqueness:** All `candidate_id`s and `edge_key`s must be unique within the proposal.
3. **Collision Prevention:** No `candidate_id` may collide with an existing `node_id` in `current_graph`.
4. **Resolution:** Every `candidate_id` and `node_id` reference must resolve to a valid candidate in the proposal or an existing node in `current_graph`. Initial generation proposals cannot reference `existing_node`.
5. **No Self-loops:** Neither edges nor prerequisite lists may connect a node to itself.
6. **Expansion Connectivity:** For expansion requests, at least one proposed edge or candidate prerequisite must connect to a node listed in `current_node_ids_to_expand`. Multi-step branches originating from an expansion node are supported.
7. **Unverified Metadata Rejection:** Until trusted reference catalogs are introduced, non-empty `milestone_ids`, `institution_ids`, or `evidence_ids` are rejected.
8. **Permanent ID Allocation:** The backend allocates permanent UUIDs (`node_<uuid>`, `edge_<uuid>`, `pathway_<uuid>`) and rewrites temporary references. The AI never assigns permanent graph IDs.
9. **Cycle Semantics:** Dependency and prerequisite relations must form a strict directed acyclic graph (DAG) evaluated via Kahn's algorithm. Progression and alternative edges may form cycles.
10. **Atomicity & Immutability:** Any validation failure rejects the entire proposal without modifying `current_graph`. Partial updates are never applied.
11. **Condition Rules:** `condition` is strictly required and must be a non-empty, non-whitespace string whenever `edge_type` is `conditional` (case-insensitive). For all other edge types, `condition` must be omitted (`null`).
