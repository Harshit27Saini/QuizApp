import re
from typing import List, Dict, Any


def is_front_matter_or_index(content: str, heading: str = "", page_number: int = 1) -> bool:
    """
    Detects whether a section is front matter, a title page, a founder/dean quote,
    or a Table of Contents / Index that should not be used for study questions.
    """
    text_lower = content.lower()
    heading_lower = heading.lower()

    # 1. Obvious Table of Contents / Index patterns
    if "table of contents" in heading_lower or "index" in heading_lower:
        return True
    if "table of contents" in text_lower or "index sr" in text_lower or "sr. no" in text_lower or "sr no" in text_lower:
        return True
    if re.search(r"\bindex\b", heading_lower) or re.search(r"\bindex\s+sr\b", text_lower):
        return True
    
    # Check for index patterns like "1 Analyzing Conflicts 2 Conflicts Functional 3 ..."
    numbered_titles = len(re.findall(r"\b\d{1,2}\s+[A-Z][a-z]+", content))
    if numbered_titles >= 3 and page_number <= 5:
        return True

    # 2. Institutional Boilerplate & Welcome Speeches
    institutional_markers = [
        "department of", "subject code:", "subject code", "course code:", "course code", "syllabus",
        "from the founders", "from the founder", "founder's message", "chancellor's message",
        "vice-chancellor", "all rights reserved", "world class space of intellectual excellence",
        "universal education system", "credit system", "study material", "mit-wpu", "mit wpu",
        "faculty of", "course outline", "objective of the course", "course objectives",
        "learning objectives", "prescribed textbooks", "recommended reading"
    ]
    matches = sum(1 for marker in institutional_markers if marker in text_lower)
    if matches >= 1 and page_number <= 3:
        return True
    if matches >= 2:
        return True

    # 3. High title-to-content ratio on early pages (Cover page)
    if page_number <= 2 and len(content.split()) < 35:
        return True

    return False


def filter_studyable_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters out front-matter, title pages, indices, and university vision statements,
    returning only substantive curriculum content.
    """
    substantive = []
    for s in sections:
        page = s.get("page_number") or 1
        heading = s.get("heading") or ""
        content = s.get("content") or ""

        if not is_front_matter_or_index(content, heading, page):
            substantive.append(s)

    # If everything got filtered out, fall back to non-first-page sections or all sections
    if not substantive:
        substantive = [s for s in sections if (s.get("page_number") or 1) > 2]
    return substantive if substantive else sections

