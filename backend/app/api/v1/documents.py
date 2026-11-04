import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from app.core.security import get_current_user
from app.core.database import db
from app.core.config import settings
from app.core.errors import not_found_error, bad_request_error
from app.services.document_parser import parse_document
from app.schemas.document import DocumentResponse, DocumentDetailResponse, DocumentSectionResponse

router = APIRouter(tags=["Documents & Ingestion"])


@router.post("/collections/{collection_id}/documents", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    collection_id: str,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads a document (PDF, DOCX, PPTX, TXT), extracts text and structural sections,
    and returns parsed sections for immediate document preview.
    """
    coll = await db.get_collection(collection_id, current_user["id"])
    if not coll:
        raise not_found_error("Collection", collection_id)

    # Validate file extension
    filename = file.filename or "uploaded_document"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".pptx", ".txt"]:
        raise bad_request_error(f"Unsupported file format '{ext}'. Must be PDF, DOCX, PPTX, or TXT.")

    content_bytes = await file.read()
    file_size = len(content_bytes)

    if file_size > settings.max_upload_bytes:
        raise bad_request_error(f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")

    # Parse document structure, pages, and sections
    parsed = parse_document(content_bytes, filename)

    # Persist document record
    doc_record = await db.create_document(
        collection_id=collection_id,
        user_id=current_user["id"],
        filename=filename,
        file_type=ext.replace(".", ""),
        file_size_bytes=file_size,
        storage_path=f"documents/{current_user['id']}/{filename}",
        total_pages=parsed.total_pages,
        status="ready"
    )

    # Persist extracted sections
    section_payloads = [
        {
            "document_id": doc_record["id"],
            "section_index": s.section_index,
            "page_number": s.page_number,
            "heading": s.heading,
            "content": s.content,
            "token_estimate": s.token_estimate
        }
        for s in parsed.sections
    ]
    created_sections = await db.create_document_sections(section_payloads)

    return {
        **doc_record,
        "sections": created_sections
    }


@router.get("/collections/{collection_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists all uploaded documents within a collection."""
    return await db.list_documents(collection_id=collection_id, user_id=current_user["id"])


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document_preview(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Document Preview Endpoint: Returns the document metadata and extracted sections
    so users can verify text extraction fidelity before generating a quiz.
    """
    doc = await db.get_document(document_id, current_user["id"])
    if not doc:
        raise not_found_error("Document", document_id)

    sections = await db.get_document_sections(document_id)
    return {
        **doc,
        "sections": sections
    }
