# EduPath AI — API Endpoints

## Base URL

**Local development**
```text
http://localhost:8000
```

**Production backend**
```text
https://edupath-ai-backend-9van.onrender.com
```

Interactive API documentation:
- Local: http://localhost:8000/docs
- Production: https://edupath-ai-backend-9van.onrender.com/docs

---

## 1. Health Check

Check whether the backend is running.

**Endpoint**
```http
GET /health
```

**Full URL**
```text
https://edupath-ai-backend-9van.onrender.com/health
```

**Example response**
```json
{
  "status": "ok"
}
```

---

## 2. Create Student Profile

Save a new student profile to the SQL database.

**Endpoint**
```http
POST /api/profiles
```

**Headers**
```http
Content-Type: application/json
```

**Request body**
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
    }
  ],
  "overall_percentage": 85,
  "overall_result_status": "completed",
  "interests": [
    "technology_coding",
    "mathematics_logic"
  ],
  "strengths": [
    {
      "name": "logical_problem_solving",
      "rating": 4,
      "rating_status": "rated"
    }
  ],
  "interest_description": "I enjoy mathematics and technology.",
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
    "career_opportunities"
  ],
  "career_certainty": "exploring"
}
```

**Success response:** `201 Created`

The response includes the saved profile, its database ID, and timestamps.

---

## 3. Get All Student Profiles

Retrieve a list of saved profiles.

**Endpoint**
```http
GET /api/profiles
```

**Optional query parameters**
- `skip`: Number of profiles to skip; defaults to `0`.
- `limit`: Maximum profiles to return; defaults to `50`, capped at `100`.

**Example**
```http
GET /api/profiles?skip=0&limit=10
```

**Success response:** `200 OK`

Returns an array of student profiles.

---

## 4. Get Student Profile by ID

Retrieve a specific student profile.

**Endpoint**
```http
GET /api/profiles/{profile_id}
```

**Example**
```http
GET /api/profiles/1
```

**Success response:** `200 OK`

**If the profile does not exist:** `404 Not Found`

```json
{
  "detail": "Student profile not found"
}
```

---

## 5. Update Student Profile

Replace the stored profile with the submitted profile data.

**Endpoint**
```http
PUT /api/profiles/{profile_id}
```

**Example**
```http
PUT /api/profiles/1
```

Send the complete profile JSON in the request body, using the same schema as **Create Student Profile**.

**Success response:** `200 OK`

**If the profile does not exist:** `404 Not Found`

---

## 6. Delete Student Profile

Delete a profile and its associated subjects, interests, strengths, and priorities.

**Endpoint**
```http
DELETE /api/profiles/{profile_id}
```

**Example**
```http
DELETE /api/profiles/1
```

**Success response:** `204 No Content`

**If the profile does not exist:** `404 Not Found`

---

## 7. Existing AI Pathway Endpoints

These endpoints belong to the existing EduPath AI pathway-generation backend. Keep them registered when integrating the profile database.

### Generate Education Pathways

```http
POST /api/pathways
```

Generates education-to-career pathway suggestions using the student information accepted by the existing backend.

### Simulate a What-If Scenario

```http
POST /api/scenarios
```

Generates alternative pathway analysis for a student scenario.

**Note:** Refer to the existing backend's request models and `/docs` for the exact request and response schemas of these AI endpoints.

---

## Validation Rules

The profile API validates submitted data, including:

- Subject marks cannot exceed maximum marks.
- Overall percentage must be between `0` and `100`.
- Strength ratings must be between `1` and `5`.
- Currency must use a three-letter uppercase code, such as `INR`.
- Duplicate interests and priorities are rejected.
- Duplicate subject names and strength names are rejected.
- Fields not defined in the request schema are rejected.

Invalid request data returns `422 Unprocessable Entity`.

---

## Frontend Integration Example

```typescript
const API_BASE = import.meta.env.VITE_API_BASE;

export async function createStudentProfile(
  studentProfile: unknown
) {
  const response = await fetch(
    `${API_BASE}/api/profiles`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(studentProfile)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Profile request failed: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}
```

Configure the frontend environment variable:

```env
VITE_API_BASE=https://edupath-ai-backend-9van.onrender.com
```

Restart the local Vite server or redeploy the frontend after changing environment variables.

---

## Important Security Notes

- Never expose the Groq API key in frontend code.
- Keep database credentials in backend environment variables.
- Add authentication and authorization before exposing student profile records publicly.
- Verify scholarship, admission, tuition, and loan information with official sources.
- Use database migrations when changing the production schema.

---

**Project:** EduPath AI — Career Path Simulator  
**Technology:** React, FastAPI, SQLAlchemy, PostgreSQL/SQLite, Groq AI