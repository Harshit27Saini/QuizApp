import fitz  # PyMuPDF
from app.services.document_parser.base import BaseDocumentParser, ParsedDocument, ParsedSection
from app.core.errors import DocumentParsingError


class PDFParser(BaseDocumentParser):
    def parse_bytes(self, content_bytes: bytes, filename: str) -> ParsedDocument:
        try:
            doc = fitz.open(stream=content_bytes, filetype="pdf")
        except Exception as e:
            raise DocumentParsingError(f"Failed to open PDF document '{filename}': {str(e)}")

        total_pages = len(doc)
        if total_pages == 0:
            raise DocumentParsingError(f"PDF document '{filename}' is empty.")

        sections = []
        full_text_list = []
        section_idx = 0

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_num = page_idx + 1
            # Extract structured text blocks: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            
            page_text_blocks = []
            current_heading = f"Page {page_num}"

            for b in blocks:
                # b[4] is the text content, b[6] is block_type (0 is text, 1 is image)
                if len(b) > 4 and b[6] == 0:
                    text = b[4].strip()
                    if not text:
                        continue
                    
                    # Heuristic for headings: short line (< 80 chars), uppercase or title case, no terminal period
                    first_line = text.split("\n")[0].strip()
                    if len(first_line) < 80 and (first_line.isupper() or first_line.istitle()) and not first_line.endswith("."):
                        current_heading = first_line

                    page_text_blocks.append(text)

            page_content = "\n\n".join(page_text_blocks).strip()
            if page_content:
                full_text_list.append(page_content)
                sections.append(ParsedSection(
                    section_index=section_idx,
                    page_number=page_num,
                    heading=current_heading,
                    content=page_content,
                    token_estimate=len(page_content) // 4
                ))
                section_idx += 1

        raw_text = "\n\n".join(full_text_list).strip()
        if not raw_text or len(raw_text) < 20:
            raise DocumentParsingError(
                f"No extractable text found in '{filename}'. This PDF may be a scanned image or empty. Searchable text is required."
            )

        return ParsedDocument(
            filename=filename,
            file_type="pdf",
            total_pages=total_pages,
            sections=sections,
            raw_text=raw_text
        )
