import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.core.config import settings

# Global in-memory storage instance for offline dev & test suite
class InMemoryDB:
    def __init__(self):
        self.profiles: Dict[str, Dict[str, Any]] = {}
        self.collections: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.document_sections: Dict[str, Dict[str, Any]] = {}
        self.quizzes: Dict[str, Dict[str, Any]] = {}
        self.quiz_documents: List[Dict[str, str]] = []
        self.questions: Dict[str, Dict[str, Any]] = {}
        self.quiz_attempts: Dict[str, Dict[str, Any]] = {}
        self.question_responses: Dict[str, Dict[str, Any]] = {}
        self.flashcard_decks: Dict[str, Dict[str, Any]] = {}
        self.flashcards: Dict[str, Dict[str, Any]] = {}

    def now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()


memory_db = InMemoryDB()

_firestore_client = None

def get_firestore_client():
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    if settings.FIREBASE_CREDENTIALS_PATH or settings.FIREBASE_PROJECT_ID:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred, {
                        'projectId': settings.FIREBASE_PROJECT_ID or None,
                        'storageBucket': settings.FIREBASE_STORAGE_BUCKET or None
                    })
                else:
                    firebase_admin.initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})

            _firestore_client = firestore.client()
            return _firestore_client
        except Exception:
            return None
    return None


class Repository:
    """
    Unified Data Repository for Recall.
    Uses Cloud Firestore when Firebase credentials are configured;
    falls back cleanly to in-memory store for local testing & development.
    """
    def __init__(self):
        self.firestore = get_firestore_client()

    # -------------------------------------------------------------------------
    # Collections
    # -------------------------------------------------------------------------
    async def create_collection(self, user_id: str, title: str, description: Optional[str] = None) -> Dict[str, Any]:
        item = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "description": description or "",
            "created_at": memory_db.now_iso(),
            "updated_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("collections").document(item["id"]).set(item)
            return item

        memory_db.collections[item["id"]] = item
        return item

    async def list_collections(self, user_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("collections").where("user_id", "==", user_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        return [c for c in memory_db.collections.values() if c["user_id"] == user_id]

    async def get_collection(self, collection_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore:
            doc = self.firestore.collection("collections").document(collection_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return data
            return None
        item = memory_db.collections.get(collection_id)
        if item and item["user_id"] == user_id:
            return item
        return None

    async def delete_collection(self, collection_id: str, user_id: str) -> bool:
        if self.firestore:
            ref = self.firestore.collection("collections").document(collection_id)
            doc = ref.get()
            if doc.exists and doc.to_dict().get("user_id") == user_id:
                ref.delete()
                return True
            return False
        if collection_id in memory_db.collections and memory_db.collections[collection_id]["user_id"] == user_id:
            del memory_db.collections[collection_id]
            return True
        return False

    # -------------------------------------------------------------------------
    # Documents
    # -------------------------------------------------------------------------
    async def create_document(
        self,
        collection_id: str,
        user_id: str,
        filename: str,
        file_type: str,
        file_size_bytes: int,
        storage_path: str,
        total_pages: int = 1,
        status: str = "ready"
    ) -> Dict[str, Any]:
        doc = {
            "id": str(uuid.uuid4()),
            "collection_id": collection_id,
            "user_id": user_id,
            "filename": filename,
            "file_type": file_type,
            "file_size_bytes": file_size_bytes,
            "storage_path": storage_path,
            "total_pages": total_pages,
            "status": status,
            "error_message": None,
            "created_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("documents").document(doc["id"]).set(doc)
            return doc
        memory_db.documents[doc["id"]] = doc
        return doc

    async def list_documents(self, collection_id: str, user_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("documents").where("collection_id", "==", collection_id).where("user_id", "==", user_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        return [d for d in memory_db.documents.values() if d["collection_id"] == collection_id and d["user_id"] == user_id]

    async def get_document(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore:
            doc = self.firestore.collection("documents").document(document_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return data
            return None
        doc = memory_db.documents.get(document_id)
        if doc and doc["user_id"] == user_id:
            return doc
        return None

    # -------------------------------------------------------------------------
    # Document Sections
    # -------------------------------------------------------------------------
    async def create_document_sections(self, sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        created = []
        for s in sections:
            item = {
                "id": str(uuid.uuid4()),
                "document_id": s["document_id"],
                "section_index": s["section_index"],
                "page_number": s.get("page_number"),
                "heading": s.get("heading") or "",
                "content": s["content"],
                "token_estimate": s.get("token_estimate", len(s["content"]) // 4),
                "created_at": memory_db.now_iso()
            }
            created.append(item)
            if self.firestore:
                self.firestore.collection("document_sections").document(item["id"]).set(item)
            else:
                memory_db.document_sections[item["id"]] = item
        return created

    async def get_document_sections(self, document_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("document_sections").where("document_id", "==", document_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("section_index", 0))
        sections = [s for s in memory_db.document_sections.values() if s["document_id"] == document_id]
        return sorted(sections, key=lambda x: x["section_index"])

    # -------------------------------------------------------------------------
    # Quizzes & Questions
    # -------------------------------------------------------------------------
    async def create_quiz(
        self,
        user_id: str,
        collection_id: Optional[str],
        title: str,
        mode: str,
        difficulty: str,
        document_ids: List[str]
    ) -> Dict[str, Any]:
        quiz = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "collection_id": collection_id,
            "title": title,
            "mode": mode,
            "difficulty": difficulty,
            "document_ids": document_ids,
            "created_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("quizzes").document(quiz["id"]).set(quiz)
            return quiz

        memory_db.quizzes[quiz["id"]] = quiz
        for d_id in document_ids:
            memory_db.quiz_documents.append({"quiz_id": quiz["id"], "document_id": d_id})
        return quiz

    async def get_quiz(self, quiz_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore:
            doc = self.firestore.collection("quizzes").document(quiz_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return data
            return None
        q = memory_db.quizzes.get(quiz_id)
        if q and q["user_id"] == user_id:
            return q
        return None

    async def list_quizzes(self, user_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("quizzes").where("user_id", "==", user_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        quizzes = [q for q in memory_db.quizzes.values() if q["user_id"] == user_id]
        return sorted(quizzes, key=lambda x: x["created_at"], reverse=True)

    async def create_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        created = []
        for q in questions:
            item = {
                "id": str(uuid.uuid4()),
                "quiz_id": q["quiz_id"],
                "question_type": q.get("question_type", "MCQ"),
                "prompt": q["prompt"],
                "options": q["options"],
                "correct_answers": q["correct_answers"],
                "explanation": q["explanation"],
                "source_document_id": q.get("source_document_id"),
                "source_page": q.get("source_page"),
                "source_quote": q.get("source_quote"),
                "difficulty": q.get("difficulty", "medium"),
                "created_at": memory_db.now_iso()
            }
            created.append(item)
            if self.firestore:
                self.firestore.collection("questions").document(item["id"]).set(item)
            else:
                memory_db.questions[item["id"]] = item
        return created

    async def get_quiz_questions(self, quiz_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("questions").where("quiz_id", "==", quiz_id).stream()
            return [d.to_dict() for d in docs]
        return [q for q in memory_db.questions.values() if q["quiz_id"] == quiz_id]

    # -------------------------------------------------------------------------
    # Quiz Attempts & Responses
    # -------------------------------------------------------------------------
    async def create_attempt(
        self,
        quiz_id: str,
        user_id: str,
        total_questions: int,
        is_retry: bool = False,
        parent_attempt_id: Optional[str] = None
    ) -> Dict[str, Any]:
        attempt = {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz_id,
            "user_id": user_id,
            "is_retry": is_retry,
            "parent_attempt_id": parent_attempt_id,
            "score": 0.0,
            "total_questions": total_questions,
            "correct_count": 0,
            "time_taken_seconds": 0,
            "started_at": memory_db.now_iso(),
            "completed_at": None
        }
        if self.firestore:
            self.firestore.collection("quiz_attempts").document(attempt["id"]).set(attempt)
            return attempt
        memory_db.quiz_attempts[attempt["id"]] = attempt
        return attempt

    async def complete_attempt(
        self,
        attempt_id: str,
        user_id: str,
        score: float,
        correct_count: int,
        time_taken_seconds: int,
        responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        now = memory_db.now_iso()
        update_data = {
            "score": score,
            "correct_count": correct_count,
            "time_taken_seconds": time_taken_seconds,
            "completed_at": now
        }
        if self.firestore:
            self.firestore.collection("quiz_attempts").document(attempt_id).update(update_data)
            for r in responses:
                rid = str(uuid.uuid4())
                r_payload = {
                    "id": rid,
                    "attempt_id": attempt_id,
                    "question_id": r["question_id"],
                    "user_id": user_id,
                    "selected_options": r["selected_options"],
                    "is_correct": r["is_correct"],
                    "time_spent_seconds": r.get("time_spent_seconds", 0),
                    "created_at": now
                }
                self.firestore.collection("question_responses").document(rid).set(r_payload)

            doc = self.firestore.collection("quiz_attempts").document(attempt_id).get()
            return doc.to_dict()

        attempt = memory_db.quiz_attempts[attempt_id]
        attempt["score"] = score
        attempt["correct_count"] = correct_count
        attempt["time_taken_seconds"] = time_taken_seconds
        attempt["completed_at"] = now

        for r in responses:
            rid = str(uuid.uuid4())
            memory_db.question_responses[rid] = {
                "id": rid,
                "attempt_id": attempt_id,
                "question_id": r["question_id"],
                "user_id": user_id,
                "selected_options": r["selected_options"],
                "is_correct": r["is_correct"],
                "time_spent_seconds": r.get("time_spent_seconds", 0),
                "created_at": now
            }
        return attempt

    async def get_attempt(self, attempt_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore:
            doc = self.firestore.collection("quiz_attempts").document(attempt_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return data
            return None
        att = memory_db.quiz_attempts.get(attempt_id)
        if att and att["user_id"] == user_id:
            return att
        return None

    async def list_attempts(self, user_id: str, quiz_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.firestore:
            query = self.firestore.collection("quiz_attempts").where("user_id", "==", user_id)
            if quiz_id:
                query = query.where("quiz_id", "==", quiz_id)
            docs = query.stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("started_at", ""), reverse=True)
        attempts = [
            a for a in memory_db.quiz_attempts.values()
            if a["user_id"] == user_id and (quiz_id is None or a["quiz_id"] == quiz_id)
        ]
        return sorted(attempts, key=lambda x: x["started_at"], reverse=True)

    async def get_attempt_responses(self, attempt_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("question_responses").where("attempt_id", "==", attempt_id).stream()
            return [d.to_dict() for d in docs]
        return [r for r in memory_db.question_responses.values() if r["attempt_id"] == attempt_id]

    # -------------------------------------------------------------------------
    # Flashcard Decks & Cards
    # -------------------------------------------------------------------------
    async def create_flashcard_deck(
        self,
        user_id: str,
        collection_id: str,
        title: str,
        document_ids: List[str]
    ) -> Dict[str, Any]:
        deck = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "collection_id": collection_id,
            "title": title,
            "document_ids": document_ids,
            "created_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("flashcard_decks").document(deck["id"]).set(deck)
            return deck
        memory_db.flashcard_decks[deck["id"]] = deck
        return deck

    async def get_flashcard_deck(self, deck_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore:
            doc = self.firestore.collection("flashcard_decks").document(deck_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return data
            return None
        deck = memory_db.flashcard_decks.get(deck_id)
        if deck and deck["user_id"] == user_id:
            return deck
        return None

    async def list_flashcard_decks(self, collection_id: str, user_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("flashcard_decks").where("collection_id", "==", collection_id).where("user_id", "==", user_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        return [d for d in memory_db.flashcard_decks.values() if d["collection_id"] == collection_id and d["user_id"] == user_id]

    async def create_flashcards(self, cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        created = []
        for c in cards:
            item = {
                "id": str(uuid.uuid4()),
                "deck_id": c["deck_id"],
                "front": c["front"],
                "back": c["back"],
                "source_page": c.get("source_page"),
                "source_quote": c.get("source_quote"),
                "tags": c.get("tags", []),
                "mastered": False,
                "created_at": memory_db.now_iso()
            }
            created.append(item)
            if self.firestore:
                self.firestore.collection("flashcards").document(item["id"]).set(item)
            else:
                memory_db.flashcards[item["id"]] = item
        return created

    async def get_deck_flashcards(self, deck_id: str) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("flashcards").where("deck_id", "==", deck_id).stream()
            return [d.to_dict() for d in docs]
        return [c for c in memory_db.flashcards.values() if c["deck_id"] == deck_id]


db = Repository()
