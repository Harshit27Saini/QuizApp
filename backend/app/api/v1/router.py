from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.collections import router as collections_router
from app.api.v1.documents import router as documents_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.attempts import router as attempts_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.learning_paths import router as learning_paths_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.friends import router as friends_router
from app.api.v1.telemetry import router as telemetry_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(collections_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(quizzes_router)
api_v1_router.include_router(attempts_router)
api_v1_router.include_router(flashcards_router)
api_v1_router.include_router(learning_paths_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(friends_router)
api_v1_router.include_router(telemetry_router)
