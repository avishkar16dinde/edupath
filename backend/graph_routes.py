import logging
from fastapi import APIRouter, HTTPException, status

from domain_schemas import GraphGenerationRequest, PathwayGraph
from generator_service import (
    GraphGenerationError,
    LLMConfigurationError,
    LLMProviderError,
    LLMResponseParsingError,
    generate_pathway_graph,
)
from graph_engine import GraphValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["Pathway Graph"])


@router.post(
    "/generate",
    response_model=PathwayGraph,
    status_code=status.HTTP_200_OK,
    summary="Generate a pathway graph",
    description="Generate or expand an education-to-career pathway graph based on student profile data and generation intent.",
)
def generate_graph(payload: GraphGenerationRequest) -> PathwayGraph:
    """Generate or expand a pathway graph from a validated request."""
    try:
        return generate_pathway_graph(payload)
    except GraphValidationError as exc:
        logger.warning("Graph validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except LLMConfigurationError as exc:
        logger.error("LLM configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI generation service configuration error",
        ) from exc
    except LLMProviderError as exc:
        logger.error("LLM provider error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider service call failed. Please try again later.",
        ) from exc
    except LLMResponseParsingError as exc:
        logger.error("LLM response parsing error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse or validate AI provider response.",
        ) from exc
    except GraphGenerationError as exc:
        logger.error("Graph generation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate pathway graph.",
        ) from exc
