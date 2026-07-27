import pytest
from app.agents.a01.retry_routing import determine_retry_route

def test_determine_retry_route_caption_issues():
    failed_criteria = ["brand_voice", "grammar"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D01"

def test_determine_retry_route_visual_issues():
    failed_criteria = ["visual_asset_fit", "poor_contrast"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D02"

def test_determine_retry_route_mixed_issues():
    # Caption issues should take precedence
    failed_criteria = ["grammar", "visual_quality"]
    agent = determine_retry_route(failed_criteria)
    assert agent == "D01"

def test_determine_retry_route_empty_or_unknown():
    assert determine_retry_route([]) == "D01"
    assert determine_retry_route(["unknown_issue"]) == "D01"
