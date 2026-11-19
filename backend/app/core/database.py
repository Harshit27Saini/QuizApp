"""
Recall Database Layer (Supabase PostgreSQL + In-Memory Dev/Test Fallback).

Architecture Standard (ADR 017 & ADR 018):
- Primary: Supabase (Managed PostgreSQL)
- Resilient Fallback: Local In-Memory DB with disk snapshot (auto-engages if Supabase is unreachable, paused, or offline)
"""

import os
import sys
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.core.config import settings


def is_test_environment() -> bool:
    """Detect if code is executing under pytest test runner."""
    return (
        "pytest" in sys.modules
        or os.getenv("PYTEST_CURRENT_TEST") is not None
        or any("pytest" in arg for arg in sys.argv)
    )


# ============================================================================
# In-Memory Database (Offline Dev, Automated Test Suite, & Resilient Fallback)
# ============================================================================
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
        # Groups & Battles
        self.groups: Dict[str, Dict[str, Any]] = {}
        self.group_members: List[Dict[str, Any]] = []
        self.battles: Dict[str, Dict[str, Any]] = {}
        self.battle_scores: List[Dict[str, Any]] = []

        if not os.getenv("PYTEST_CURRENT_TEST"):
            self._load_from_disk()
            # Clean up any leftover synthetic test collections created by automated test runners
            test_titles = {"Biology Flashcards", "Neuroscience 101"}
            orphan_coll_ids = [
                cid for cid, c in self.collections.items()
                if c.get("user_id") == "00000000-0000-0000-0000-000000000001" and c.get("title") in test_titles
            ]
            for cid in orphan_coll_ids:
                del self.collections[cid]
            if orphan_coll_ids:
                self._save_to_disk()

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
                "groups": self.groups,
                "group_members": self.group_members,
                "battles": self.battles,
                "battle_scores": self.battle_scores,
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
# Supabase client singleton
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


# ============================================================================
# Main Data Repository
# ============================================================================
class Repository:
    """
    Unified Data Repository for Recall.
    Primary: Supabase (PostgreSQL).
    Resilient Fallback: Isolated in-memory storage (dev/test/cloud failover).
    """

    def __init__(self):
        if is_test_environment():
            self.supabase = None
        else:
            self.supabase = get_supabase_client()

    def _disable_supabase(self, operation: str, error: Exception):
        """Logs the failure and falls back to in-memory storage seamlessly."""
        print(f"[Recall Database] Supabase {operation} failed: {error}. Gracefully routing to in-memory store.")
        self.supabase = None

    # -------------------------------------------------------------------------
    # Internal Supabase Helpers
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

    def _sb_select_many(
        self,
        table: str,
        filters: Optional[Dict[str, Any]] = None,
        order_col: Optional[str] = None,
        order_desc: bool = True,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
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

    # =========================================================================
    # 1. COLLECTIONS
    # =========================================================================
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
            try:
                res = self._sb_insert("collections", item)
                memory_db.collections[item["id"]] = item
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("create_collection", e)

        memory_db.collections[item["id"]] = item
        memory_db._save_to_disk()
        return item

    async def list_collections(self, user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        sb_colls = []
        if self.supabase:
            try:
                if is_admin or user_id == "00000000-0000-0000-0000-000000000001":
                    sb_colls = self._sb_select_many("collections", order_col="created_at", order_desc=True)
                else:
                    sb_colls = self._sb_select_many("collections", filters={"user_id": user_id}, order_col="created_at", order_desc=True)
            except Exception as e:
                self._disable_supabase("list_collections", e)

        # Sync Supabase collections into memory_db
        for c in sb_colls:
            memory_db.collections[c["id"]] = c
        if sb_colls:
            memory_db._save_to_disk()
            return sb_colls

        # If admin or dev founder, return all platform collections
        if is_admin or user_id == "00000000-0000-0000-0000-000000000001":
            return sorted(list(memory_db.collections.values()), key=lambda x: x.get("created_at", ""), reverse=True)

        # For student, return their collections and any guest collections on this session
        colls = [
            c for c in memory_db.collections.values()
            if c.get("user_id") == user_id or c.get("user_id", "").startswith("guest_")
        ]
        return sorted(colls, key=lambda x: x.get("created_at", ""), reverse=True)

    async def adopt_collection_to_user(self, collection_id: str, user_id: str) -> None:
        """Adopts a guest-created collection, its documents, and its quizzes to an authenticated user ID."""
        if not user_id or user_id.startswith("guest_"):
            return

        if collection_id in memory_db.collections:
            coll = memory_db.collections[collection_id]
            if coll.get("user_id") != user_id:
                coll["user_id"] = user_id
                coll["updated_at"] = memory_db.now_iso()

        for doc in memory_db.documents.values():
            if doc.get("collection_id") == collection_id and doc.get("user_id") != user_id:
                doc["user_id"] = user_id

        for q in memory_db.quizzes.values():
            if q.get("collection_id") == collection_id and q.get("user_id") != user_id:
                q["user_id"] = user_id

        memory_db._save_to_disk()

        if self.supabase:
            try:
                self._sb_update("collections", collection_id, {"user_id": user_id})
                self.supabase.table("documents").update({"user_id": user_id}).eq("collection_id", collection_id).execute()
                self.supabase.table("quizzes").update({"user_id": user_id}).eq("collection_id", collection_id).execute()
            except Exception:
                pass

    async def get_collection(self, collection_id: str, user_id: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
        if self.supabase:
            try:
                item = self._sb_select_one("collections", {"id": collection_id})
                if item and (is_admin or item.get("user_id") == user_id):
                    return item
                if item:
                    return None
            except Exception as e:
                self._disable_supabase("get_collection", e)

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
            try:
                res = self._sb_insert("collections", item)
                memory_db.collections[item["id"]] = item
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("get_or_restore_collection", e)

        memory_db.collections[item["id"]] = item
        memory_db._save_to_disk()
        return item

    async def delete_collection(self, collection_id: str, user_id: str, is_admin: bool = False) -> bool:
        if self.supabase:
            try:
                item = self._sb_select_one("collections", {"id": collection_id})
                if item and (is_admin or item.get("user_id") == user_id or item.get("user_id") == "00000000-0000-0000-0000-000000000001"):
                    self._sb_delete("collections", collection_id)
                    if collection_id in memory_db.collections:
                        del memory_db.collections[collection_id]
                        memory_db._save_to_disk()
                    return True
                return False
            except Exception as e:
                self._disable_supabase("delete_collection", e)

        if collection_id in memory_db.collections:
            coll = memory_db.collections[collection_id]
            if is_admin or coll.get("user_id") == user_id or user_id == "00000000-0000-0000-0000-000000000001":
                del memory_db.collections[collection_id]
                memory_db._save_to_disk()
                return True
        return False

    # =========================================================================
    # 2. DOCUMENTS & SECTIONS
    # =========================================================================
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
            try:
                res = self._sb_insert("documents", doc)
                memory_db.documents[doc["id"]] = doc
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("create_document", e)

        memory_db.documents[doc["id"]] = doc
        memory_db._save_to_disk()
        return doc

    async def list_documents(self, collection_id: str, user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                items = self._sb_select_many("documents", filters={"collection_id": collection_id}, order_col="created_at", order_desc=True)
                if not is_admin:
                    items = [d for d in items if d.get("user_id") == user_id]
                return items
            except Exception as e:
                self._disable_supabase("list_documents", e)

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
            try:
                doc = self._sb_select_one("documents", {"id": document_id})
                if doc and (is_admin or doc.get("user_id") == user_id):
                    return doc
                if doc:
                    return None
            except Exception as e:
                self._disable_supabase("get_document", e)

        doc = memory_db.documents.get(document_id)
        if doc:
            if is_admin or doc.get("user_id") == user_id or user_id == "00000000-0000-0000-0000-000000000001":
                return doc
            if (doc.get("user_id", "").startswith("guest_") or doc.get("user_id") == "00000000-0000-0000-0000-000000000001") and not user_id.startswith("guest_"):
                doc["user_id"] = user_id
                memory_db._save_to_disk()
                return doc
        return None

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
                try:
                    self._sb_insert("document_sections", item)
                except Exception as e:
                    self._disable_supabase("create_document_sections", e)
            memory_db.document_sections[item["id"]] = item

        memory_db._save_to_disk()
        return created

    async def get_document_sections(self, document_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("document_sections", filters={"document_id": document_id}, order_col="section_index", order_desc=False)
            except Exception as e:
                self._disable_supabase("get_document_sections", e)

        sections = [s for s in memory_db.document_sections.values() if s["document_id"] == document_id]
        return sorted(sections, key=lambda x: x.get("section_index", 0))

    # =========================================================================
    # 3. QUIZZES & QUESTIONS
    # =========================================================================
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
            try:
                res = self._sb_insert("quizzes", quiz)
                memory_db.quizzes[quiz["id"]] = quiz
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("create_quiz", e)

        memory_db.quizzes[quiz["id"]] = quiz
        for d_id in document_ids:
            memory_db.quiz_documents.append({"quiz_id": quiz["id"], "document_id": d_id})
        memory_db._save_to_disk()
        return quiz

    async def get_quiz(self, quiz_id: str, user_id: str = "", is_admin: bool = False) -> Optional[Dict[str, Any]]:
        if self.supabase:
            try:
                q = self._sb_select_one("quizzes", {"id": quiz_id})
                if q:
                    # Auto-adopt guest quiz if user is now authenticated
                    if user_id and q.get("user_id", "").startswith("guest_") and not user_id.startswith("guest_"):
                        q["user_id"] = user_id
                        try:
                            self._sb_update("quizzes", quiz_id, {"user_id": user_id})
                        except Exception:
                            pass
                    memory_db.quizzes[quiz_id] = q
                    return q
            except Exception as e:
                self._disable_supabase("get_quiz", e)

        q = memory_db.quizzes.get(quiz_id)
        if q:
            # Auto-adopt guest quiz if user is now authenticated
            if user_id and q.get("user_id", "").startswith("guest_") and not user_id.startswith("guest_"):
                q["user_id"] = user_id
                memory_db._save_to_disk()
            return q
        return None

    async def list_quizzes(self, user_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("quizzes", filters={"user_id": user_id}, order_col="created_at", order_desc=True)
            except Exception as e:
                self._disable_supabase("list_quizzes", e)

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
                try:
                    self._sb_insert("questions", item)
                except Exception as e:
                    self._disable_supabase("create_questions", e)
            memory_db.questions[item["id"]] = item

        memory_db._save_to_disk()
        return created

    async def get_quiz_questions(self, quiz_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                res = self._sb_select_many("questions", filters={"quiz_id": quiz_id})
                if res:
                    for item in res:
                        memory_db.questions[item["id"]] = item
                    return res
            except Exception as e:
                self._disable_supabase("get_quiz_questions", e)

        return [q for q in memory_db.questions.values() if q.get("quiz_id") == quiz_id]

    # =========================================================================
    # 4. QUIZ ATTEMPTS & RESPONSES
    # =========================================================================
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
            try:
                res = self._sb_insert("quiz_attempts", attempt)
                memory_db.quiz_attempts[attempt["id"]] = attempt
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("create_attempt", e)

        memory_db.quiz_attempts[attempt["id"]] = attempt
        memory_db._save_to_disk()
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
            try:
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
                ret = self._sb_select_one("quiz_attempts", {"id": attempt_id}) or {}
                if attempt_id in memory_db.quiz_attempts:
                    memory_db.quiz_attempts[attempt_id].update(update_data)
                memory_db._save_to_disk()
                return ret
            except Exception as e:
                self._disable_supabase("complete_attempt", e)

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
        memory_db._save_to_disk()
        return attempt

    async def get_attempt(self, attempt_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            try:
                att = self._sb_select_one("quiz_attempts", {"id": attempt_id})
                if att and att["user_id"] == user_id:
                    return att
                if att:
                    return None
            except Exception as e:
                self._disable_supabase("get_attempt", e)

        att = memory_db.quiz_attempts.get(attempt_id)
        if att and att["user_id"] == user_id:
            return att
        return None

    async def list_attempts(self, user_id: str, quiz_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                filters: Dict[str, Any] = {"user_id": user_id}
                if quiz_id:
                    filters["quiz_id"] = quiz_id
                return self._sb_select_many("quiz_attempts", filters=filters, order_col="started_at", order_desc=True)
            except Exception as e:
                self._disable_supabase("list_attempts", e)

        attempts = [
            a for a in memory_db.quiz_attempts.values()
            if a["user_id"] == user_id and (quiz_id is None or a["quiz_id"] == quiz_id)
        ]
        return sorted(attempts, key=lambda x: x["started_at"], reverse=True)

    async def get_attempt_responses(self, attempt_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("question_responses", filters={"attempt_id": attempt_id})
            except Exception as e:
                self._disable_supabase("get_attempt_responses", e)

        return [r for r in memory_db.question_responses.values() if r["attempt_id"] == attempt_id]

    # =========================================================================
    # 5. FLASHCARD DECKS & CARDS
    # =========================================================================
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
            try:
                res = self._sb_insert("flashcard_decks", deck)
                memory_db.flashcard_decks[deck["id"]] = deck
                return res
            except Exception as e:
                self._disable_supabase("create_flashcard_deck", e)

        memory_db.flashcard_decks[deck["id"]] = deck
        return deck

    async def get_flashcard_deck(self, deck_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            try:
                deck = self._sb_select_one("flashcard_decks", {"id": deck_id})
                if deck and deck["user_id"] == user_id:
                    return deck
                if deck:
                    return None
            except Exception as e:
                self._disable_supabase("get_flashcard_deck", e)

        deck = memory_db.flashcard_decks.get(deck_id)
        if deck and deck["user_id"] == user_id:
            return deck
        return None

    async def list_flashcard_decks(self, collection_id: str, user_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                q = self.supabase.table("flashcard_decks").select("*").eq("collection_id", collection_id).eq("user_id", user_id).order("created_at", desc=True)
                result = q.execute()
                return result.data or []
            except Exception as e:
                self._disable_supabase("list_flashcard_decks", e)

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
                try:
                    self._sb_insert("flashcards", item)
                except Exception as e:
                    self._disable_supabase("create_flashcards", e)
            memory_db.flashcards[item["id"]] = item

        return created

    async def get_deck_flashcards(self, deck_id: str) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("flashcards", filters={"deck_id": deck_id})
            except Exception as e:
                self._disable_supabase("get_deck_flashcards", e)

        return [c for c in memory_db.flashcards.values() if c["deck_id"] == deck_id]

    # =========================================================================
    # 6. LEARNING PATHS (DUNGEON PROGRESSION)
    # =========================================================================
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
        if self.supabase:
            try:
                self._sb_insert("learning_paths", path_data)
            except Exception as e:
                self._disable_supabase("create_learning_path", e)

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
            memory_db.path_nodes[node_id] = node

        if self.supabase and nodes:
            try:
                self.supabase.table("path_nodes").insert(nodes).execute()
            except Exception as e:
                self._disable_supabase("create_learning_path_nodes", e)

        memory_db._save_to_disk()

        return {
            **path_data,
            "nodes": nodes
        }

    async def get_learning_path(self, path_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        path_data = None
        if self.supabase:
            try:
                path_data = self._sb_select_one("learning_paths", {"id": path_id})
                if path_data and path_data.get("user_id") != user_id:
                    return None
            except Exception as e:
                self._disable_supabase("get_learning_path", e)

        if not path_data:
            p = memory_db.learning_paths.get(path_id)
            if p and p["user_id"] == user_id:
                path_data = p

        if not path_data:
            return None

        nodes = []
        if self.supabase:
            try:
                nodes = self._sb_select_many("path_nodes", filters={"path_id": path_id}, order_col="unit_index", order_desc=False)
            except Exception as e:
                self._disable_supabase("get_learning_path_nodes", e)

        if not nodes:
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
            try:
                q = self.supabase.table("learning_paths").select("id").eq("document_id", document_id).eq("user_id", user_id).limit(1)
                result = q.execute()
                if result.data:
                    path_id = result.data[0]["id"]
            except Exception as e:
                self._disable_supabase("get_document_learning_path", e)

        if not path_id:
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
            try:
                self.supabase.table("path_nodes").delete().eq("path_id", path_id).execute()
                self._sb_delete("learning_paths", path_id)
            except Exception as e:
                self._disable_supabase("delete_document_learning_path", e)

        nodes_to_del = [n_id for n_id, n in memory_db.path_nodes.items() if n["path_id"] == path_id]
        for n_id in nodes_to_del:
            del memory_db.path_nodes[n_id]
        if path_id in memory_db.learning_paths:
            del memory_db.learning_paths[path_id]
        memory_db._save_to_disk()
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
                    try:
                        self._sb_update("path_nodes", node_id, {"is_completed": True, "score": score})
                    except Exception as e:
                        self._disable_supabase("complete_path_node", e)

                if node_id in memory_db.path_nodes:
                    memory_db.path_nodes[node_id]["is_completed"] = True
                    memory_db.path_nodes[node_id]["score"] = score
                break

        # Unlock the next MAIN node only (side trails are always open)
        if target_idx is not None:
            for i in range(target_idx + 1, len(nodes)):
                next_node = nodes[i]
                if (next_node.get("trail_type", "main") == "main") and next_node.get("is_locked", False):
                    next_node["is_locked"] = False
                    if self.supabase:
                        try:
                            self._sb_update("path_nodes", next_node["id"], {"is_locked": False})
                        except Exception as e:
                            self._disable_supabase("unlock_next_path_node", e)

                    if next_node["id"] in memory_db.path_nodes:
                        memory_db.path_nodes[next_node["id"]]["is_locked"] = False
                    break

        # Award XP on in-memory path
        if user_id in memory_db.profiles:
            memory_db.profiles[user_id]["xp"] = memory_db.profiles[user_id].get("xp", 0) + 25

        memory_db._save_to_disk()
        return await self.get_learning_path(path_id, user_id)

    # =========================================================================
    # 7. USERS & AUTHENTICATION
    # =========================================================================
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
            try:
                res = self._sb_insert("users", user_data)
                memory_db.users[user_id] = user_data
                return res
            except Exception as e:
                self._disable_supabase("create_user", e)

        memory_db.users[user_id] = user_data
        return user_data

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        if self.supabase:
            try:
                return self._sb_select_one("users", {"email": clean_email})
            except Exception as e:
                self._disable_supabase("get_user_by_email", e)

        for u in memory_db.users.values():
            if u["email"] == clean_email:
                return u
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_one("users", {"id": user_id})
            except Exception as e:
                self._disable_supabase("get_user_by_id", e)

        return memory_db.users.get(user_id)

    async def list_users(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("users", order_col="created_at", order_desc=True)
            except Exception as e:
                self._disable_supabase("list_users", e)

        return list(memory_db.users.values())

    # =========================================================================
    # 8. FEEDBACK & BUG REPORTS
    # =========================================================================
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
            try:
                res = self._sb_insert("feedback", item)
                memory_db.feedback[fb_id] = item
                return res
            except Exception as e:
                self._disable_supabase("create_feedback", e)

        memory_db.feedback[fb_id] = item
        return item

    async def list_feedback(self) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                return self._sb_select_many("feedback", order_col="created_at", order_desc=True)
            except Exception as e:
                self._disable_supabase("list_feedback", e)

        items = list(memory_db.feedback.values())
        return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)

    async def delete_feedback(self, feedback_id: str) -> bool:
        if self.supabase:
            try:
                self._sb_delete("feedback", feedback_id)
            except Exception as e:
                self._disable_supabase("delete_feedback", e)

        if feedback_id in memory_db.feedback:
            del memory_db.feedback[feedback_id]
        return True

    # =========================================================================
    # 9. TELEMETRY & AUDIT LOGS
    # =========================================================================
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
            try:
                res = self._sb_insert("telemetry_logs", item)
                memory_db.telemetry_logs[log_id] = item
                return res
            except Exception as e:
                self._disable_supabase("create_telemetry_log", e)

        memory_db.telemetry_logs[log_id] = item
        return item

    async def list_telemetry_logs(
        self,
        limit: int = 250,
        user_id: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if self.supabase:
            try:
                q = self.supabase.table("telemetry_logs").select("*").order("created_at", desc=True).limit(limit)
                if user_id:
                    q = q.eq("user_id", user_id)
                if event_type and event_type != "ALL":
                    q = q.eq("event_type", event_type)
                result = q.execute()
                return result.data or []
            except Exception as e:
                self._disable_supabase("list_telemetry_logs", e)

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
            try:
                self.supabase.table("telemetry_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            except Exception as e:
                self._disable_supabase("clear_telemetry_logs", e)

        memory_db.telemetry_logs.clear()
        return True

    # =========================================================================
    # 10. SOCIAL & FRIENDSHIPS
    # =========================================================================
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
            try:
                res = self._sb_insert("friend_requests", req)
                memory_db.friend_requests[req_id] = req
                memory_db._save_to_disk()
                return res
            except Exception as e:
                self._disable_supabase("create_friend_request", e)

        memory_db.friend_requests[req_id] = req
        memory_db._save_to_disk()
        return req

    async def list_incoming_friend_requests(self, to_email: str) -> List[Dict[str, Any]]:
        clean = to_email.strip().lower()
        sb_reqs = []
        if self.supabase:
            try:
                q = self.supabase.table("friend_requests").select("*").eq("to_email", clean).eq("status", "pending")
                result = q.execute()
                sb_reqs = result.data or []
            except Exception as e:
                self._disable_supabase("list_incoming_friend_requests", e)

        for r in sb_reqs:
            memory_db.friend_requests[r["id"]] = r

        return [r for r in memory_db.friend_requests.values() if r.get("to_email") == clean and r.get("status") == "pending"]

    async def accept_friend_request(self, request_id: str, user_id: str, user_email: str) -> bool:
        req = None
        if self.supabase:
            try:
                req = self._sb_select_one("friend_requests", {"id": request_id})
            except Exception as e:
                self._disable_supabase("accept_friend_request_select", e)

        if not req:
            req = memory_db.friend_requests.get(request_id)

        if not req or req.get("status") != "pending":
            return False

        if self.supabase:
            try:
                self._sb_update("friend_requests", request_id, {"status": "accepted"})
            except Exception as e:
                self._disable_supabase("accept_friend_request_update", e)

        if request_id in memory_db.friend_requests:
            memory_db.friend_requests[request_id]["status"] = "accepted"

        friendship_entry = {
            "id": str(uuid.uuid4()),
            "user1_id": req["from_user_id"],
            "user1_email": req["from_email"],
            "user1_name": req.get("from_name") or req["from_email"].split("@")[0],
            "user2_id": user_id,
            "user2_email": user_email,
            "created_at": memory_db.now_iso()
        }
        if self.supabase:
            try:
                self._sb_insert("friendships", friendship_entry)
            except Exception as e:
                self._disable_supabase("accept_friend_request_friendship", e)

        memory_db.friendships.append(friendship_entry)
        memory_db._save_to_disk()
        return True

    async def decline_friend_request(self, request_id: str, user_email: str) -> bool:
        if self.supabase:
            try:
                self._sb_update("friend_requests", request_id, {"status": "declined"})
            except Exception as e:
                self._disable_supabase("decline_friend_request", e)

        if request_id in memory_db.friend_requests:
            memory_db.friend_requests[request_id]["status"] = "declined"
            memory_db._save_to_disk()
        return True

    async def list_friends(self, user_id: str, user_email: str) -> List[Dict[str, Any]]:
        clean_email = user_email.strip().lower()
        friends = []
        source = memory_db.friendships
        if self.supabase:
            try:
                result = self.supabase.table("friendships").select("*").execute()
                sb_friendships = result.data or []
                if sb_friendships:
                    # Sync into memory_db
                    known_ids = {f["id"] for f in memory_db.friendships}
                    for sf in sb_friendships:
                        if sf["id"] not in known_ids:
                            memory_db.friendships.append(sf)
                    memory_db._save_to_disk()
                    source = memory_db.friendships
            except Exception as e:
                self._disable_supabase("list_friends", e)
                source = memory_db.friendships

        for f in source:
            if f.get("user1_id") == user_id or f.get("user1_email") == clean_email:
                friends.append({
                    "id": f.get("user2_id") or f.get("id"),
                    "email": f.get("user2_email"),
                    "name": f.get("user2_email", "").split("@")[0],
                    "streak": 5,
                    "weekly_xp": 500,
                    "cheerleader": "Sydney"
                })
            elif f.get("user2_id") == user_id or f.get("user2_email") == clean_email:
                friends.append({
                    "id": f.get("user1_id") or f.get("id"),
                    "email": f.get("user1_email"),
                    "name": f.get("user1_name") or f.get("user1_email", "").split("@")[0],
                    "streak": 6,
                    "weekly_xp": 650,
                    "cheerleader": "Connie"
                })
        return friends

    # =========================================================================
    # 11. GROUPS & BATTLES
    # =========================================================================
    async def create_group(
        self,
        owner_id: str,
        owner_email: str,
        owner_name: str,
        name: str,
        emoji: str = "🔥"
    ) -> Dict[str, Any]:
        group_id = str(uuid.uuid4())
        now = memory_db.now_iso()
        group = {
            "id": group_id,
            "name": name,
            "emoji": emoji,
            "owner_id": owner_id,
            "owner_email": owner_email,
            "created_at": now
        }
        memory_db.groups[group_id] = group
        # Add owner as a member
        owner_entry = {
            "group_id": group_id,
            "user_id": owner_id,
            "email": owner_email,
            "name": owner_name,
            "role": "owner",
            "joined_at": now
        }
        memory_db.group_members.append(owner_entry)
        memory_db._save_to_disk()
        return group

    async def get_group(self, group_id: str) -> Optional[Dict[str, Any]]:
        return memory_db.groups.get(group_id)

    async def list_user_groups(self, user_id: str, user_email: str) -> List[Dict[str, Any]]:
        clean_email = user_email.strip().lower()
        member_group_ids = {
            m["group_id"]
            for m in memory_db.group_members
            if m.get("user_id") == user_id or m.get("email", "").lower() == clean_email
        }
        result = []
        for gid in member_group_ids:
            g = memory_db.groups.get(gid)
            if g:
                members = [m for m in memory_db.group_members if m["group_id"] == gid]
                result.append({**g, "member_count": len(members)})
        return sorted(result, key=lambda x: x.get("created_at", ""), reverse=True)

    async def list_group_members(self, group_id: str) -> List[Dict[str, Any]]:
        return [m for m in memory_db.group_members if m["group_id"] == group_id]

    async def add_group_member(
        self,
        group_id: str,
        user_id: str,
        email: str,
        name: str,
        role: str = "member"
    ) -> Dict[str, Any]:
        entry = {
            "group_id": group_id,
            "user_id": user_id,
            "email": email.strip().lower(),
            "name": name,
            "role": role,
            "joined_at": memory_db.now_iso()
        }
        memory_db.group_members.append(entry)
        memory_db._save_to_disk()
        return entry

    async def remove_group_member(self, group_id: str, user_id: str) -> bool:
        before = len(memory_db.group_members)
        memory_db.group_members = [
            m for m in memory_db.group_members
            if not (m["group_id"] == group_id and m["user_id"] == user_id)
        ]
        after = len(memory_db.group_members)
        if before != after:
            memory_db._save_to_disk()
            return True
        return False

    async def delete_group(self, group_id: str) -> bool:
        if group_id not in memory_db.groups:
            return False
        del memory_db.groups[group_id]
        memory_db.group_members = [m for m in memory_db.group_members if m["group_id"] != group_id]
        # Also remove associated battles
        battle_ids = [bid for bid, b in memory_db.battles.items() if b.get("group_id") == group_id]
        for bid in battle_ids:
            del memory_db.battles[bid]
        memory_db.battle_scores = [s for s in memory_db.battle_scores if s.get("battle_id") not in battle_ids]
        memory_db._save_to_disk()
        return True

    async def create_battle(
        self,
        group_id: str,
        mode: str,
        quiz_id: Optional[str],
        created_by: str
    ) -> Dict[str, Any]:
        battle_id = str(uuid.uuid4())
        now = memory_db.now_iso()
        battle = {
            "id": battle_id,
            "group_id": group_id,
            "mode": mode,
            "quiz_id": quiz_id,
            "status": "waiting",
            "teams": {},
            "created_by": created_by,
            "started_at": now,
            "finished_at": None
        }
        memory_db.battles[battle_id] = battle
        memory_db._save_to_disk()
        return battle

    async def get_battle(self, battle_id: str) -> Optional[Dict[str, Any]]:
        return memory_db.battles.get(battle_id)

    async def list_battles_for_group(self, group_id: str) -> List[Dict[str, Any]]:
        result = [b for b in memory_db.battles.values() if b.get("group_id") == group_id]
        return sorted(result, key=lambda x: x.get("started_at", ""), reverse=True)

    async def add_battle_score(
        self,
        battle_id: str,
        user_id: str,
        email: str,
        name: str
    ) -> Dict[str, Any]:
        entry = {
            "battle_id": battle_id,
            "user_id": user_id,
            "email": email.strip().lower(),
            "name": name,
            "score": None,
            "accuracy": None,
            "time_taken_seconds": None,
            "eliminated_at": None
        }
        memory_db.battle_scores.append(entry)
        # Mark battle as active once first player joins
        if battle_id in memory_db.battles and memory_db.battles[battle_id]["status"] == "waiting":
            memory_db.battles[battle_id]["status"] = "active"
        memory_db._save_to_disk()
        return entry

    async def list_battle_scores(self, battle_id: str) -> List[Dict[str, Any]]:
        return [s for s in memory_db.battle_scores if s["battle_id"] == battle_id]

    async def update_battle_score(
        self,
        battle_id: str,
        user_id: str,
        score: float,
        accuracy: float,
        time_taken_seconds: int,
        eliminated_at: Optional[str] = None
    ) -> Dict[str, Any]:
        for entry in memory_db.battle_scores:
            if entry["battle_id"] == battle_id and entry["user_id"] == user_id:
                entry["score"] = score
                entry["accuracy"] = accuracy
                entry["time_taken_seconds"] = time_taken_seconds
                entry["eliminated_at"] = eliminated_at
                memory_db._save_to_disk()
                return entry
        return {}

    async def update_battle_status(self, battle_id: str, status: str) -> bool:
        if battle_id in memory_db.battles:
            memory_db.battles[battle_id]["status"] = status
            if status == "finished":
                memory_db.battles[battle_id]["finished_at"] = memory_db.now_iso()
            memory_db._save_to_disk()
            return True
        return False


db = Repository()
