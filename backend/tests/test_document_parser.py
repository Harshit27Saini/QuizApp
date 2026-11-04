import io
import pytest
import fitz
import docx
import pptx
from app.services.document_parser import parse_document
from app.core.errors import DocumentParsingError, HTTPException


def test_txt_parser():
    txt_content = b"# Introduction to Recall\nRecall is an active learning platform.\n\n# Architecture\nModular monolith design."
    parsed = parse_document(txt_content, "sample.txt")
    assert parsed.file_type == "txt"
    assert len(parsed.sections) == 2
    assert parsed.sections[0].heading == "Introduction to Recall"
    assert "active learning" in parsed.sections[0].content


def test_pdf_parser():
    # Generate an in-memory PDF with 2 pages using PyMuPDF
    doc = fitz.open()
    
    # Page 1
    p1 = doc.new_page()
    p1.insert_text((50, 50), "CHAPTER 1: CELL BIOLOGY\nCells are the basic structural units of all living organisms.")
    
    # Page 2
    p2 = doc.new_page()
    p2.insert_text((50, 50), "CHAPTER 2: MITOSIS\nMitosis is the process of nuclear division in eukaryotic cells.")

    pdf_bytes = doc.tobytes()
    doc.close()

    parsed = parse_document(pdf_bytes, "biology.pdf")
    assert parsed.file_type == "pdf"
    assert parsed.total_pages == 2
    assert len(parsed.sections) >= 2
    assert parsed.sections[0].page_number == 1
    assert "basic structural units" in parsed.sections[0].content


def test_docx_parser():
    doc = docx.Document()
    doc.add_heading("Operating Systems Concepts", level=1)
    doc.add_paragraph("Processes and threads are fundamental execution models.")
    doc.add_heading("Memory Management", level=1)
    doc.add_paragraph("Virtual memory allows execution of processes that are not completely in memory.")

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    parsed = parse_document(docx_bytes, "os.docx")
    assert parsed.file_type == "docx"
    assert len(parsed.sections) >= 2
    assert "Processes and threads" in parsed.raw_text


def test_pptx_parser():
    prs = pptx.Presentation()
    
    # Slide 1
    slide_layout = prs.slide_layouts[0]
    slide1 = prs.slides.add_slide(slide_layout)
    slide1.shapes.title.text = "Distributed Systems"
    slide1.placeholders[1].text = "CAP Theorem: Consistency, Availability, Partition Tolerance."

    buf = io.BytesIO()
    prs.save(buf)
    pptx_bytes = buf.getvalue()

    parsed = parse_document(pptx_bytes, "distributed.pptx")
    assert parsed.file_type == "pptx"
    assert parsed.total_pages == 1
    assert "Distributed Systems" in parsed.sections[0].heading
    assert "CAP Theorem" in parsed.sections[0].content


def test_empty_document_raises_error():
    with pytest.raises(DocumentParsingError):
        parse_document(b"", "empty.txt")



def test_front_matter_filtering():
    from app.services.document_parser.filter import is_front_matter_or_index

    # Institutional title page
    cover = "Department of Peace Studies Study Material Managing Conflict Peacefully Subject Code: PCE3UC03A"
    assert is_front_matter_or_index(cover, page_number=1) is True

    # University Founder quote
    founder_quote = "With the synergy of academia with technology, we are committed to make MIT-WPU a world class space."
    assert is_front_matter_or_index(founder_quote, page_number=2) is True

    # Table of Contents
    toc = "1 Analyzing Conflicts 2 Conflicts Functional and Dysfunctional 3 Conflict Handling Mechanism 4 Conflict Management"
    assert is_front_matter_or_index(toc, page_number=3) is True

    # Real academic content
    academic_text = "Conflict analysis examines the root causes, stakeholders, and dynamics of disputes to identify pathways for resolution."
    assert is_front_matter_or_index(academic_text, page_number=5) is False
