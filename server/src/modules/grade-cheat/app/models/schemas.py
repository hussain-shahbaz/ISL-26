"""Data schemas using Pydantic for validation"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class StudentAnswer(BaseModel):
    """Individual answer from student"""
    questionId: str
    submittedAnswer: str
    questionType: str  # 'mcq' or 'text'
    marksAllocated: int


class SubmittedExam(BaseModel):
    """Complete submission from student"""
    examId: str
    studentId: str
    answers: List[StudentAnswer]
    status: str = "pending_grading"  # 'pending_grading' or 'graded'
    submittedAt: datetime


class Question(BaseModel):
    """Exam question"""
    examId: str
    questionId: str
    type: str  # 'mcq' or 'text'
    questionText: str
    imageUrl: Optional[str] = None
    options: Optional[List[str]] = None
    marks: int
    referenceAnswer: str


class GradingResult(BaseModel):
    """Result of grading a single answer"""
    questionId: str
    score: float
    maxMarks: int
    isCorrect: Optional[bool] = None
    feedback: str
    whyWrong: Optional[str] = None
    reasoning: str
    confidence: float
    cheatingScore: Optional[float] = None
    cheatingFlag: Optional[bool] = None
    cheatingDetails: Optional[Dict[str, Any]] = None


class ExamResult(BaseModel):
    """Complete exam grading result for a student"""
    examId: str
    studentId: str
    gradedAt: datetime
    results: List[GradingResult]
    totalScore: float
    totalMarks: int
    percentage: float
    
    class Config:
        arbitrary_types_allowed = True
