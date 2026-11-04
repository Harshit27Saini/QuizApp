from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel


class ParsedSection(BaseModel):
    section_index: int
    page_number: Optional[int] = None
    heading: str = ""
    content: str
    token_estimate: int = 0


class ParsedDocument(BaseModel):
    filename: str
    file_type: str
    total_pages: int
    sections: List[ParsedSection]
    raw_text: str


class BaseDocumentParser(ABC):
    @abstractmethod
    def parse_bytes(self, content_bytes: bytes, filename: str) -> ParsedDocument:
        """Parses raw document bytes and returns structured sections preserving pages & headings."""
        pass
