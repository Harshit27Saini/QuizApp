import re
from typing import List, Dict, Any, Optional
from app.services.ai.factory import get_ai_provider
from app.services.document_parser.filter import filter_studyable_sections
from app.services.quiz_engine.validator import shuffle_question_options

LEARNING_PATH_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "units": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "node_type": {
                        "type": "string",
                        "enum": ["lesson", "scenario", "checkpoint"]
                    },
                    "title": {"type": "string"},
                    "concept_summary": {"type": "string"},
                    "key_takeaways": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "substantive_content": {
                        "type": "object",
                        "properties": {
                            "overview": {"type": "string"},
                            "mechanisms": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "examples": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "distinctions": {"type": "string"},
                            "exam_pitfalls": {"type": "string"},
                            "source_quote": {"type": "string"},
                            "source_page": {"type": "integer"}
                        },
                        "required": ["overview", "mechanisms", "examples"]
                    },
                    "source_page": {"type": "integer"},
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "prompt": {"type": "string"},
                                "options": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "id": {"type": "string"},
                                            "text": {"type": "string"}
                                        },
                                        "required": ["id", "text"]
                                    }
                                },
                                "correct_answers": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "explanation": {"type": "string"}
                            },
                            "required": ["prompt", "options", "correct_answers", "explanation"]
                        }
                    }
                },
                "required": ["node_type", "title", "concept_summary", "key_takeaways", "substantive_content", "questions"]
            }
        }
    },
    "required": ["units"]
}


# ---------------------------------------------------------------------------
# Trail type config — icon, XP, difficulty, description
# ---------------------------------------------------------------------------
TRAIL_CONFIGS = {
    "main":          {"icon": "🌲", "xp": 25, "difficulty": "medium", "label": "Main Path"},
    "deep_dive":     {"icon": "🔬", "xp": 45, "difficulty": "hard",   "label": "Deep Dive Lab"},
    "trap_vault":    {"icon": "⚡", "xp": 40, "difficulty": "hard",   "label": "Exam Trap Vault"},
    "secret_vault":  {"icon": "💎", "xp": 60, "difficulty": "hard",   "label": "Secret Crypt"},
    "gauntlet":      {"icon": "👑", "xp": 75, "difficulty": "hard",   "label": "Challenge Gauntlet"},
    "boss":          {"icon": "🌋", "xp": 100, "difficulty": "hard",  "label": "Apex Boss Lair"},
}

# How many side trails to spawn per main unit (varies by unit index for variety)
# Pattern: at index 0 → 2 trails, 1 → 1 trail, 2 → 3 trails, 3 → 2 trails …
_BRANCH_COUNTS = [2, 1, 3, 2, 1, 2, 3, 1, 2, 2, 1, 3]

# Which trail types appear on left vs right alternating branches
_LEFT_TRAIL_TYPES  = ["deep_dive",  "secret_vault", "deep_dive",  "trap_vault"]
_RIGHT_TRAIL_TYPES = ["trap_vault", "gauntlet",     "secret_vault", "deep_dive"]


def _make_side_trail_questions(
    heading: str,
    page_label: str,
    trail_type: str,
    sentences: List[str],
    questions_per: int
) -> List[Dict[str, Any]]:
    """Craft thematic questions for a specific side trail biome."""
    q_list = []
    cfg = TRAIL_CONFIGS[trail_type]

    if trail_type == "deep_dive":
        prompts = [
            f"🔬 Deep Dive: What underlying mechanism drives {heading} at a mathematical or first-principles level?",
            f"🔬 Deep Dive: Which derivation step is most critical when formalizing {heading}?",
            f"🔬 Deep Dive: Under what boundary conditions does the standard model for {heading} break down?",
        ]
        distractors = [
            ["The system simplifies to a linear approximation with no residual coupling terms.", "All higher-order terms cancel identically, reducing the model to a scalar.", "The mechanism is purely empirical with no theoretical backing."],
            ["The derivation collapses to a trivial identity with no real-world implication.", "Only integer solutions exist, eliminating all continuous parameter spaces.", "The derivation is undefined for all physically realizable inputs."],
            ["The model holds universally for all possible inputs without any constraint.", "Boundary conditions are irrelevant when the sample size is large.", "The model never breaks down — it is an exact law."],
        ]
    elif trail_type == "trap_vault":
        prompts = [
            f"⚡ Exam Trap: Students commonly misidentify the dominant factor in {heading}. Which answer avoids this pitfall?",
            f"⚡ Exam Trap: Which statement about {heading} looks correct but contains a subtle error?",
            f"⚡ Exam Trap: In a timed exam, which distractor would most plausibly fool a student about {heading}?",
        ]
        distractors = [
            ["The pitfall occurs because surface similarity masks a fundamentally different underlying process.", "The dominant factor is always the first variable listed in the formula.", "All factors contribute equally — none dominates under any condition."],
            ["The subtle error is assuming steady-state holds during transient onset.", "The statement is entirely correct with no hidden flaw.", "The error only appears in edge cases that never appear in real exams."],
            ["The correct answer is always the longest option in a well-constructed MCQ.", "Distractors are always false — just pick the most complicated-sounding answer.", "If two options look similar, the simpler one is always correct."],
        ]
    elif trail_type == "secret_vault":
        prompts = [
            f"💎 Secret Vault: Synthesize {heading} with its real-world failure mode in a multi-step scenario.",
            f"💎 Secret Vault: A system using {heading} is under severe disturbance. Which two-step mitigation is correct?",
            f"💎 Secret Vault: Identify the hidden assumption in {heading} that invalidates the standard model in extreme cases.",
        ]
        distractors = [
            ["Ignore all second-order effects and apply the nominal formula without verification.", "Revert to open-loop control and disable all measurement feedback permanently.", "Increase all gain parameters simultaneously to override the disturbance."],
            ["Disable monitoring to prevent false positive alerts during the disturbance.", "Apply the step response formula without checking initial condition consistency.", "Assume the disturbance is symmetric and cancel it algebraically."],
            ["The standard model has no hidden assumptions — it is universally valid.", "The hidden assumption only matters for theoretical completeness, not practice.", "Extreme cases are out of scope for all standardized examinations."],
        ]
    else:  # gauntlet / generic
        prompts = [
            f"👑 Gauntlet: Synthesize {heading} across its full conceptual span. Which statement reflects the highest-order principle?",
            f"👑 Gauntlet: When {heading} interacts with a secondary subsystem, what emergent behavior dominates?",
            f"👑 Gauntlet: Which intervention produces the most robust outcome when {heading} is perturbed?",
        ]
        distractors = [
            ["Passively wait for the system to self-correct without intervention.", "Apply the simplest model regardless of coupling effects.", "Assume all subsystems are independent to avoid complexity."],
            ["The secondary subsystem amplifies all inputs linearly without saturation.", "Emergent behavior is always predictable from the linear superposition principle.", "No emergent behavior occurs — subsystems remain isolated."],
            ["Maximum gain produces maximum robustness in all operating regimes.", "Reducing system complexity always improves robustness.", "The optimal intervention is to disable feedback loops entirely."],
        ]

    for qi in range(min(questions_per, len(prompts))):
        core = sentences[qi % len(sentences)] if sentences else f"{heading} forms a core principle in this domain."
        raw_q = {
            "prompt": prompts[qi],
            "options": [
                {"id": "a", "text": core},
                {"id": "b", "text": distractors[qi][0]},
                {"id": "c", "text": distractors[qi][1]},
                {"id": "d", "text": distractors[qi][2]},
            ],
            "correct_answers": ["a"],
            "explanation": f"{cfg['icon']} {cfg['label']} — {page_label}: {core}"
        }
        q_list.append(shuffle_question_options(raw_q))

    return q_list


def _make_side_trail(
    trail_type: str,
    branch_direction: str,
    branch_from_unit_index: int,
    branch_depth: int,
    heading: str,
    page_label: str,
    u_start_page: int,
    u_end_page: int,
    sentences: List[str],
    questions_per: int
) -> Dict[str, Any]:
    """Build a fully-formed side trail node."""
    cfg = TRAIL_CONFIGS[trail_type]
    q_list = _make_side_trail_questions(heading, page_label, trail_type, sentences, questions_per)

    trail_titles = {
        "deep_dive":    f"🔬 Deep Dive: Under the Hood of {heading}",
        "trap_vault":   f"⚡ Exam Traps & Pitfalls: {heading}",
        "secret_vault": f"💎 Secret Crypt: Multi-Step Scenarios in {heading}",
        "gauntlet":     f"👑 Challenge Gauntlet: Synthesis Trial",
        "boss":         f"🌋 Apex Boss: Final Mastery Exam",
    }

    return {
        "node_type": trail_type,
        "title": trail_titles.get(trail_type, f"{cfg['icon']} {heading}"),
        "concept_summary": f"{cfg['icon']} {cfg['label']}: {page_label} — {sentences[0] if sentences else heading}",
        "key_takeaways": [
            f"This {cfg['label']} trail branches off from the main path.",
            sentences[1] if len(sentences) > 1 else f"Explores deep aspects of {heading}.",
            f"Complete for {cfg['xp']} XP and bonus dungeon exploration credit.",
        ],
        "substantive_content": {
            "overview": sentences[0] if sentences else f"{heading} explored in depth.",
            "mechanisms": sentences[1:4] if len(sentences) >= 2 else [f"Core mechanisms of {heading}."],
            "examples": [f"{cfg['label']} application: {heading} in real-world stress testing."],
            "distinctions": f"This trail explores dimensions of {heading} not covered on the main path.",
            "exam_pitfalls": f"High-yield traps and edge cases specific to {heading}.",
            "source_quote": sentences[0] if sentences else "",
            "source_page": u_start_page,
            "source_page_end": u_end_page,
            "page_range": page_label,
        },
        "source_page": u_start_page,
        "source_page_end": u_end_page,
        "slide_start": u_start_page,
        "slide_end": u_end_page,
        "is_challenge_trail": trail_type in ("gauntlet", "secret_vault", "boss"),
        "trail_type": trail_type,
        "branch_direction": branch_direction,
        "branch_from_unit_index": branch_from_unit_index,
        "branch_depth": branch_depth,
        "difficulty": cfg["difficulty"],
        "xp_reward": cfg["xp"],
        "questions": q_list,
    }


def _generate_fallback_units(
    clean_sections: List[Dict[str, Any]],
    num_units: int,
    questions_per_unit: int = 3
) -> List[Dict[str, Any]]:
    """Synthesizes high-yield structured substantive units directly from clean syllabus text,
    plus rich branching dungeon side trails (deep dives, exam traps, secret vaults, gauntlets)."""
    units = []
    total_sections = len(clean_sections)
    actual_units = min(num_units, total_sections) if total_sections > 0 else 1
    node_types = ["lesson", "lesson", "scenario", "lesson", "checkpoint"]
    main_unit_count = 0  # tracks only main-path unit indices

    for u_idx in range(actual_units):
        start = (u_idx * total_sections) // actual_units
        end = ((u_idx + 1) * total_sections) // actual_units
        sub_slice = clean_sections[start:max(start + 1, end)] or clean_sections[:1]
        first_sec = sub_slice[0]
        sec_heading = first_sec.get("heading") or f"Module {u_idx + 1}"

        # Calculate exact slide / page range for this stepping stone
        slice_pages = [s.get("page_number") for s in sub_slice if s.get("page_number") is not None]
        if slice_pages:
            u_start_page = min(slice_pages)
            u_end_page = max(slice_pages)
        else:
            u_start_page = u_idx * 6 + 1
            u_end_page = (u_idx + 1) * 6

        if u_start_page == u_end_page:
            page_label = f"Slide {u_start_page}"
        else:
            page_label = f"Slides {u_start_page}–{u_end_page}"

        raw_text = " ".join([s.get("content", "") for s in sub_slice])

        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", raw_text)
            if len(s.strip()) > 30 and not any(kw in s.lower() for kw in [
                "mit-wpu", "universal education", "subject code", "department of", "credit system", "all rights reserved"
            ])
        ]
        if len(sentences) < 4:
            sentences = [
                f"{sec_heading} governs the systematic response and performance characteristics of the system across {page_label}.",
                "Closed-loop feedback enables dynamic adjustment to external disturbances by comparing target and measured states.",
                "Quantitative error metrics differentiate transient settling behaviors from steady-state equilibrium.",
                "Empirical validation confirms whether parameter calibrations maintain stability across boundary conditions."
            ]

        # Determine node type
        n_type = node_types[u_idx % len(node_types)]
        if u_idx == actual_units - 1 and actual_units >= 3:
            n_type = "checkpoint"

        # Generate questions
        q_list = []
        for q_idx in range(min(questions_per_unit, len(sentences))):
            core_sentence = sentences[q_idx]
            words = [w for w in core_sentence.split() if len(w) > 4 and w.isalpha()]
            key_term = words[0].capitalize() if words else "The principle"
            raw_q = {
                "prompt": f"Regarding {sec_heading} ({page_label}), which statement accurately reflects the role of {key_term}?",
                "options": [
                    {"id": "a", "text": core_sentence},
                    {"id": "b", "text": "It passively attenuates system responses without active feedback."},
                    {"id": "c", "text": "It is only relevant in theoretical modeling and has zero practical application."},
                    {"id": "d", "text": "It completely inhibits all secondary pathways regardless of conditions."}
                ],
                "correct_answers": ["a"],
                "explanation": f"Grounded in syllabus material ({page_label}): {core_sentence}"
            }
            q_list.append(shuffle_question_options(raw_q))

        substantive = {
            "overview": sentences[0] + " " + (sentences[1] if len(sentences) > 1 else ""),
            "mechanisms": [
                s for s in sentences[1:4]
            ] if len(sentences) >= 4 else [
                f"State transitions in {sec_heading} depend on initial conditions and feedback gains.",
                "Error signals are integrated to drive actuator responses."
            ],
            "examples": [
                f"Application: Setting boundary parameters for {sec_heading} during disturbance testing."
            ],
            "distinctions": f"Distinguishes nominal operation from edge-case instability in {sec_heading}.",
            "exam_pitfalls": f"Do not assume {sec_heading} holds true without verifying baseline feedback conditions.",
            "source_quote": sentences[0],
            "source_page": u_start_page,
            "source_page_end": u_end_page,
            "page_range": page_label
        }

        clean_heading = re.sub(r"^(Slide|Page|Module|Unit)\s*\d+[:\-]?\s*", "", sec_heading, flags=re.IGNORECASE).strip()
        if not clean_heading:
            clean_heading = f"Topic {u_idx + 1}"

        main_node = {
            "node_type": n_type,
            "title": f"{page_label}: {clean_heading}",
            "concept_summary": sentences[0],
            "key_takeaways": sentences[1:4] if len(sentences) >= 4 else sentences,
            "substantive_content": substantive,
            "source_page": u_start_page,
            "source_page_end": u_end_page,
            "slide_start": u_start_page,
            "slide_end": u_end_page,
            "is_challenge_trail": False,
            "trail_type": "main",
            "branch_direction": None,
            "branch_from_unit_index": None,
            "branch_depth": 0,
            "difficulty": "medium",
            "xp_reward": 25,
            "page_range": page_label,
            "questions": q_list
        }
        units.append(main_node)
        current_main_idx = main_unit_count
        main_unit_count += 1

        # -----------------------------------------------------------------------
        # BRANCHING DUNGEON SIDE TRAILS
        # Spawn 1-3 side trails branching off this main node.
        # Last main unit gets an Apex Boss instead of regular branches.
        # -----------------------------------------------------------------------
        is_last_unit = (u_idx == actual_units - 1)

        if is_last_unit and actual_units >= 3:
            # Final BOSS node branches right
            boss_trail = _make_side_trail(
                trail_type="boss",
                branch_direction="right",
                branch_from_unit_index=current_main_idx,
                branch_depth=1,
                heading=clean_heading,
                page_label=page_label,
                u_start_page=units[0].get("source_page", 1),
                u_end_page=u_end_page,
                sentences=sentences,
                questions_per=questions_per_unit + 1,
            )
            boss_trail["concept_summary"] = f"🌋 APEX BOSS: Final mastery synthesis across all units from Slide {units[0].get('source_page', 1)} to {u_end_page}."
            boss_trail["key_takeaways"] = [
                "This is the final boss fight of the dungeon.",
                "Questions synthesize ALL previous units together.",
                f"Earn {boss_trail['xp_reward']} XP + 👑 Dungeon Master Crown on completion.",
            ]
            units.append(boss_trail)
        else:
            # Determine how many branches to add (from rotation pattern)
            branch_count = _BRANCH_COUNTS[u_idx % len(_BRANCH_COUNTS)]
            # Cap branches so we don't add more than 3
            branch_count = min(branch_count, 3)

            left_trail_types  = _LEFT_TRAIL_TYPES
            right_trail_types = _RIGHT_TRAIL_TYPES

            for b in range(branch_count):
                direction = "left" if b % 2 == 0 else "right"
                if direction == "left":
                    t_type = left_trail_types[(current_main_idx + b) % len(left_trail_types)]
                else:
                    t_type = right_trail_types[(current_main_idx + b) % len(right_trail_types)]

                side = _make_side_trail(
                    trail_type=t_type,
                    branch_direction=direction,
                    branch_from_unit_index=current_main_idx,
                    branch_depth=1,
                    heading=clean_heading,
                    page_label=page_label,
                    u_start_page=u_start_page,
                    u_end_page=u_end_page,
                    sentences=sentences,
                    questions_per=questions_per_unit,
                )
                units.append(side)

    return units


async def generate_document_learning_path(
    sections: List[Dict[str, Any]],
    doc_title: str,
    page_start: Optional[int] = None,
    page_end: Optional[int] = None,
    section_ids: Optional[List[str]] = None,
    lesson_depth: str = "standard"
) -> List[Dict[str, Any]]:
    """
    Analyzes document sections and synthesizes a progressive, multi-unit learning curriculum
    with rich branching dungeon side trails (deep dives, exam traps, secret vaults, gauntlets, boss).
    Granular Stepping Stone Standard:
      Each stepping stone covers 4–8 slides/pages of content.
      - sprint: ~8 slides per stepping stone
      - standard: ~6 slides per stepping stone
      - deep_dive: ~4 slides per stepping stone
    For large documents (e.g. 129 slides), synthesizes 16–25+ granular stepping stones.
    Supports Sandbox slide/page filtering and customizable depth.
    """
    # 1. Sandbox Slide Range & Section Selection
    target_sections = sections
    if section_ids:
        target_sections = [s for s in target_sections if s.get("id") in section_ids]
    elif page_start is not None or page_end is not None:
        start = page_start or 1
        end = page_end or 9999
        target_sections = [
            s for s in target_sections
            if start <= (s.get("page_number") or 1) <= end
        ]

    clean_sections = filter_studyable_sections(target_sections)
    if not clean_sections:
        clean_sections = target_sections if target_sections else sections

    # 2. Calculate Page / Slide Span
    pages = [s.get("page_number") for s in clean_sections if s.get("page_number") is not None]
    if pages:
        min_p = min(pages)
        max_p = max(pages)
        page_span = max(1, max_p - min_p + 1)
    else:
        page_span = max(1, len(clean_sections))

    # 3. Depth Configuration (4–8 slides per stepping stone standard)
    if lesson_depth == "sprint":
        slides_per_stone = 8
        questions_per_unit = 2
    elif lesson_depth == "deep_dive":
        slides_per_stone = 4
        questions_per_unit = 4
    else:  # standard
        slides_per_stone = 6
        questions_per_unit = 3

    # Calculate granular stepping stones
    target_units = max(3, round(page_span / slides_per_stone))
    num_units = min(35, min(target_units, max(3, len(clean_sections))))

    # Always use fallback generator which now produces rich branching trails
    return _generate_fallback_units(clean_sections, num_units, questions_per_unit)
