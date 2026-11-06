import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.core.config import settings

import json

def is_test_environment() -> bool:
    return "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST") is not None or any("pytest" in arg for arg in sys.argv)

# Global in-memory storage instance for offline dev & test suite (with local disk persistence)
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
        self.learning_paths: Dict[str, Dict[str, Any]] = {}
        self.path_nodes: Dict[str, Dict[str, Any]] = {}
        self.users: Dict[str, Dict[str, Any]] = {}
        self.feedback: Dict[str, Dict[str, Any]] = {}
        self.telemetry_logs: Dict[str, Dict[str, Any]] = {}
        self.friend_requests: Dict[str, Dict[str, Any]] = {}
        self.friendships: List[Dict[str, Any]] = []
        if not os.getenv("PYTEST_CURRENT_TEST"):
            self._load_from_disk()

    def _get_disk_path(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(base_dir, "uploads")
        os.makedirs(data_dir, exist_ok=True)
        return os.path.join(data_dir, "recall_local_state.json")

    def _save_to_disk(self):
        if os.getenv("PYTEST_CURRENT_TEST"):
            return
        try:
            path = self._get_disk_path()
            data = {
                "profiles": self.profiles,
                "collections": self.collections,
                "documents": self.documents,
                "document_sections": self.document_sections,
                "quizzes": self.quizzes,
                "quiz_documents": self.quiz_documents,
                "questions": self.questions,
                "quiz_attempts": self.quiz_attempts,
                "question_responses": self.question_responses,
                "flashcard_decks": self.flashcard_decks,
                "flashcards": self.flashcards,
                "learning_paths": self.learning_paths,
                "path_nodes": self.path_nodes,
                "users": self.users,
                "feedback": self.feedback,
                "telemetry_logs": self.telemetry_logs,
                "friend_requests": self.friend_requests,
                "friendships": self.friendships,
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception:
            pass

    def _load_from_disk(self):
        if os.getenv("PYTEST_CURRENT_TEST"):
            return
        try:
            path = self._get_disk_path()
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for key, val in data.items():
                    if hasattr(self, key):
                        setattr(self, key, val)
        except Exception:
            pass

    def now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()


memory_db = InMemoryDB()

# ---------------------------------------------------------------------------
# Supabase client (singleton)
# ---------------------------------------------------------------------------
_supabase_client = None

def get_supabase_client():
    """Returns a Supabase client if SUPABASE_URL and SUPABASE_KEY are configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    if url and key:
        try:
            from supabase import create_client
            _supabase_client = create_client(url, key)
            return _supabase_client
        except Exception as e:
            print(f"[Recall] Supabase init failed: {e}. Falling back to in-memory store.")
            return None
    return None


# ---------------------------------------------------------------------------
# Legacy Firestore client (kept for backward compatibility)
# ---------------------------------------------------------------------------
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
    Priority: Supabase (PostgreSQL) > Cloud Firestore > In-memory (dev/test).
    """
    def __init__(self):
        if is_test_environment():
            self.supabase = None
            self.firestore = None
        else:
            self.supabase = get_supabase_client()
            self.firestore = None if self.supabase else get_firestore_client()

    # -------------------------------------------------------------------------
    # Internal Supabase helpers
    # -------------------------------------------------------------------------
    def _sb_insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a row into a Supabase table and return the inserted row."""
        result = self.supabase.table(table).insert(data).execute()
        if result.data:
            return result.data[0]
        return data

    def _sb_upsert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.supabase.table(table).upsert(data).execute()
        if result.data:
            return result.data[0]
        return data

    def _sb_select_one(self, table: str, filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        q = self.supabase.table(table).select("*")
        for col, val in filters.items():
            q = q.eq(col, val)
        result = q.limit(1).execute()
        if result.data:
            return result.data[0]
        return None

    def _sb_select_many(self, table: str, filters: Optional[Dict[str, Any]] = None,
                        order_col: Optional[str] = None, order_desc: bool = True,
                        limit: Optional[int] = None) -> List[Dict[str, Any]]:
        q = self.supabase.table(table).select("*")
        if filters:
            for col, val in filters.items():
                q = q.eq(col, val)
        if order_col:
            q = q.order(order_col, desc=order_desc)
        if limit:
            q = q.limit(limit)
        result = q.execute()
        return result.data or []

    def _sb_update(self, table: str, row_id: str, updates: Dict[str, Any]) -> bool:
        self.supabase.table(table).update(updates).eq("id", row_id).execute()
        return True

    def _sb_delete(self, table: str, row_id: str) -> bool:
        self.supabase.table(table).delete().eq("id", row_id).execute()
        return True

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
        if self.supabase:
            return self._sb_insert("collections", item)
        if self.firestore:
            self.firestore.collection("collections").document(item["id"]).set(item)
            return item
        memory_db.collections[item["id"]] = item
        memory_db._save_to_disk()
        return item

    async def list_collections(self, user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        if self.supabase:
            if is_admin:
                return self._sb_select_many("collections", order_col="created_at", order_desc=True)
            return self._sb_select_many("collections", filters={"user_id": user_id}, order_col="created_at", order_desc=True)
        if self.firestore:
            if is_admin:
                docs = self.firestore.collection("collections").stream()
            else:
                docs = self.firestore.collection("collections").where("user_id", "==", user_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        if is_admin or user_id == "00000000-0000-0000-0000-000000000001":
            return sorted(list(memory_db.collections.values()), key=lambda x: x.get("created_at", ""), reverse=True)
        return [c for c in memory_db.collections.values() if c.get("user_id") == user_id or c.get("user_id") == "00000000-0000-0000-0000-000000000001"]

    async def get_collection(self, collection_id: str, user_id: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
        if self.supabase:
            item = self._sb_select_one("collections", {"id": collection_id})
            if item and (is_admin or item.get("user_id") == user_id):
                return item
            return None
        if self.firestore:
            doc = self.firestore.collection("collections").document(collection_id).get()
            if doc.exists:
                data = doc.to_dict()
                if is_admin or data.get("user_id") == user_id:
                    return data
            return None
        item = memory_db.collections.get(collection_id)
        if item:
            if is_admin or item.get("user_id") == user_id or user_id == "00000000-0000-0000-0000-000000000001":
                return item
            if (item.get("user_id", "").startswith("guest_") or item.get("user_id") == "00000000-0000-0000-0000-000000000001") and not user_id.startswith("guest_"):
                item["user_id"] = user_id
                memory_db._save_to_disk()
                return item
        return None

    async def get_or_restore_collection(
        self,
        collection_id: str,
        user_id: str,
        title: str = "Study Collection",
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """Returns the collection or auto-restores it if erased during a cloud cold-start."""
        existing = await self.get_collection(collection_id, user_id, is_admin=is_admin)
        if existing:
            return existing

        item = {
            "id": collection_id,
            "user_id": user_id,
            "title": title,
            "description": "Auto-restored study collection",
            "created_at": memory_db.now_iso(),
            "updated_at": memory_db.now_iso()
        }
        if self.supabase:
            return self._sb_insert("collections", item)
        if self.firestore:
            self.firestore.collection("collections").document(item["id"]).set(item)
            return item
        memory_db.collections[item["id"]] = item
        memory_db._save_to_disk()
        return item

    async def delete_collection(self, collection_id: str, user_id: str, is_admin: bool = False) -> bool:
        if self.supabase:
            item = self._sb_select_one("collections", {"id": collection_id})
            if item and (is_admin or item.get("user_id") == user_id):
                self._sb_delete("collections", collection_id)
                return True
            return False
        if self.firestore:
            ref = self.firestore.collection("collections").document(collection_id)
            doc = ref.get()
            if doc.exists and (is_admin or doc.to_dict().get("user_id") == user_id):
                ref.delete()
                return True
            return False
        if collection_id in memory_db.collections:
            coll = memory_db.collections[collection_id]
            if is_admin or coll.get("user_id") == user_id or user_id == "00000000-0000-0000-0000-000000000001":
                del memory_db.collections[collection_id]
                memory_db._save_to_disk()
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
        if self.supabase:
            return self._sb_insert("documents", doc)
        if self.firestore:
            self.firestore.collection("documents").document(doc["id"]).set(doc)
            return doc
        memory_db.documents[doc["id"]] = doc
        memory_db._save_to_disk()
        return doc

    async def list_documents(self, collection_id: str, user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        if self.supabase:
            items = self._sb_select_many("documents", filters={"collection_id": collection_id}, order_col="created_at", order_desc=True)
            if not is_admin:
                items = [d for d in items if d.get("user_id") == user_id]
            return items
        if self.firestore:
            docs = self.firestore.collection("documents").where("collection_id", "==", collection_id).stream()
            items = [d.to_dict() for d in docs]
            if not is_admin:
                items = [d for d in items if d.get("user_id") == user_id]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        return [
            d for d in memory_db.documents.values()
            if d.get("collection_id") == collection_id and (
                is_admin
                or d.get("user_id") == user_id
                or user_id == "00000000-0000-0000-0000-000000000001"
                or d.get("user_id") == "00000000-0000-0000-0000-000000000001"
            )
        ]

    async def get_document(self, document_id: str, user_id: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
        if self.supabase:
            doc = self._sb_select_one("documents", {"id": document_id})
            if doc and (is_admin or doc.get("user_id") == user_id):
                return doc
            return None
        if self.firestore:
            doc = self.firestore.collection("documents").document(document_id).get()
            if doc.exists:
                data = doc.to_dict()
                if is_admin or data.get("user_id") == user_id:
                    return data
            return None
        doc = memory_db.documents.get(document_id)
        if doc:
            if is_admin or doc.get("user_id") == user_id or user_id == "00000000-0000-0000-0000-000000000001":
                return doc
            if (doc.get("user_id", "").startswith("guest_") or doc.get("user_id") == "00000000-0000-0000-0000-000000000001") and not user_id.startswith("guest_"):
                doc["user_id"] = user_id
                memory_db._save_to_disk()
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
            if self.supabase:
                self._sb_insert("document_sections", item)
            elif self.firestore:
                self.firestore.collection("document_sections").document(item["id"]).set(item)
            else:
                memory_db.document_sections[item["id"]] = item
        if not self.supabase and not self.firestore:
            memory_db._save_to_disk()
        return created

    async def get_document_sections(self, document_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            items = self._sb_select_many("document_sections", filters={"document_id": document_id}, order_col="section_index", order_desc=False)
            return items
        if self.firestore:
            docs = self.firestore.collection("document_sections").where("document_id", "==", document_id).stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("section_index", 0))
        sections = [s for s in memory_db.document_sections.values() if s["document_id"] == document_id]
        return sorted(sections, key=lambda x: x.get("section_index", 0))

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
        if self.supabase:
            return self._sb_insert("quizzes", quiz)
        if self.firestore:
            self.firestore.collection("quizzes").document(quiz["id"]).set(quiz)
            return quiz
        memory_db.quizzes[quiz["id"]] = quiz
        for d_id in document_ids:
            memory_db.quiz_documents.append({"quiz_id": quiz["id"], "document_id": d_id})
        return quiz

    async def get_quiz(self, quiz_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            q = self._sb_select_one("quizzes", {"id": quiz_id})
            if q and q["user_id"] == user_id:
                return q
            return None
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
        if self.supabase:
            return self._sb_select_many("quizzes", filters={"user_id": user_id}, order_col="created_at", order_desc=True)
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
            if self.supabase:
                self._sb_insert("questions", item)
            elif self.firestore:
                self.firestore.collection("questions").document(item["id"]).set(item)
            else:
                memory_db.questions[item["id"]] = item
        return created

    async def get_quiz_questions(self, quiz_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            return self._sb_select_many("questions", filters={"quiz_id": quiz_id})
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
        if self.supabase:
            return self._sb_insert("quiz_attempts", attempt)
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
        if self.supabase:
            self._sb_update("quiz_attempts", attempt_id, update_data)
            for r in responses:
                rid = str(uuid.uuid4())
                self._sb_insert("question_responses", {
                    "id": rid,
                    "attempt_id": attempt_id,
                    "question_id": r["question_id"],
                    "user_id": user_id,
                    "selected_options": r["selected_options"],
                    "is_correct": r["is_correct"],
                    "time_spent_seconds": r.get("time_spent_seconds", 0),
                    "created_at": now
                })
            return self._sb_select_one("quiz_attempts", {"id": attempt_id}) or {}
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
        if self.supabase:
            att = self._sb_select_one("quiz_attempts", {"id": attempt_id})
            if att and att["user_id"] == user_id:
                return att
            return None
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
        if self.supabase:
            filters: Dict[str, Any] = {"user_id": user_id}
            if quiz_id:
                filters["quiz_id"] = quiz_id
            return self._sb_select_many("quiz_attempts", filters=filters, order_col="started_at", order_desc=True)
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
        if self.supabase:
            return self._sb_select_many("question_responses", filters={"attempt_id": attempt_id})
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
        if self.supabase:
            return self._sb_insert("flashcard_decks", deck)
        if self.firestore:
            self.firestore.collection("flashcard_decks").document(deck["id"]).set(deck)
            return deck
        memory_db.flashcard_decks[deck["id"]] = deck
        return deck

    async def get_flashcard_deck(self, deck_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            deck = self._sb_select_one("flashcard_decks", {"id": deck_id})
            if deck and deck["user_id"] == user_id:
                return deck
            return None
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
        if self.supabase:
            q = self.supabase.table("flashcard_decks").select("*").eq("collection_id", collection_id).eq("user_id", user_id).order("created_at", desc=True)
            result = q.execute()
            return result.data or []
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
            if self.supabase:
                self._sb_insert("flashcards", item)
            elif self.firestore:
                self.firestore.collection("flashcards").document(item["id"]).set(item)
            else:
                memory_db.flashcards[item["id"]] = item
        return created

    async def get_deck_flashcards(self, deck_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            return self._sb_select_many("flashcards", filters={"deck_id": deck_id})
        if self.firestore:
            docs = self.firestore.collection("flashcards").where("deck_id", "==", deck_id).stream()
            return [d.to_dict() for d in docs]
        return [c for c in memory_db.flashcards.values() if c["deck_id"] == deck_id]

    # -------------------------------------------------------------------------
    # Learning Paths (Dungeon-style progression)
    # -------------------------------------------------------------------------
    async def create_learning_path(
        self,
        user_id: str,
        collection_id: str,
        document_id: str,
        title: str,
        raw_units: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        path_id = str(uuid.uuid4())
        now = memory_db.now_iso()

        path_data = {
            "id": path_id,
            "user_id": user_id,
            "collection_id": collection_id,
            "document_id": document_id,
            "title": title,
            "total_units": len(raw_units),
            "completed_units": 0,
            "created_at": now
        }
        # Parent learning_paths record MUST be inserted before child path_nodes foreign keys!
        if self.supabase:
            self._sb_insert("learning_paths", path_data)
        elif self.firestore:
            self.firestore.collection("learning_paths").document(path_id).set(path_data)
        else:
            memory_db.learning_paths[path_id] = path_data

        nodes = []
        for idx, u in enumerate(raw_units):
            node_id = str(uuid.uuid4())
            questions = []
            for q in u.get("questions", []):
                q_id = str(uuid.uuid4())
                options = q.get("options", [])
                questions.append({
                    "id": q_id,
                    "prompt": q["prompt"],
                    "options": options,
                    "correct_answers": q["correct_answers"],
                    "explanation": q.get("explanation", "Grounded in unit material.")
                })

            trail_type = u.get("trail_type", "main")
            # Side trails are always unlocked (optional exploration)
            is_locked = False if trail_type != "main" else (idx > 0)

            node = {
                "id": node_id,
                "path_id": path_id,
                "unit_index": idx,
                "node_type": u.get("node_type", "lesson"),
                "trail_type": trail_type,
                "branch_direction": u.get("branch_direction"),
                "branch_depth": u.get("branch_depth", 0),
                "branch_from_unit_index": u.get("branch_from_unit_index"),
                "title": u.get("title", f"Unit {idx + 1}"),
                "concept_summary": u.get("concept_summary", ""),
                "key_takeaways": u.get("key_takeaways", []),
                "substantive_content": u.get("substantive_content"),
                "source_page": u.get("source_page"),
                "slide_start": u.get("slide_start") or u.get("source_page"),
                "slide_end": u.get("slide_end") or u.get("source_page_end") or u.get("source_page"),
                "is_challenge_trail": u.get("is_challenge_trail", False),
                "difficulty": u.get("difficulty", "medium"),
                "questions": questions,
                "is_completed": False,
                "is_locked": is_locked,
                "score": None,
                "xp_reward": u.get("xp_reward", 25)
            }
            nodes.append(node)
            if not self.supabase and not self.firestore:
                memory_db.path_nodes[node_id] = node

        if self.supabase and nodes:
            # Batch insert child path nodes for high performance
            self.supabase.table("path_nodes").insert(nodes).execute()
        elif self.firestore:
            for node in nodes:
                self.firestore.collection("path_nodes").document(node["id"]).set(node)
        else:
            memory_db._save_to_disk()

        return {
            **path_data,
            "nodes": nodes
        }

    async def get_learning_path(self, path_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        path_data = None
        if self.supabase:
            path_data = self._sb_select_one("learning_paths", {"id": path_id})
            if path_data and path_data.get("user_id") != user_id:
                return None
        elif self.firestore:
            doc = self.firestore.collection("learning_paths").document(path_id).get()
            if doc.exists and doc.to_dict().get("user_id") == user_id:
                path_data = doc.to_dict()
        else:
            p = memory_db.learning_paths.get(path_id)
            if p and p["user_id"] == user_id:
                path_data = p

        if not path_data:
            return None

        # Fetch nodes
        if self.supabase:
            nodes = self._sb_select_many("path_nodes", filters={"path_id": path_id}, order_col="unit_index", order_desc=False)
        elif self.firestore:
            docs = self.firestore.collection("path_nodes").where("path_id", "==", path_id).stream()
            nodes = [d.to_dict() for d in docs]
        else:
            nodes = [n for n in memory_db.path_nodes.values() if n["path_id"] == path_id]

        nodes = sorted(nodes, key=lambda x: x["unit_index"])
        completed_count = sum(1 for n in nodes if n.get("is_completed"))

        return {
            **path_data,
            "completed_units": completed_count,
            "nodes": nodes
        }

    async def get_document_learning_path(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        path_id = None
        if self.supabase:
            q = self.supabase.table("learning_paths").select("id").eq("document_id", document_id).eq("user_id", user_id).limit(1)
            result = q.execute()
            if result.data:
                path_id = result.data[0]["id"]
        elif self.firestore:
            docs = self.firestore.collection("learning_paths").where("document_id", "==", document_id).where("user_id", "==", user_id).limit(1).stream()
            items = [d.to_dict() for d in docs]
            if items:
                path_id = items[0]["id"]
        else:
            for p in memory_db.learning_paths.values():
                if p["document_id"] == document_id and p["user_id"] == user_id:
                    path_id = p["id"]
                    break

        if path_id:
            return await self.get_learning_path(path_id, user_id)
        return None

    async def delete_document_learning_path(self, document_id: str, user_id: str) -> bool:
        """Deletes an existing learning path and its nodes for recreation/sandbox mode."""
        existing = await self.get_document_learning_path(document_id, user_id)
        if not existing:
            return False

        path_id = existing["id"]
        if self.supabase:
            self.supabase.table("path_nodes").delete().eq("path_id", path_id).execute()
            self._sb_delete("learning_paths", path_id)
        elif self.firestore:
            docs = self.firestore.collection("path_nodes").where("path_id", "==", path_id).stream()
            for d in docs:
                d.reference.delete()
            self.firestore.collection("learning_paths").document(path_id).delete()
        else:
            nodes_to_del = [n_id for n_id, n in memory_db.path_nodes.items() if n["path_id"] == path_id]
            for n_id in nodes_to_del:
                del memory_db.path_nodes[n_id]
            if path_id in memory_db.learning_paths:
                del memory_db.learning_paths[path_id]
        return True

    async def complete_path_node(
        self,
        path_id: str,
        node_id: str,
        user_id: str,
        score: float
    ) -> Dict[str, Any]:
        """Marks the current unit node as completed and unlocks the next main-path unit."""
        path = await self.get_learning_path(path_id, user_id)
        if not path:
            return {}

        nodes = path["nodes"]
        target_idx = None
        for i, n in enumerate(nodes):
            if n["id"] == node_id:
                target_idx = i
                n["is_completed"] = True
                n["score"] = score
                if self.supabase:
                    self._sb_update("path_nodes", node_id, {"is_completed": True, "score": score})
                elif self.firestore:
                    self.firestore.collection("path_nodes").document(node_id).update({
                        "is_completed": True,
                        "score": score
                    })
                else:
                    memory_db.path_nodes[node_id]["is_completed"] = True
                    memory_db.path_nodes[node_id]["score"] = score
                break

        # Unlock the next MAIN node only (side trails are always open)
        if target_idx is not None:
            # Find next main-path node
            for i in range(target_idx + 1, len(nodes)):
                next_node = nodes[i]
                if (next_node.get("trail_type", "main") == "main") and next_node.get("is_locked", False):
                    next_node["is_locked"] = False
                    if self.supabase:
                        self._sb_update("path_nodes", next_node["id"], {"is_locked": False})
                    elif self.firestore:
                        self.firestore.collection("path_nodes").document(next_node["id"]).update({"is_locked": False})
                    else:
                        memory_db.path_nodes[next_node["id"]]["is_locked"] = False
                    break

        # Award XP on in-memory path
        if user_id in memory_db.profiles:
            memory_db.profiles[user_id]["xp"] = memory_db.profiles[user_id].get("xp", 0) + 25

        if not self.supabase and not self.firestore:
            memory_db._save_to_disk()

        return await self.get_learning_path(path_id, user_id)

    # -------------------------------------------------------------------------
    # Authentication & User Profiles
    # -------------------------------------------------------------------------
    async def create_user(
        self,
        email: str,
        password_hash: str,
        salt: str,
        display_name: str
    ) -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "salt": salt,
            "display_name": display_name.strip() or email.split("@")[0],
            "xp": 0,
            "streak": 0,
            "cheerleader": "sydney",
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            return self._sb_insert("users", user_data)
        if self.firestore:
            self.firestore.collection("users").document(user_id).set(user_data)
        memory_db.users[user_id] = user_data
        return user_data

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        if self.supabase:
            return self._sb_select_one("users", {"email": clean_email})
        if self.firestore:
            docs = self.firestore.collection("users").where("email", "==", clean_email).limit(1).stream()
            results = [d.to_dict() for d in docs]
            if results:
                return results[0]
        for u in memory_db.users.values():
            if u["email"] == clean_email:
                return u
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            return self._sb_select_one("users", {"id": user_id})
        if self.firestore:
            doc = self.firestore.collection("users").document(user_id).get()
            if doc.exists:
                return doc.to_dict()
        return memory_db.users.get(user_id)

    async def list_users(self) -> List[Dict[str, Any]]:
        if self.supabase:
            return self._sb_select_many("users", order_col="created_at", order_desc=True)
        if self.firestore:
            docs = self.firestore.collection("users").stream()
            return [d.to_dict() for d in docs]
        return list(memory_db.users.values())

    # -------------------------------------------------------------------------
    # Bug Reports & Playtest Feedback
    # -------------------------------------------------------------------------
    async def create_feedback(
        self,
        user_id: str,
        email: str,
        display_name: str,
        feedback_type: str,
        message: str,
        url: str,
        browser_info: Optional[str] = None
    ) -> Dict[str, Any]:
        fb_id = str(uuid.uuid4())
        item = {
            "id": fb_id,
            "user_id": user_id,
            "email": email,
            "display_name": display_name,
            "type": feedback_type,
            "message": message,
            "url": url,
            "browser_info": browser_info or "",
            "status": "open",
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            return self._sb_insert("feedback", item)
        if self.firestore:
            self.firestore.collection("feedback").document(fb_id).set(item)
        memory_db.feedback[fb_id] = item
        return item

    async def list_feedback(self) -> List[Dict[str, Any]]:
        if self.supabase:
            return self._sb_select_many("feedback", order_col="created_at", order_desc=True)
        if self.firestore:
            docs = self.firestore.collection("feedback").stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        items = list(memory_db.feedback.values())
        return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)

    async def delete_feedback(self, feedback_id: str) -> bool:
        if self.supabase:
            self._sb_delete("feedback", feedback_id)
        if self.firestore:
            self.firestore.collection("feedback").document(feedback_id).delete()
        if feedback_id in memory_db.feedback:
            del memory_db.feedback[feedback_id]
        return True

    # -------------------------------------------------------------------------
    # Playtester Telemetry & Dev Activity Logs
    # -------------------------------------------------------------------------
    async def create_telemetry_log(
        self,
        user_id: str,
        user_email: str,
        user_name: str,
        event_type: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        log_id = str(uuid.uuid4())
        item = {
            "id": log_id,
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "event_type": event_type,
            "path": path,
            "payload": payload or {},
            "device_info": device_info or {},
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            self._sb_insert("telemetry_logs", item)
        if self.firestore:
            self.firestore.collection("telemetry_logs").document(log_id).set(item)
        memory_db.telemetry_logs[log_id] = item
        return item

    async def list_telemetry_logs(
        self,
        limit: int = 250,
        user_id: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if self.supabase:
            q = self.supabase.table("telemetry_logs").select("*").order("created_at", desc=True).limit(limit)
            if user_id:
                q = q.eq("user_id", user_id)
            if event_type and event_type != "ALL":
                q = q.eq("event_type", event_type)
            result = q.execute()
            return result.data or []
        if self.firestore:
            try:
                from firebase_admin import firestore
                query = self.firestore.collection("telemetry_logs")
                if user_id:
                    query = query.where("user_id", "==", user_id)
                if event_type and event_type != "ALL":
                    query = query.where("event_type", "==", event_type)
                docs = query.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit).stream()
                return [d.to_dict() for d in docs]
            except Exception:
                pass

        source = list(memory_db.telemetry_logs.values())
        filtered = []
        for l in source:
            if user_id and l.get("user_id") != user_id and user_id.lower() not in l.get("user_email", "").lower():
                continue
            if event_type and event_type != "ALL" and l.get("event_type") != event_type:
                continue
            filtered.append(l)

        sorted_logs = sorted(filtered, key=lambda x: x.get("created_at", ""), reverse=True)
        return sorted_logs[:limit]

    async def clear_telemetry_logs(self) -> bool:
        if self.supabase:
            self.supabase.table("telemetry_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        if self.firestore:
            try:
                docs = self.firestore.collection("telemetry_logs").stream()
                for d in docs:
                    d.reference.delete()
            except Exception:
                pass
        memory_db.telemetry_logs.clear()
        return True

    # -------------------------------------------------------------------------
    # Friend Requests & Social
    # -------------------------------------------------------------------------
    async def create_friend_request(
        self,
        from_user_id: str,
        from_email: str,
        from_name: str,
        to_email: str
    ) -> Dict[str, Any]:
        req_id = str(uuid.uuid4())
        req = {
            "id": req_id,
            "from_user_id": from_user_id,
            "from_email": from_email.strip().lower(),
            "from_name": from_name,
            "to_email": to_email.strip().lower(),
            "status": "pending",
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            return self._sb_insert("friend_requests", req)
        if self.firestore:
            self.firestore.collection("friend_requests").document(req_id).set(req)
        memory_db.friend_requests[req_id] = req
        return req

    async def list_incoming_friend_requests(self, to_email: str) -> List[Dict[str, Any]]:
        clean = to_email.strip().lower()
        if self.supabase:
            q = self.supabase.table("friend_requests").select("*").eq("to_email", clean).eq("status", "pending")
            result = q.execute()
            return result.data or []
        if self.firestore:
            docs = self.firestore.collection("friend_requests").where("to_email", "==", clean).where("status", "==", "pending").stream()
            return [d.to_dict() for d in docs]
        return [r for r in memory_db.friend_requests.values() if r["to_email"] == clean and r["status"] == "pending"]

    async def accept_friend_request(self, request_id: str, user_id: str, user_email: str) -> bool:
        req = None
        if self.supabase:
            req = self._sb_select_one("friend_requests", {"id": request_id})
        elif self.firestore:
            doc = self.firestore.collection("friend_requests").document(request_id).get()
            if doc.exists:
                req = doc.to_dict()
        else:
            req = memory_db.friend_requests.get(request_id)

        if not req or req.get("status") != "pending":
            return False

        if self.supabase:
            self._sb_update("friend_requests", request_id, {"status": "accepted"})
        elif self.firestore:
            self.firestore.collection("friend_requests").document(request_id).update({"status": "accepted"})
        else:
            memory_db.friend_requests[request_id]["status"] = "accepted"

        friendship_entry = {
            "id": str(uuid.uuid4()),
            "user1_id": req["from_user_id"],
            "user1_email": req["from_email"],
            "user1_name": req["from_name"],
            "user2_id": user_id,
            "user2_email": user_email,
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            self._sb_insert("friendships", friendship_entry)
        elif self.firestore:
            self.firestore.collection("friendships").document(friendship_entry["id"]).set(friendship_entry)
        else:
            memory_db.friendships.append(friendship_entry)
        return True

    async def decline_friend_request(self, request_id: str, user_email: str) -> bool:
        if self.supabase:
            self._sb_update("friend_requests", request_id, {"status": "declined"})
        if self.firestore:
            self.firestore.collection("friend_requests").document(request_id).update({"status": "declined"})
        if request_id in memory_db.friend_requests:
            memory_db.friend_requests[request_id]["status"] = "declined"
        return True

    async def list_friends(self, user_id: str, user_email: str) -> List[Dict[str, Any]]:
        clean_email = user_email.strip().lower()
        friends = []
        source = memory_db.friendships
        if self.supabase:
            result = self.supabase.table("friendships").select("*").execute()
            source = result.data or []
        elif self.firestore:
            docs = self.firestore.collection("friendships").stream()
            source = [d.to_dict() for d in docs]

        for f in source:
            if f.get("user1_id") == user_id or f.get("user1_email") == clean_email:
                friends.append({
                    "id": f.get("user2_id"),
                    "email": f.get("user2_email"),
                    "name": f.get("user2_email", "").split("@")[0],
                    "streak": 5,
                    "weekly_xp": 500,
                    "cheerleader": "Sydney"
                })
            elif f.get("user2_id") == user_id or f.get("user2_email") == clean_email:
                friends.append({
                    "id": f.get("user1_id"),
                    "email": f.get("user1_email"),
                    "name": f.get("user1_name") or f.get("user1_email", "").split("@")[0],
                    "streak": 6,
                    "weekly_xp": 650,
                    "cheerleader": "Connie"
                })
        return friends


db = Repository()
