import pytest
from app.agents.a01.retry_routing import determine_retry_route

def test_determine_retry_route_caption_issues():
    failed_criteria = ["brand_voice", "platform_fit"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D01"

def test_determine_retry_route_visual_issues():
    failed_criteria = ["visual_asset_fit", "mobile_readability"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D02"

def test_determine_retry_route_mixed_issues():
    # Caption issues should take precedence
    failed_criteria = ["originality", "image_design_quality"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D01"


@pytest.mark.parametrize(
    ("failed_criteria", "agent"),
    [
        (["visual_generation_unavailable"], "D02"),
        (["vision_evaluator_unavailable"], "E01"),
    ],
)
def test_determine_retry_route_resumes_the_agent_blocked_by_provider_credits(failed_criteria, agent):
    assert determine_retry_route(failed_criteria) == agent

@pytest.mark.parametrize("failed_criteria", [[], ["unknown_issue"], ["grammar"]])
def test_determine_retry_route_rejects_empty_or_unknown_criteria(failed_criteria):
    with pytest.raises(ValueError):
        determine_retry_route(failed_criteria)
