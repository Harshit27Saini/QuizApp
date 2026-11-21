import re
from typing import Dict, Any, List
from app.services.ai.base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """
    Intelligent Mock AI Provider for offline testing and development.
    Synthesizes authentic academic exam questions grounded in the material,
    eliminating meta-language ("according to text") and robotic distractors.
    """

    async def generate_structured_json(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Extract source sentences from the user prompt
        text_matches = re.findall(r"\[Topic:.*?\]\s*(.*?)(?=(?:\[Topic|\Z))", user_prompt, re.DOTALL)
        combined_text = " ".join(text_matches).strip() if text_matches else user_prompt

        # Clean into high-value academic sentences, filtering institutional boilerplate
        raw_sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", combined_text)
            if len(s.strip()) > 35 and not s.strip().startswith("[") and not s.strip().startswith("#")
        ]
        
        sentences = [
            s for s in raw_sentences
            if not any(kw in s.lower() for kw in [
                "subject code", "department of", "mit-wpu", "universal education",
                "credit system", "table of contents", "index sr", "all rights reserved",
                "managing conflict peacefully: tools and techniques"
            ])
        ]

        if not sentences:
            sentences = [
                "Active recall strengthens synaptic connections by repeatedly retrieving stored memory without consulting external reference material.",
                "Spaced repetition leverages the psychological spacing effect to counteract the Ebbinghaus forgetting curve.",
                "Cognitive load theory posits that instructional design must accommodate the limited capacity of human working memory.",
                "Synaptic plasticity enables long-term potentiation, which serves as the primary cellular mechanism for memory encoding."
            ]

        # Extract page number if present in prompt
        page_match = re.search(r"Page\s*(\d+)", user_prompt)
        page_num = int(page_match.group(1)) if page_match else 1

        questions: List[Dict[str, Any]] = []

        # Domain terms gathered across the text for generating plausible distractors
        all_words = set(re.findall(r"\b[A-Za-z]{5,}\b", combined_text))
        distractor_pool = [w.capitalize() for w in all_words if len(w) > 6][:10]
        if len(distractor_pool) < 3:
            distractor_pool = ["Inhibition", "Phosphorylation", "Attenuation", "Serialization"]

        for idx, sentence in enumerate(sentences[:10]):
            clean_sentence = sentence.replace("\n", " ").strip()
            
            # Extract key concept from sentence
            words = [w for w in clean_sentence.split() if len(w) > 5 and w.isalpha()]
            core_term = words[0].capitalize() if words else "This process"
            secondary_term = words[1].capitalize() if len(words) > 1 else distractor_pool[0]

            is_msq = (idx % 2 == 1)

            if not is_msq:
                # Authentic Academic Exam Question (MCQ) with balanced option lengths
                questions.append({
                    "question_type": "MCQ",
                    "prompt": f"What is the primary role or mechanism of {core_term} within this system?",
                    "options": [
                        {"id": "a", "text": clean_sentence},
                        {"id": "b", "text": f"It acts as a primary competitive antagonist against {secondary_term} activation across the entire functional pathway under baseline conditions."},
                        {"id": "c", "text": f"It permanently decreases overall system throughput by downregulating {distractor_pool[min(idx, len(distractor_pool)-1)]} receptor concentration and signal transduction."},
                        {"id": "d", "text": f"It operates as a passive thermodynamic buffer without consuming cellular energy or altering steady-state operational variables across intervals."}
                    ],
                    "correct_answers": ["a"],
                    "explanation": f"The primary function is explicitly verified: {clean_sentence}",
                    "source_page": page_num,
                    "source_quote": clean_sentence,
                    "difficulty": "medium"
                })
            else:
                # Authentic Academic Multi-Select Question (MSQ) with balanced option lengths
                questions.append({
                    "question_type": "MSQ",
                    "prompt": f"Which of the following characteristics accurately describe the function and behavior of {core_term}? (Select all that apply)",
                    "options": [
                        {"id": "a", "text": clean_sentence},
                        {"id": "b", "text": f"It plays an active functional role in the regulation and expression of {secondary_term} throughout the primary operational cycle."},
                        {"id": "c", "text": f"It directly halts all downstream processing and signal cascades under standard baseline operational and physiological conditions."},
                        {"id": "d", "text": f"It functions identically to {distractor_pool[min(idx+1, len(distractor_pool)-1)]} with zero variance in pathway activity or cellular response dynamics."}
                    ],
                    "correct_answers": ["a", "b"],
                    "explanation": f"Both statements accurately describe {core_term}: {clean_sentence}",
                    "source_page": page_num,
                    "source_quote": clean_sentence,
                    "difficulty": "medium"
                })

        return {"questions": questions}

    async def generate_text(
        self,
        system_instruction: str,
        user_prompt: str
    ) -> str:
        # Extract question from user_prompt
        last_turn_match = re.search(r"Student:\s*(.*?)(?:\n|\Z)", user_prompt)
        question = last_turn_match.group(1).strip() if last_turn_match else user_prompt.strip()

        # Extract topic or context if available in system_instruction
        topic_match = re.search(r"Current Topic:\s*(.*?)(?:\n|\Z)", system_instruction)
        topic = topic_match.group(1).strip() if topic_match else "the study material"

        # Determine pet persona cue
        if "Sydney" in system_instruction:
            cue = "*Excited tail wag!* Great question!"
        elif "Connie" in system_instruction:
            cue = "*Gentle, dignified purr.* Let us be precise here."
        elif "Milo" in system_instruction:
            cue = "*Alert ear perk!* Here is the street-smart intuition."
        elif "Scooby" in system_instruction:
            cue = "*Rests chin calmly beside you.* Let's break this down step-by-step."
        elif "Bunny" in system_instruction:
            cue = "*Bouncing with energy!* Let's conquer this together!"
        else:
            cue = "*Attentive companion look.*"

        return (
            f"{cue} Regarding **{question}** in {topic}:\n\n"
            f"1. **Core Principle:** In {topic}, key mechanisms work by establishing stable feedback loops between inputs, intermediate transformations, and output targets.\n"
            f"2. **Intuitive Analogy:** Think of it like cruise control on a vehicle—when external friction or hills (disturbances) alter the speed, the system calculates the delta and instantly throttles to maintain equilibrium.\n"
            f"3. **Exam Takeaway:** Look closely for distinguishing characteristics between baseline nominal values and dynamic error states on tests!"
        )
