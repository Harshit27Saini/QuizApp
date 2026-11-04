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
    
    # Check for index patterns like "1 Analyzing Conflicts 2 Conflicts Functional 3 ..."
    numbered_titles = len(re.findall(r"\b\d{1,2}\s+[A-Z][a-z]+", content))
    if numbered_titles >= 4:
        return True

    # 2. Institutional Boilerplate & Welcome Speeches
    institutional_markers = [
        "department of", "subject code:", "course code:", "syllabus",
        "from the founders", "founder's message", "chancellor's message",
        "vice-chancellor", "all rights reserved", "world class space of intellectual excellence",
        "universal education system", "credit system", "study material", "mit-wpu", "mit wpu"
    ]
    matches = sum(1 for marker in institutional_markers if marker in text_lower)
    if matches >= 2 and page_number <= 4:
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

