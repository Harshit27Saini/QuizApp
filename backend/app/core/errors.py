from fastapi import HTTPException, status


class RecallException(Exception):
    """Base exception for Recall application."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class DocumentParsingError(RecallException):
    """Raised when text or structure extraction fails on an uploaded file."""
    pass


class AIProviderError(RecallException):
    """Raised when an AI provider fails to generate or format a response."""
    pass


class QuizValidationError(RecallException):
    """Raised when generated questions fail strict schema or quote validation."""
    pass


def not_found_error(entity: str, entity_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{entity} with id '{entity_id}' not found."
    )


def bad_request_error(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail
    )

