from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.errors import RecallException, DocumentParsingError, QuizValidationError, AIProviderError
from app.api.v1.router import api_v1_router

app = FastAPI(
    title="Recall API",
    description="Backend services for Recall — AI-Powered Personal Learning Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(DocumentParsingError)
async def document_parsing_error_handler(request: Request, exc: DocumentParsingError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"Document extraction error: {exc.message}"}
    )


@app.exception_handler(QuizValidationError)
async def quiz_validation_error_handler(request: Request, exc: QuizValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"Quiz generation validation error: {exc.message}"}
    )


@app.exception_handler(AIProviderError)
async def ai_provider_error_handler(request: Request, exc: AIProviderError):
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": f"AI provider error: {exc.message}"}
    )


@app.exception_handler(RecallException)
async def generic_recall_error_handler(request: Request, exc: RecallException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )


# Mount API Routers
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "recall-backend",
        "version": "1.0.0",
        "ai_provider": settings.AI_PROVIDER
    }

