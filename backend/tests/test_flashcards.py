import pytest
from app.services.cards.generator import generate_flashcards


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

