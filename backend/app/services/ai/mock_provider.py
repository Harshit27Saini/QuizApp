import re
from typing import Dict, Any, List
from app.services.ai.base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """
    Zero-dependency Mock AI Provider for offline development, CI/CD, and fast unit tests.
    Synthesizes authentic questions using direct quotes from the input text sections.
    """

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Extract source sentences from the user prompt
        text_matches = re.findall(r"Content:\s*(.*?)(?=(?:\[Section|\Z))", user_prompt, re.DOTALL)
        combined_text = " ".join(text_matches).strip() if text_matches else user_prompt

        # Split into readable sentences
        sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", combined_text)
            if len(s.strip()) > 25 and not s.strip().startswith("[")
        ]

        if not sentences:
            sentences = [
                "Recall is a personalized learning platform that transforms user-uploaded material into an interactive experience.",
                "Active recall strengthens memory retention through self-testing and immediate feedback.",
                "Spaced repetition algorithms schedule reviews at optimal intervals before forgetting occurs."
            ]

        # Extract page number if present in prompt
        page_match = re.search(r"Page:\s*(\d+)", user_prompt)
        page_num = int(page_match.group(1)) if page_match else 1

        questions: List[Dict[str, Any]] = []

        # Generate a balanced set of MCQ and MSQ
        for idx, sentence in enumerate(sentences[:10]):
            is_msq = (idx % 2 == 1)
            clean_sentence = sentence.replace("\n", " ").strip()
            
            # Key subject identification
            words = [w for w in clean_sentence.split() if len(w) > 4]
            key_term = words[0] if words else "the concept"

            if not is_msq:
                # Single Choice (MCQ)
                questions.append({
                    "question_type": "MCQ",
                    "prompt": f"According to the source material, which statement accurately reflects the discussion regarding {key_term}?",
                    "options": [
                        {"id": "a", "text": clean_sentence},
                        {"id": "b", "text": f"It is unrelated to {key_term} and operates in an alternate paradigm."},
                        {"id": "c", "text": f"It has been deprecated and replaced by unvalidated assertions."},
                        {"id": "d", "text": "None of the source material supports this statement."}
                    ],
                    "correct_answers": ["a"],
                    "explanation": f"The source text directly states: '{clean_sentence}'",
                    "source_page": page_num,
                    "source_quote": clean_sentence,
                    "difficulty": "medium"
                })
            else:
                # Multi-select (MSQ)
                questions.append({
                    "question_type": "MSQ",
                    "prompt": f"Which of the following points are explicitly supported by the uploaded text regarding {key_term}? (Select all that apply)",
                    "options": [
                        {"id": "a", "text": clean_sentence},
                        {"id": "b", "text": "This assertion is directly grounded in the provided document context."},
                        {"id": "c", "text": "This contradicting statement is refuted by the source text."},
                        {"id": "d", "text": "This extraneous claim is never mentioned in the text."}
                    ],
                    "correct_answers": ["a", "b"],
                    "explanation": f"Both options correctly reflect the verified evidence: '{clean_sentence}'",
                    "source_page": page_num,
                    "source_quote": clean_sentence,
                    "difficulty": "medium"
                })

        return {"questions": questions}

