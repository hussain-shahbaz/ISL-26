"""Gemini-based grading service using latest LangChain APIs"""

import logging
from typing import Dict, Any, Optional, List

from pydantic import BaseModel, Field

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import Config

logger = logging.getLogger(__name__)


class GradingOutput(BaseModel):
    """Structured output from Gemini grading"""

    score: float = Field(description="Numerical score from 0 to max marks")
    isCorrect: bool = Field(description="Whether the answer is correct")
    feedback: str = Field(description="Constructive feedback")
    whyWrong: Optional[str] = Field(
        default=None,
        description="Explanation of mistakes if incorrect"
    )
    reasoning: str = Field(description="Detailed grading reasoning")
    confidence: float = Field(description="Confidence level from 0 to 1")


class GeminiGradingService:
    """Service for grading answers using Gemini"""

    def __init__(self):
        """Initialize Gemini client"""

        if not Config.GEMINI_API_KEY:
            print("GEMINI API KEY ============== ",Config.GEMINI_API_KEY)
            raise ValueError("GEMINI_API_KEY not configured")

        self.llm = ChatGoogleGenerativeAI(
            model=Config.GEMINI_MODEL,
            google_api_key=Config.GEMINI_API_KEY,
            temperature=0.3,
        )

    def _get_system_prompt(self, mode: str) -> str:
        """Return grading instructions based on mode"""

        if mode == "strict":
            return """
You are a strict exam grader.

Rules:
- Require technically correct terminology
- Deduct marks for missing keywords
- Partial credit only when major concepts are correct
- Score zero for fundamentally incorrect answers
- Be strict but fair
"""

        elif mode == "lenient":
            return """
You are a lenient exam grader.

Rules:
- Focus on conceptual understanding
- Accept paraphrasing and synonyms
- Reward partially correct reasoning
- Ignore small wording issues
- Encourage students
"""

        return """
You are a balanced exam grader.

Rules:
- Evaluate both conceptual understanding and technical correctness
- Accept reasonable paraphrasing
- Give partial credit appropriately
- Deduct for missing core concepts
- Balance:
  - 60% technical accuracy
  - 40% conceptual understanding
"""

    def grade_answer(
        self,
        question_text: str,
        reference_answer: str,
        submitted_answer: str,
        marks: int,
        mode: str = "medium",
        additional_instructions: str = None,
    ) -> Dict[str, Any]:
        """
        Grade a single answer
        
        Args:
            question_text: The exam question
            reference_answer: Expected/reference answer
            submitted_answer: Student's answer
            marks: Total marks for this question
            mode: Grading mode ('strict', 'lenient', 'medium')
            additional_instructions: Optional custom grading instructions
        """

        try:
            if mode not in ["strict", "medium", "lenient"]:
                mode = "medium"
            
            system_prompt = self._get_system_prompt(mode)
            
            # Append additional instructions if provided
            if additional_instructions:
                system_prompt += f"\n\nAdditional Instructions:\n{additional_instructions}"

            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    (
                        "human",
                        """
Question:
{question_text}

Reference Answer:
{reference_answer}

Student Answer:
{submitted_answer}

Maximum Marks:
{max_marks}

Evaluate the answer carefully and return structured grading output.
""",
                    ),
                ]
            )

            structured_llm = self.llm.with_structured_output(
                GradingOutput
            )

            chain = prompt | structured_llm

            result: GradingOutput = chain.invoke(
                {
                    "question_text": question_text,
                    "reference_answer": reference_answer,
                    "submitted_answer": submitted_answer,
                    "max_marks": marks,
                }
            )

            score = max(0, min(result.score, marks))

            return {
                "success": True,
                "data": {
                    "score": score,
                    "maxMarks": marks,
                    "isCorrect": result.isCorrect,
                    "feedback": result.feedback,
                    "whyWrong": result.whyWrong,
                    "reasoning": result.reasoning,
                    "confidence": result.confidence,
                },
            }

        except Exception as e:
            logger.exception("Error grading answer")

            return {
                "success": False,
                "error": str(e),
            }

    def grade_multiple(
        self,
        questions: List[Dict[str, Any]],
        mode: str = "medium",
    ) -> Dict[str, Any]:
        """
        Grade multiple answers
        """

        results = []

        for q in questions:
            result = self.grade_answer(
                question_text=q.get("question_text", ""),
                reference_answer=q.get("reference_answer", ""),
                submitted_answer=q.get("submitted_answer", ""),
                marks=q.get("marks", 0),
                mode=mode,
            )

            results.append(result)

        return {
            "success": all(r.get("success") for r in results),
            "results": results,
        }