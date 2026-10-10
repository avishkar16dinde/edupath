from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Interest = Literal["technology_coding","mathematics_logic","science_discovery","biology_healthcare","business_finance","creativity_design","social_sciences_communication","environment_sustainability","practical_technical_work","helping_people","sports_physical_activities","exploring_new_ideas","still_exploring"]
StrengthName = Literal["logical_problem_solving","numerical_reasoning","creativity","communication","teamwork","attention_to_detail","practical_problem_solving","curiosity_independent_learning"]
Priority = Literal["affordability","interest_in_subject","career_opportunities","stability","creativity","flexibility","social_impact"]
ResultStatus = Literal["completed","predicted","awaited","unavailable"]

class SubjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    marks: float | None = Field(default=None, ge=0)
    maximum_marks: float | None = Field(default=100, gt=0)
    result_status: ResultStatus
    favourite: bool
    challenging: bool
    @model_validator(mode="after")
    def validate_marks(self):
        if self.marks is not None and self.maximum_marks is not None and self.marks > self.maximum_marks:
            raise ValueError("marks cannot exceed maximum_marks")
        return self

class StrengthIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: StrengthName
    rating: int | None = Field(default=None, ge=1, le=5)
    rating_status: Literal["rated", "not_sure"]
    @model_validator(mode="after")
    def validate_rating(self):
        if self.rating is None and self.rating_status != "not_sure":
            raise ValueError("null rating requires rating_status='not_sure'")
        if self.rating is not None and self.rating_status != "rated":
            raise ValueError("a rating requires rating_status='rated'")
        return self

class AnnualBudgetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    amount: float | None = Field(default=None, ge=0)
    budget_status: Literal["estimated", "fixed", "not_sure"]
    @model_validator(mode="after")
    def validate_budget(self):
        if self.budget_status == "not_sure" and self.amount is not None:
            raise ValueError("amount must be null when budget_status='not_sure'")
        return self

class FundingPreferencesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    interested_in_scholarships: bool
    willing_to_consider_loans: bool

class StudentProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    education_stage: Literal["class10"] = "class10"
    preferred_name: str | None = Field(default=None, max_length=80)
    country: str = Field(min_length=1, max_length=100)
    region: str | None = Field(default=None, max_length=100)
    curriculum: Literal["CBSE","ICSE","State Board","Other"]
    academic_status: Literal["currently_studying","completed","awaiting_results"]
    preferred_language: str | None = Field(default=None, max_length=50)
    subjects: list[SubjectIn]
    overall_percentage: float | None = Field(default=None, ge=0, le=100)
    overall_result_status: ResultStatus
    interests: list[Interest]
    strengths: list[StrengthIn]
    interest_description: str = Field(max_length=1000)
    annual_budget: AnnualBudgetIn
    funding_preferences: FundingPreferencesIn
    preferred_destination: Literal["india","abroad","both","undecided"]
    priorities: list[Priority]
    career_certainty: Literal["specific_career","few_ideas","exploring"]

    @field_validator("interests", "priorities")
    @classmethod
    def unique_values(cls, values):
        if len(values) != len(set(values)):
            raise ValueError("duplicate values are not allowed")
        return values

    @model_validator(mode="after")
    def unique_nested_names(self):
        subjects = [s.name.strip().casefold() for s in self.subjects]
        strengths = [s.name for s in self.strengths]
        if len(subjects) != len(set(subjects)):
            raise ValueError("subject names must be unique")
        if len(strengths) != len(set(strengths)):
            raise ValueError("strength names must be unique")
        return self

class SubjectOut(SubjectIn):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StrengthOut(StrengthIn):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    education_stage: str
    preferred_name: str | None
    country: str
    region: str | None
    curriculum: str
    academic_status: str
    preferred_language: str | None
    subjects: list[SubjectOut]
    overall_percentage: float | None
    overall_result_status: str
    interests: list[str]
    strengths: list[StrengthOut]
    interest_description: str
    annual_budget: dict
    funding_preferences: dict
    preferred_destination: str
    priorities: list[str]
    career_certainty: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_profile(cls, p):
        return cls(
            id=p.id, education_stage=p.education_stage, preferred_name=p.preferred_name,
            country=p.country, region=p.region, curriculum=p.curriculum,
            academic_status=p.academic_status, preferred_language=p.preferred_language,
            subjects=p.subjects, overall_percentage=p.overall_percentage,
            overall_result_status=p.overall_result_status, interests=[x.value for x in p.interests],
            strengths=p.strengths, interest_description=p.interest_description,
            annual_budget={"currency":p.budget_currency,"amount":p.budget_amount,"budget_status":p.budget_status},
            funding_preferences={"interested_in_scholarships":p.interested_in_scholarships,
                                 "willing_to_consider_loans":p.willing_to_consider_loans},
            preferred_destination=p.preferred_destination, priorities=[x.value for x in p.priorities],
            career_certainty=p.career_certainty, created_at=p.created_at, updated_at=p.updated_at
        )
