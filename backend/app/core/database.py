import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.core.config import settings


class InMemoryDB:
    """Thread-safe in-memory store for local testing & development without Supabase."""
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

    def now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()


# Global in-memory storage instance
memory_db = InMemoryDB()


def get_supabase_client() -> Optional[Client]:
    """Returns an active Supabase client if configured in .env, otherwise None."""
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except Exception:
            return None
    return None


class Repository:
    """
    Unified Data Repository.
    Reads/writes to Supabase when credentials exist, otherwise falls back to memory_db.
    """
    def __init__(self):
        self.client = get_supabase_client()

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
        if self.client:
            res = self.client.table("collections").insert(item).execute()
            return res.data[0]
        memory_db.collections[item["id"]] = item
        return item

    async def list_collections(self, user_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("collections").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data
        return [c for c in memory_db.collections.values() if c["user_id"] == user_id]

    async def get_collection(self, collection_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.client:
            res = self.client.table("collections").select("*").eq("id", collection_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        item = memory_db.collections.get(collection_id)
        if item and item["user_id"] == user_id:
            return item
        return None

    async def delete_collection(self, collection_id: str, user_id: str) -> bool:
        if self.client:
            res = self.client.table("collections").delete().eq("id", collection_id).eq("user_id", user_id).execute()
            return bool(res.data)
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
        if self.client:
            res = self.client.table("documents").insert(doc).execute()
            return res.data[0]
        memory_db.documents[doc["id"]] = doc
        return doc

    async def list_documents(self, collection_id: str, user_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("documents").select("*").eq("collection_id", collection_id).eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data
        return [d for d in memory_db.documents.values() if d["collection_id"] == collection_id and d["user_id"] == user_id]

    async def get_document(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.client:
            res = self.client.table("documents").select("*").eq("id", document_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
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
            memory_db.document_sections[item["id"]] = item

        if self.client and created:
            res = self.client.table("document_sections").insert(created).execute()
            return res.data
        return created

    async def get_document_sections(self, document_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("document_sections").select("*").eq("document_id", document_id).order("section_index").execute()
            return res.data
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
            "created_at": memory_db.now_iso()
        }
        if self.client:
            res = self.client.table("quizzes").insert(quiz).execute()
            quiz = res.data[0]
            # Link documents
            links = [{"quiz_id": quiz["id"], "document_id": d_id} for d_id in document_ids]
            if links:
                self.client.table("quiz_documents").insert(links).execute()
            return quiz

        memory_db.quizzes[quiz["id"]] = quiz
        for d_id in document_ids:
            memory_db.quiz_documents.append({"quiz_id": quiz["id"], "document_id": d_id})
        return quiz

    async def get_quiz(self, quiz_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        if self.client:
            res = self.client.table("quizzes").select("*").eq("id", quiz_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        q = memory_db.quizzes.get(quiz_id)
        if q and q["user_id"] == user_id:
            return q
        return None

    async def list_quizzes(self, user_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("quizzes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data
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
            memory_db.questions[item["id"]] = item

        if self.client and created:
            res = self.client.table("questions").insert(created).execute()
            return res.data
        return created

    async def get_quiz_questions(self, quiz_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("questions").select("*").eq("quiz_id", quiz_id).execute()
            return res.data
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
        if self.client:
            res = self.client.table("quiz_attempts").insert(attempt).execute()
            return res.data[0]
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
        if self.client:
            self.client.table("quiz_attempts").update({
                "score": score,
                "correct_count": correct_count,
                "time_taken_seconds": time_taken_seconds,
                "completed_at": now
            }).eq("id", attempt_id).eq("user_id", user_id).execute()

            # Record individual responses
            if responses:
                resp_payload = [
                    {
                        "id": str(uuid.uuid4()),
                        "attempt_id": attempt_id,
                        "question_id": r["question_id"],
                        "user_id": user_id,
                        "selected_options": r["selected_options"],
                        "is_correct": r["is_correct"],
                        "time_spent_seconds": r.get("time_spent_seconds", 0),
                        "created_at": now
                    }
                    for r in responses
                ]
                self.client.table("question_responses").insert(resp_payload).execute()
            
            res = self.client.table("quiz_attempts").select("*").eq("id", attempt_id).execute()
            return res.data[0]

        # In-memory update
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
        if self.client:
            res = self.client.table("quiz_attempts").select("*").eq("id", attempt_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        att = memory_db.quiz_attempts.get(attempt_id)
        if att and att["user_id"] == user_id:
            return att
        return None

    async def list_attempts(self, user_id: str, quiz_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.client:
            query = self.client.table("quiz_attempts").select("*").eq("user_id", user_id)
            if quiz_id:
                query = query.eq("quiz_id", quiz_id)
            res = query.order("started_at", desc=True).execute()
            return res.data
        attempts = [
            a for a in memory_db.quiz_attempts.values()
            if a["user_id"] == user_id and (quiz_id is None or a["quiz_id"] == quiz_id)
        ]
        return sorted(attempts, key=lambda x: x["started_at"], reverse=True)

    async def get_attempt_responses(self, attempt_id: str) -> List[Dict[str, Any]]:
        if self.client:
            res = self.client.table("question_responses").select("*").eq("attempt_id", attempt_id).execute()
            return res.data
        return [r for r in memory_db.question_responses.values() if r["attempt_id"] == attempt_id]


db = Repository()
