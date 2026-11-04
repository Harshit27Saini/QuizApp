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
    assert len(units[0]["questions"]) >= 1
    assert len(units[0]["questions"][0]["options"]) == 4
