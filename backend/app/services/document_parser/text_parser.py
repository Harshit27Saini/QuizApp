import re
from app.services.document_parser.base import BaseDocumentParser, ParsedDocument, ParsedSection
from app.core.errors import DocumentParsingError


class TextParser(BaseDocumentParser):
    def parse_bytes(self, content_bytes: bytes, filename: str) -> ParsedDocument:
        try:
            raw_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                raw_text = content_bytes.decode("latin-1")
            except Exception as e:
                raise DocumentParsingError(f"Could not decode text file '{filename}': {str(e)}")

        raw_text = raw_text.strip()
        if not raw_text or len(raw_text) < 10:
            raise DocumentParsingError(f"Text file '{filename}' is empty or contains insufficient content.")

        # Split by markdown headers (# Header) or double line breaks with short titles
        lines = raw_text.splitlines()
        sections = []
        current_heading = "Overview"
        current_lines = []
        section_idx = 0
        current_page = 1
        word_count = 0

        def commit_section():
            nonlocal section_idx, current_heading, current_lines, current_page
            content = "\n".join(current_lines).strip()
            if content:
                sections.append(ParsedSection(
                    section_index=section_idx,
                    page_number=current_page,
                    heading=current_heading,
                    content=content,
                    token_estimate=len(content) // 4
                ))
                section_idx += 1
                current_lines = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            words = len(trimmed.split())
            word_count += words
            if word_count > 300:
                current_page += 1
                word_count = 0

            header_match = re.match(r"^#{1,3}\s+(.+)$", trimmed)
            if header_match:
                commit_section()
                current_heading = header_match.group(1).strip()
            elif len(trimmed) < 60 and trimmed.isupper():
                commit_section()
                current_heading = trimmed
            else:
                current_lines.append(line)

        commit_section()

        return ParsedDocument(
            filename=filename,
            file_type="txt",
            total_pages=max(1, current_page),
            sections=sections,
            raw_text=raw_text
        )
