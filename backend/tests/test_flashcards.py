import pytest
from app.services.cards.generator import generate_flashcards
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import db


@pytest.mark.asyncio
async def test_generate_flashcards():
    mock_sections = [
        {
            "section_index": 0,
            "page_number": 1,
            "heading": "Neuroplasticity",
            "content": "Neuroplasticity is the brain's ability to reorganize itself by forming new neural connections throughout life. It allows neurons to compensate for injury and adjust to new situations."
        }
    ]
    cards = await generate_flashcards(sections=mock_sections, count=3)
    assert len(cards) >= 1
    assert "front" in cards[0]
    assert "back" in cards[0]
    assert "source_quote" in cards[0]


def test_flashcard_generate_endpoint_slide_range():
    client = TestClient(app)
    token = create_access_token("fc-user-1", "fc@recall.local", "Flashcard Learner")

    # 1. Create a test collection
    coll_res = client.post(
        "/api/v1/collections/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Biology Flashcards", "description": "Cell structure"}
    )
    coll_id = coll_res.json()["id"]

    # 2. Add sections to in-memory db for testing
    import uuid
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "user_id": "fc-user-1",
        "collection_id": coll_id,
        "filename": "Bio_Slides.pptx",
        "file_type": "pptx",
        "total_pages": 20,
        "created_at": "2026-11-06T00:00:00Z"
    }
    db.firestore = None
    from app.core.database import memory_db
    memory_db.documents[doc_id] = doc

    sec1_id = str(uuid.uuid4())
    sec2_id = str(uuid.uuid4())
    memory_db.document_sections[sec1_id] = {
        "id": sec1_id,
        "document_id": doc_id,
        "section_index": 0,
        "page_number": 3,
        "heading": "Mitochondria Powerhouse",
        "content": "The mitochondrion is known as the powerhouse of the cell, generating most of the chemical energy needed to power the cell's biochemical reactions."
    }
    memory_db.document_sections[sec2_id] = {
        "id": sec2_id,
        "document_id": doc_id,
        "section_index": 1,
        "page_number": 15,
        "heading": "Ribosomes Protein Factory",
        "content": "Ribosomes are macromolecular machines found within all cells that perform biological protein synthesis according to messenger RNA sequences."
    }

    # 3. Generate flashcards specifically for slide set 1 to 5
    gen_res = client.post(
        "/api/v1/flashcards/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "collection_id": coll_id,
            "document_ids": [doc_id],
            "start_slide": 1,
            "end_slide": 5,
            "card_count": 2
        }
    )
    assert gen_res.status_code == 201
    data = gen_res.json()
    assert "cards" in data
    assert len(data["cards"]) >= 1
    # Title includes the slide range
    assert "Slides 1–5" in data["title"]
