from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user
from app.core.database import db
from app.core.errors import not_found_error, bad_request_error
from app.services.cards.generator import generate_flashcards
from app.schemas.flashcard import FlashcardGenerateRequest, FlashcardDeckResponse, FlashcardItem

router = APIRouter(prefix="/flashcards", tags=["Learning Flashcards"])


@router.post("/generate", response_model=FlashcardDeckResponse, status_code=status.HTTP_201_CREATED)
async def generate_cards(
    payload: FlashcardGenerateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Extracts key concepts, definitions, and relationships from documents
    to synthesize an interactive active recall flashcard deck.
    """
    coll = await db.get_collection(payload.collection_id, current_user["id"])
    if not coll:
        raise not_found_error("Collection", payload.collection_id)

    # 1. Gather all sections from the specified documents
    all_sections = []
    doc_titles = []
    for doc_id in payload.document_ids:
        doc = await db.get_document(doc_id, current_user["id"])
        if not doc:
            raise not_found_error("Document", doc_id)
        doc_titles.append(doc["filename"])
        sections = await db.get_document_sections(doc_id)
        all_sections.extend(sections)

    if not all_sections:
        raise bad_request_error("Selected document(s) have no parsed text sections available.")

    # 2. Synthesize flashcards
    raw_cards = await generate_flashcards(sections=all_sections, count=payload.card_count)

    # 3. Create Flashcard Deck
    deck_title = payload.title or f"Flashcards: {', '.join(doc_titles[:2])}"
    deck = await db.create_flashcard_deck(
        user_id=current_user["id"],
        collection_id=payload.collection_id,
        title=deck_title,
        document_ids=payload.document_ids
    )

    # 4. Store Flashcards
    card_payloads = [
        {
            **c,
            "deck_id": deck["id"]
        }
        for c in raw_cards
    ]
    created_cards = await db.create_flashcards(card_payloads)

    return {
        **deck,
        "cards": created_cards
    }


@router.get("/{deck_id}", response_model=FlashcardDeckResponse)
async def get_flashcard_deck(
    deck_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves a specific flashcard deck and its study cards."""
    deck = await db.get_flashcard_deck(deck_id, current_user["id"])
    if not deck:
        raise not_found_error("Flashcard Deck", deck_id)

    cards = await db.get_deck_flashcards(deck_id)
    return {
        **deck,
        "cards": cards
    }


@router.get("/collections/{collection_id}", response_model=List[FlashcardDeckResponse])
async def list_collection_decks(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all flashcard decks associated with a collection."""
    return await db.list_flashcard_decks(collection_id=collection_id, user_id=current_user["id"])

