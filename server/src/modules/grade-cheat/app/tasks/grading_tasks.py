"""Async grading tasks using Celery"""

import logging
from app.celery_app import celery_app
from app.services.task_tracker import TaskTracker
from app.services.gemini_service import GeminiGradingService
from app.services.analysis_service import ExamAnalysisService
from app.models import ExamResultRepository
from app.data_provider import DataProvider
from datetime import datetime

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='app.tasks.grading_tasks.grade_exam_task')
def grade_exam_task(self, exam_id: str, grading_mode: str, task_id: str, additional_instructions: str = None):
    """
    Async task to grade an exam with progress tracking
    
    Args:
        exam_id: The exam ID to grade
        grading_mode: Grading mode (strict/lenient/medium)
        task_id: Task tracking ID from Redis
        additional_instructions: Optional custom grading instructions
    """
    
    tracker = TaskTracker()
    gemini_service = GeminiGradingService()
    analysis_service = ExamAnalysisService()
    result_repo = ExamResultRepository()
    data_provider = DataProvider()
    
    try:
        logger.info(f"Starting async grading task {task_id} for exam {exam_id}")
        
        # Mark task as started
        tracker.start_task(task_id)
        
        # Fetch data
        questions = data_provider.get_exam_questions(exam_id)
        submissions = data_provider.get_exam_submissions(exam_id)
        
        if not questions or not submissions:
            error_msg = f"Missing questions or submissions for exam {exam_id}"
            tracker.fail_task(task_id, error_msg)
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        questions_by_id = {q['questionId']: q for q in questions}
        total_questions = len(questions) * len(submissions)
        
        # Grade all submissions
        exam_results = []
        questions_processed = 0
        
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
                
                # Call Gemini to grade
                grade_result = gemini_service.grade_answer(
                    question_text=question['questionText'],
                    reference_answer=question['referenceAnswer'],
                    submitted_answer=answer['submittedAnswer'],
                    marks=question['marks'],
                    mode=grading_mode,
                    additional_instructions=additional_instructions
                )
                
                questions_processed += 1
                
                # Update progress in Redis every question
                tracker.update_progress(task_id, questions_processed)
                logger.info(f"Task {task_id}: Processed {questions_processed}/{total_questions} questions")
                
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
        
        # Bulk insert results to MongoDB
        inserted_count = result_repo.insert_many(exam_results)
        logger.info(f"Saved {inserted_count} results to exam-results collection")
        
        # Calculate and save analytics
        analysis = analysis_service.calculate_analysis(exam_id, grading_mode)
        logger.info(f"Saved analysis to exam-analysis collection")
        
        # Prepare final result
        result = {
            "examId": exam_id,
            "totalGraded": inserted_count,
            "avgScore": analysis['avgScore'] if analysis else 0,
            "message": "Grading and analysis complete"
        }
        
        # Mark task as completed
        tracker.complete_task(task_id, result)
        
        logger.info(f"Completed async grading task {task_id}")
        return {"success": True, "data": result}
        
    except Exception as e:
        error_msg = f"Error in grading task: {str(e)}"
        logger.error(error_msg, exc_info=True)
        tracker.fail_task(task_id, error_msg)
        return {"success": False, "error": error_msg}
