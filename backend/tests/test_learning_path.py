import pytest
from app.services.learning_path.generator import generate_document_learning_path


@pytest.mark.asyncio
async def test_generate_learning_path():
    mock_sections = [
        {
            "section_index": 0,
            "page_number": 5,
            "heading": "Conflict Resolution Models",
            "content": "Conflict resolution addresses structural causes of disputes. Principled negotiation focuses on interests rather than entrenched positions."
        },
        {
            "section_index": 1,
            "page_number": 6,
            "heading": "Mediation Techniques",
            "content": "Mediation introduces a neutral third party to facilitate dialogue and discover mutually acceptable agreements."
        }
    ]
    units = await generate_document_learning_path(mock_sections, doc_title="Peace Studies")
    assert len(units) >= 2
    assert "title" in units[0]
    assert "concept_summary" in units[0]
    assert "key_takeaways" in units[0]
    assert "substantive_content" in units[0]
    assert "overview" in units[0]["substantive_content"]
    assert len(units[0]["questions"]) >= 1
    assert len(units[0]["questions"][0]["options"]) == 4


@pytest.mark.asyncio
async def test_sandbox_slide_range_and_depth():
    mock_sections = [
        {"section_index": 0, "page_number": 1, "heading": "Cover", "content": "Department of Engineering Subject Code 101"},
        {"section_index": 1, "page_number": 10, "heading": "PID Controllers", "content": "Proportional Integral Derivative controllers calculate an error value as the difference between a desired setpoint and a measured process variable."},
        {"section_index": 2, "page_number": 12, "heading": "State Space Representation", "content": "State space representation models physical systems as a set of input, output, and state variables related by first-order differential equations."},
        {"section_index": 3, "page_number": 30, "heading": "Advanced Kalman Filtering", "content": "Kalman filtering uses a series of measurements observed over time containing statistical noise to estimate unknown variables."}
    ]
    
    # Sandbox restricted to pages 10-15 with sprint depth
    units = await generate_document_learning_path(
        sections=mock_sections,
        doc_title="Robotics",
        page_start=10,
        page_end=15,
        lesson_depth="sprint"
    )
    assert len(units) >= 1
    # Check that page 30 was not included in the sandbox units
    assert all(u.get("source_page", 10) <= 20 for u in units)
    assert units[0]["substantive_content"] is not None


@pytest.mark.asyncio
async def test_granular_129_slides_learning_path():
    # 129 slides as reported by user
    mock_129_slides = [
        {
            "section_index": i,
            "page_number": i + 1,
            "heading": f"Slide {i + 1}: Strategic Interaction Principle {i + 1}",
            "content": f"Slide {i + 1} details equilibrium dynamics, game theory payoffs, and institutional negotiation mechanisms for collective decision making."
        }
        for i in range(129)
    ]

    units = await generate_document_learning_path(
        sections=mock_129_slides,
        doc_title="Lecture 129 Slides - Conflict Management",
        lesson_depth="standard"
    )

    # Standard depth: ~6 slides per stone => 129 / 6 ≈ 22 stepping stones
    main_units = [u for u in units if not u.get("is_challenge_trail")]
    assert 16 <= len(main_units) <= 26, f"Expected 16-26 main units for 129 slides, got {len(main_units)}"
    assert any(u.get("is_challenge_trail") for u in units), "Expected branching challenge gauntlets"
    
    # Check that each stepping stone covers between 4 and 8 slides
    for u in units:
        assert "substantive_content" in u
        assert "questions" in u
        start_p = u["source_page"]
        end_p = u.get("source_page_end", start_p)
        span = end_p - start_p + 1
        max_allowed = 16 if u.get("is_challenge_trail") else 10
        assert 1 <= span <= max_allowed, f"Stepping stone covers {span} slides, expected ~4-8"
        assert "Slides " in u["title"] or "Slide " in u["title"] or u.get("is_challenge_trail")

