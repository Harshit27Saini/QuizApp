import pytest
from app.services.learning_path.generator import generate_document_learning_path, TRAIL_CONFIGS


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
async def test_branching_dungeon_trails():
    """Verifies that side trails (deep_dive, trap_vault, secret_vault, gauntlet, boss) are
    generated alongside the main path and have correct trail_type, branch_direction, and XP."""
    mock_sections = [
        {
            "section_index": i,
            "page_number": i + 1,
            "heading": f"Control Systems Principle {i + 1}",
            "content": f"Principle {i + 1}: Feedback loops enable dynamic system correction through proportional integral derivative control mechanisms."
        }
        for i in range(12)
    ]

    units = await generate_document_learning_path(
        sections=mock_sections,
        doc_title="Control Systems Engineering",
        lesson_depth="standard"
    )

    main_units   = [u for u in units if u.get("trail_type", "main") == "main"]
    side_trails  = [u for u in units if u.get("trail_type", "main") != "main"]

    # Must have main units
    assert len(main_units) >= 2, f"Expected main units, got {len(main_units)}"

    # Must have side trails branching off
    assert len(side_trails) >= 2, f"Expected side trails, got {len(side_trails)}"

    # Every side trail must have a valid trail_type
    valid_trail_types = set(TRAIL_CONFIGS.keys())
    for trail in side_trails:
        t = trail.get("trail_type", "")
        assert t in valid_trail_types, f"Unknown trail_type: {t}"

    # Branch directions must be left or right (or None for boss)
    for trail in side_trails:
        direction = trail.get("branch_direction")
        assert direction in ("left", "right", None), f"Bad branch_direction: {direction}"

    # XP rewards: side trails must offer more XP than main (25)
    for trail in side_trails:
        assert trail.get("xp_reward", 0) >= 40, f"Side trail XP too low: {trail.get('xp_reward')}"

    # All units (main + trails) must have substantive_content and questions
    for u in units:
        assert "substantive_content" in u, f"Missing substantive_content in: {u.get('title')}"
        assert len(u.get("questions", [])) >= 1, f"No questions in: {u.get('title')}"


@pytest.mark.asyncio
async def test_boss_node_exists_at_end():
    """The final main unit should spawn an Apex Boss node."""
    mock_sections = [
        {
            "section_index": i,
            "page_number": i + 1,
            "heading": f"Chapter {i + 1}",
            "content": f"Chapter {i + 1} covers advanced equilibrium dynamics and institutional negotiation theory."
        }
        for i in range(8)
    ]

    units = await generate_document_learning_path(
        sections=mock_sections,
        doc_title="Game Theory Lecture Notes",
        lesson_depth="standard"
    )

    boss_nodes = [u for u in units if u.get("trail_type") == "boss"]
    assert len(boss_nodes) >= 1, "Expected at least one Apex Boss node at the end of the dungeon."
    boss = boss_nodes[0]
    assert boss.get("xp_reward", 0) >= 100, f"Boss should award >= 100 XP, got {boss.get('xp_reward')}"
    assert len(boss.get("questions", [])) >= 1


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
    # Main path units must only cover content within the sandbox range
    main_units = [u for u in units if u.get("trail_type", "main") == "main"]
    assert all(u.get("source_page", 10) <= 20 for u in main_units)
    assert main_units[0]["substantive_content"] is not None


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
    main_units = [u for u in units if u.get("trail_type", "main") == "main"]
    assert 16 <= len(main_units) <= 26, f"Expected 16-26 main units for 129 slides, got {len(main_units)}"

    # Must have many side trails
    side_trails = [u for u in units if u.get("trail_type", "main") != "main"]
    assert len(side_trails) >= len(main_units), "Expected at least as many side trails as main units"

    # Check slide span for main nodes only
    for u in main_units:
        assert "substantive_content" in u
        assert "questions" in u
        start_p = u["source_page"]
        end_p = u.get("source_page_end", start_p)
        span = end_p - start_p + 1
        assert 1 <= span <= 10, f"Main unit covers {span} slides, expected ~4-8"
        assert "Slides " in u["title"] or "Slide " in u["title"]


@pytest.mark.asyncio
async def test_drill_questions_endpoint():
    """Verifies that infinite drill generates section-specific questions."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import db

    client = TestClient(app)

    # 1. Create a collection & document in local database
    coll = await db.create_collection("test_user_drill", "Neuroscience Collection")
    doc = await db.create_document(
        collection_id=coll["id"],
        user_id="test_user_drill",
        filename="Neuroscience_101.pdf",
        file_type="pdf",
        file_size_bytes=1024,
        storage_path="/mock/path.pdf",
        total_pages=5
    )
    await db.create_document_sections([
        {
            "document_id": doc["id"],
            "section_index": 0,
            "page_number": 1,
            "heading": "Synaptic Plasticity",
            "content": "Long term potentiation strengthens synapses based on recent patterns of activity."
        }
    ])

    # 2. Create learning path
    path = await db.create_learning_path(
        user_id="test_user_drill",
        collection_id=coll["id"],
        document_id=doc["id"],
        title="Neuroscience Path",
        raw_units=[
            {
                "title": "Unit 1: Synaptic Plasticity",
                "concept_summary": "LTP is a persistent strengthening of synapses.",
                "key_takeaways": ["LTP strengthens transmission", "Requires NMDA receptor activation"],
                "substantive_content": {
                    "overview": "Overview of synaptic transmission and plasticity.",
                    "mechanisms": ["NMDA receptor activation: Calcium influx triggers kinase cascades"]
                },
                "source_page": 1,
                "slide_start": 1,
                "slide_end": 2,
                "questions": []
            }
        ]
    )

    # 3. Call drill questions endpoint
    headers = {"X-User-Id": "test_user_drill"}
    res = client.post(
        f"/api/v1/learning-paths/{path['id']}/units/0/drill-questions",
        json={"document_id": doc["id"], "unit_index": 0, "count": 3},
        headers=headers
    )
    assert res.status_code == 200
    questions = res.json()
    assert len(questions) >= 1
    assert "prompt" in questions[0]
    assert "options" in questions[0]
    assert len(questions[0]["options"]) == 4

