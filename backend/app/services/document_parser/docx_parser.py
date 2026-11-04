import io
import docx
from app.services.document_parser.base import BaseDocumentParser, ParsedDocument, ParsedSection
from app.core.errors import DocumentParsingError


class DocxParser(BaseDocumentParser):
    def parse_bytes(self, content_bytes: bytes, filename: str) -> ParsedDocument:
        try:
            doc = docx.Document(io.BytesIO(content_bytes))
        except Exception as e:
            raise DocumentParsingError(f"Failed to open Word document '{filename}': {str(e)}")

        sections = []
        full_text_list = []
        current_heading = "Introduction"
        current_content_paragraphs = []
        section_idx = 0
        current_word_count = 0
        current_page = 1

        def commit_section():
            nonlocal section_idx, current_heading, current_content_paragraphs, current_page
            text = "\n\n".join(current_content_paragraphs).strip()
            if text:
                full_text_list.append(text)
                sections.append(ParsedSection(
                    section_index=section_idx,
                    page_number=current_page,
                    heading=current_heading,
                    content=text,
                    token_estimate=len(text) // 4
                ))
                section_idx += 1
                current_content_paragraphs = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            words = len(text.split())
            current_word_count += words
            # Approximate a page break roughly every 350 words in DOCX
            if current_word_count > 350:
                current_page += 1
                current_word_count = 0

            style_name = (p.style.name if p.style else "").lower()
            if "heading" in style_name or (len(text) < 60 and text.isupper()):
                commit_section()
                current_heading = text
            else:
                current_content_paragraphs.append(text)

        # Include table text if any
        for table in doc.tables:
            table_lines = []
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    table_lines.append(" | ".join(cells))
            if table_lines:
                current_content_paragraphs.append("\n".join(table_lines))

        commit_section()

        raw_text = "\n\n".join(full_text_list).strip()
        if not raw_text or len(raw_text) < 20:
            raise DocumentParsingError(f"No extractable text found in Word document '{filename}'.")

        return ParsedDocument(
            filename=filename,
            file_type="docx",
            total_pages=max(1, current_page),
            sections=sections,
            raw_text=raw_text
        )

