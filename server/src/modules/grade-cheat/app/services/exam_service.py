"""Main exam checking service"""

import logging
from typing import Dict, Any, List
from datetime import datetime
from app.services.gemini_service import GeminiGradingService
from app.services.analysis_service import ExamAnalysisService
from app.models import ExamResultRepository
from app.data_provider import DataProvider

logger = logging.getLogger(__name__)


class ExamCheckingService:
    """Service for checking/grading exams with Gemini and saving results"""
    
    def __init__(self):
        """Initialize the exam checking service"""
        self.gemini_service = GeminiGradingService()
        self.analysis_service = ExamAnalysisService()
        self.result_repo = ExamResultRepository()
        self.data_provider = DataProvider()
    
    def check_exam(self, exam_id: str, grading_mode: str = "medium", additional_instructions: str = None) -> Dict[str, Any]:
        """
        Grade all exam submissions and calculate analytics
        
        Args:
            exam_id: The exam ID to grade
            grading_mode: Grading mode ('strict', 'lenient', 'medium')
            additional_instructions: Optional custom grading instructions
        
        Flow:
        1. Fetch questions and submissions
        2. Grade each answer with Gemini
        3. Save results to exam-results collection
        4. Calculate analytics
        5. Save analytics to exam-analysis collection
        """
        
        try:
            logger.info(f"Starting grading: examId={exam_id}, mode={grading_mode}")
            
            # Fetch data
            questions = self.data_provider.get_exam_questions(exam_id)
            submissions = self.data_provider.get_exam_submissions(exam_id)
            
            if not questions or not submissions:
                return {
                    "success": False,
                    "error": f"Missing questions or submissions for exam {exam_id}"
                }
            
            questions_by_id = {q['questionId']: q for q in questions}
            
            # Grade all submissions
            exam_results = []
            for submission in submissions:
                student_id = submission['studentId']
                grading_results = []
                student_total_score = 0
                student_total_marks = 0
                
                # Grade each answer
                for answer in submission['answers']:
                    q_id = answer['questionId']
                    question = questions_by_id.get(q_id)
                    
                    if not question:
                        logger.warning(f"Question {q_id} not found")
                        continue
                    
                    # Call Gemini to grade with optional instructions
                    grade_result = self.gemini_service.grade_answer(
                        question_text=question['questionText'],
                        reference_answer=question['referenceAnswer'],
                        submitted_answer=answer['submittedAnswer'],
                        marks=question['marks'],
                        mode=grading_mode,
                        additional_instructions=additional_instructions
                    )
                    
                    if grade_result['success']:
                        data = grade_result['data']
                        grading_results.append({
                            'questionId': q_id,
                            'score': data['score'],
                            'maxMarks': data['maxMarks'],
                            'isCorrect': data['isCorrect'],
                            'feedback': data['feedback'],
                            'reasoning': data['reasoning']
                        })
                        student_total_score += data['score']
                        student_total_marks += data['maxMarks']
                    else:
                        logger.error(f"Failed grading: {grade_result.get('error')}")
                        grading_results.append({
                            'questionId': q_id,
                            'error': grade_result.get('error')
                        })
                
                # Save student result
                percentage = (student_total_score / student_total_marks * 100) if student_total_marks > 0 else 0
                exam_results.append({
                    'examId': exam_id,
                    'studentId': student_id,
                    'totalScore': student_total_score,
                    'totalMarks': student_total_marks,
                    'percentage': percentage,
                    'results': grading_results,
                    'gradedAt': datetime.now(),
                    'gradingMode': grading_mode
                })
            
            # Save all results to MongoDB
            inserted_count = self.result_repo.insert_many(exam_results)
            logger.info(f"Saved {inserted_count} results to exam-results collection")
            
            # Calculate and save analytics
            analysis = self.analysis_service.calculate_analysis(exam_id, grading_mode)
            logger.info(f"Saved analysis to exam-analysis collection")
            
            return {
                "success": True,
                "data": {
                    "examId": exam_id,
                    "totalGraded": inserted_count,
                    "avgScore": analysis['avgScore'] if analysis else 0,
                    "message": "Grading and analysis complete"
                }
            }
        
        except Exception as e:
            logger.error(f"Error in check_exam: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_exam_results(self, exam_id: str) -> Dict[str, Any]:
        """Get all results for an exam"""
        try:
            results = self.result_repo.find_by_exam(exam_id)
            
            if not results:
                return {
                    "success": False,
                    "error": f"No results for exam {exam_id}"
                }
            
            return {
                "success": True,
                "data": {
                    "examId": exam_id,
                    "resultsCount": len(results),
                    "results": results
                }
            }
        
        except Exception as e:
            logger.error(f"Error getting results: {e}")
            return {
                "success": False,
                "error": str(e)
            }
