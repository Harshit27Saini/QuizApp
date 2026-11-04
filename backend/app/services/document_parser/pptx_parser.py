import io
import pptx
from app.services.document_parser.base import BaseDocumentParser, ParsedDocument, ParsedSection
from app.core.errors import DocumentParsingError


class PptxParser(BaseDocumentParser):
    def parse_bytes(self, content_bytes: bytes, filename: str) -> ParsedDocument:
        try:
            prs = pptx.Presentation(io.BytesIO(content_bytes))
        except Exception as e:
            raise DocumentParsingError(f"Failed to open PowerPoint presentation '{filename}': {str(e)}")

        total_slides = len(prs.slides)
        if total_slides == 0:
            raise DocumentParsingError(f"PowerPoint presentation '{filename}' has no slides.")

        sections = []
        full_text_list = []
        section_idx = 0

        for slide_idx, slide in enumerate(prs.slides):
            slide_num = slide_idx + 1
            heading = f"Slide {slide_num}"
            slide_texts = []

            for shape in slide.shapes:
                if not shape.has_text_frame:
                    continue

                shape_lines = []
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        shape_lines.append(line)

                block_text = "\n".join(shape_lines)
                if not block_text:
                    continue

                # Check if this shape is the title shape
                if shape == slide.shapes.title:
                    heading = block_text
                else:
                    slide_texts.append(block_text)

            content = "\n\n".join(slide_texts).strip()
            # If the slide only had a title shape
            if not content and heading != f"Slide {slide_num}":
                content = heading

            if content:
                full_text_list.append(f"{heading}\n{content}")
                sections.append(ParsedSection(
                    section_index=section_idx,
                    page_number=slide_num,
                    heading=heading,
                    content=content,
                    token_estimate=len(content) // 4
                ))
                section_idx += 1

        raw_text = "\n\n".join(full_text_list).strip()
        if not raw_text or len(raw_text) < 20:
            raise DocumentParsingError(f"No extractable text found in PowerPoint presentation '{filename}'.")

        return ParsedDocument(
            filename=filename,
            file_type="pptx",
            total_pages=total_slides,
            sections=sections,
            raw_text=raw_text
        )

