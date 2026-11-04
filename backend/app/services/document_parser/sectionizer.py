import os
from typing import Dict, Type
from app.services.document_parser.base import BaseDocumentParser, ParsedDocument
from app.services.document_parser.pdf_parser import PDFParser
from app.services.document_parser.docx_parser import DocxParser
from app.services.document_parser.pptx_parser import PptxParser
from app.services.document_parser.text_parser import TextParser
from app.core.errors import DocumentParsingError, bad_request_error


PARSER_REGISTRY: Dict[str, Type[BaseDocumentParser]] = {
    ".pdf": PDFParser,
    ".docx": DocxParser,
    ".pptx": PptxParser,
    ".txt": TextParser,
}


def parse_document(content_bytes: bytes, filename: str) -> ParsedDocument:
    """
    Validates file type and routes document bytes to the appropriate parser.
    Preserves page boundaries, headings, and structured sectioning.
    """
    ext = os.path.splitext(filename)[1].lower()
    parser_cls = PARSER_REGISTRY.get(ext)
    if not parser_cls:
        supported = ", ".join(PARSER_REGISTRY.keys())
        raise bad_request_error(f"Unsupported file format '{ext}'. Supported formats: {supported}")

    parser = parser_cls()
    parsed = parser.parse_bytes(content_bytes, filename)
    return parsed

