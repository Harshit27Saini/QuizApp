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
        self.learning_paths: Dict[str, Dict[str, Any]] = {}
        self.path_nodes: Dict[str, Dict[str, Any]] = {}
        self.users: Dict[str, Dict[str, Any]] = {}
        self.feedback: Dict[str, Dict[str, Any]] = {}
        self.friend_requests: Dict[str, Dict[str, Any]] = {}
        self.friendships: List[Dict[str, Any]] = []

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

    # -------------------------------------------------------------------------
    # Learning Paths (Duolingo-style progression)
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

        nodes = []
        for idx, u in enumerate(raw_units):
            node_id = str(uuid.uuid4())
            # Format questions with unique IDs
            questions = []
            for q_idx, q in enumerate(u.get("questions", [])):
                q_id = str(uuid.uuid4())
                options = q.get("options", [])
                questions.append({
                    "id": q_id,
                    "prompt": q["prompt"],
                    "options": options,
                    "correct_answers": q["correct_answers"],
                    "explanation": q.get("explanation", "Grounded in unit material.")
                })

            node = {
                "id": node_id,
                "path_id": path_id,
                "unit_index": idx,
                "node_type": u.get("node_type", "lesson"),
                "title": u.get("title", f"Unit {idx + 1}"),
                "concept_summary": u.get("concept_summary", ""),
                "key_takeaways": u.get("key_takeaways", []),
                "substantive_content": u.get("substantive_content"),
                "source_page": u.get("source_page"),
                "questions": questions,
                "is_completed": False,
                "is_locked": idx > 0,  # First node is unlocked by default!
                "score": None,
                "xp_reward": 25
            }
            nodes.append(node)
            if self.firestore:
                self.firestore.collection("path_nodes").document(node_id).set(node)
            else:
                memory_db.path_nodes[node_id] = node

        path_data = {
            "id": path_id,
            "user_id": user_id,
            "collection_id": collection_id,
            "document_id": document_id,
            "title": title,
            "total_units": len(nodes),
            "completed_units": 0,
            "created_at": now
        }
        if self.firestore:
            self.firestore.collection("learning_paths").document(path_id).set(path_data)
        else:
            memory_db.learning_paths[path_id] = path_data

        return {
            **path_data,
            "nodes": nodes
        }

    async def get_learning_path(self, path_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        path_data = None
        if self.firestore:
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
        if self.firestore:
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
        if self.firestore:
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
        if self.firestore:
            # Delete nodes
            docs = self.firestore.collection("path_nodes").where("path_id", "==", path_id).stream()
            for d in docs:
                d.reference.delete()
            self.firestore.collection("learning_paths").document(path_id).delete()
        else:
            # In-memory delete
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
        """Marks the current unit node as completed and unlocks the next unit."""
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
                if self.firestore:
                    self.firestore.collection("path_nodes").document(node_id).update({
                        "is_completed": True,
                        "score": score
                    })
                else:
                    memory_db.path_nodes[node_id]["is_completed"] = True
                    memory_db.path_nodes[node_id]["score"] = score
                break

        # Unlock the next node if it exists
        if target_idx is not None and target_idx + 1 < len(nodes):
            next_node = nodes[target_idx + 1]
            next_node["is_locked"] = False
            if self.firestore:
                self.firestore.collection("path_nodes").document(next_node["id"]).update({
                    "is_locked": False
                })
            else:
                memory_db.path_nodes[next_node["id"]]["is_locked"] = False

        # Award user XP (25 XP for passing unit)
        if user_id in memory_db.profiles:
            memory_db.profiles[user_id]["xp"] = memory_db.profiles[user_id].get("xp", 0) + 25

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
            "xp": 250,
            "streak": 1,
            "cheerleader": "founder",
            "created_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("users").document(user_id).set(user_data)
        memory_db.users[user_id] = user_data
        return user_data

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
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
        if self.firestore:
            doc = self.firestore.collection("users").document(user_id).get()
            if doc.exists:
                return doc.to_dict()
        return memory_db.users.get(user_id)

    async def list_users(self) -> List[Dict[str, Any]]:
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
        if self.firestore:
            self.firestore.collection("feedback").document(fb_id).set(item)
        memory_db.feedback[fb_id] = item
        return item

    async def list_feedback(self) -> List[Dict[str, Any]]:
        if self.firestore:
            docs = self.firestore.collection("feedback").stream()
            items = [d.to_dict() for d in docs]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        items = list(memory_db.feedback.values())
        return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)

    async def delete_feedback(self, feedback_id: str) -> bool:
        if self.firestore:
            self.firestore.collection("feedback").document(feedback_id).delete()
        if feedback_id in memory_db.feedback:
            del memory_db.feedback[feedback_id]
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
        if self.firestore:
            self.firestore.collection("friend_requests").document(req_id).set(req)
        memory_db.friend_requests[req_id] = req
        return req

    async def list_incoming_friend_requests(self, to_email: str) -> List[Dict[str, Any]]:
        clean = to_email.strip().lower()
        if self.firestore:
            docs = self.firestore.collection("friend_requests").where("to_email", "==", clean).where("status", "==", "pending").stream()
            return [d.to_dict() for d in docs]
        return [r for r in memory_db.friend_requests.values() if r["to_email"] == clean and r["status"] == "pending"]

    async def accept_friend_request(self, request_id: str, user_id: str, user_email: str) -> bool:
        req = memory_db.friend_requests.get(request_id)
        if self.firestore:
            doc = self.firestore.collection("friend_requests").document(request_id).get()
            if doc.exists:
                req = doc.to_dict()
        if not req or req.get("status") != "pending":
            return False

        req["status"] = "accepted"
        if self.firestore:
            self.firestore.collection("friend_requests").document(request_id).update({"status": "accepted"})
        else:
            memory_db.friend_requests[request_id]["status"] = "accepted"

        # Record friendship both directions
        friendship_entry = {
            "id": str(uuid.uuid4()),
            "user1_id": req["from_user_id"],
            "user1_email": req["from_email"],
            "user1_name": req["from_name"],
            "user2_id": user_id,
            "user2_email": user_email,
            "created_at": memory_db.now_iso()
        }
        if self.firestore:
            self.firestore.collection("friendships").document(friendship_entry["id"]).set(friendship_entry)
        memory_db.friendships.append(friendship_entry)
        return True

    async def decline_friend_request(self, request_id: str, user_email: str) -> bool:
        if self.firestore:
            self.firestore.collection("friend_requests").document(request_id).update({"status": "declined"})
        if request_id in memory_db.friend_requests:
            memory_db.friend_requests[request_id]["status"] = "declined"
        return True

    async def list_friends(self, user_id: str, user_email: str) -> List[Dict[str, Any]]:
        clean_email = user_email.strip().lower()
        friends = []
        source = memory_db.friendships
        if self.firestore:
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
