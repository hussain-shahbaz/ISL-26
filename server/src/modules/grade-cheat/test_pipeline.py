#!/usr/bin/env python3
"""
Test script for the Exam Grading Service

Tests the complete pipeline with mock data
"""

import os
import sys
import logging

# Setup paths and logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

from app.services import ExamCheckingService


def test_grading_pipeline():
    """Test the complete grading pipeline"""
    
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║      Testing Exam Grading Service - Mock Data              ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize service
    exam_service = ExamCheckingService()
    
    exam_id = "exam_001"
    
    # Test with different grading modes
    modes = ["strict", "medium", "lenient"]
    
    for mode in modes:
        print(f"\n{'='*60}")
        print(f"Testing Grading Mode: {mode.upper()}")
        print(f"{'='*60}\n")
        
        result = exam_service.check_exam(exam_id, grading_mode=mode)
        
        if result['success']:
            data = result['data']
            summary = data['summary']
            
            print(f"✅ Grading completed successfully")
            print(f"   Exam ID: {summary['examId']}")
            print(f"   Total Submissions: {summary['totalSubmissions']}")
            print(f"   Successful Gradings: {summary['successfulGradings']}")
            print(f"   Average Score: {summary['avgScore']:.2f}")
            print(f"   Results saved to MongoDB: {data['mongoInsertedCount']} documents\n")
            
            print(f"Student Results:")
            for student in summary['studentResults']:
                print(f"  {student['studentId']}: {student['score']:.1f}/{student['maxMarks']:.1f} ({student['percentage']:.1f}%)")
        
        else:
            print(f"❌ Grading failed: {result['error']}")
    
    # Test retrieving results
    print(f"\n{'='*60}")
    print(f"Retrieving Results from MongoDB")
    print(f"{'='*60}\n")
    
    results = exam_service.get_exam_results(exam_id)
    
    if results['success']:
        data = results['data']
        print(f"✅ Results retrieved from MongoDB")
        print(f"   Exam ID: {data['examId']}")
        print(f"   Total Students: {data['totalStudents']}")
        print(f"   Average Score: {data['avgScore']:.2f}/{data['avgMarks']:.2f}\n")
        
        for result in data['results'][:1]:  # Show first student as example
            print(f"Example - Student {result['studentId']}:")
            print(f"  Total Score: {result['totalScore']:.1f}/{result['totalMarks']:.1f}")
            print(f"  Percentage: {result['percentage']:.1f}%")
            print(f"  Graded At: {result['gradedAt']}")
            if result['results']:
                first_q = result['results'][0]
                print(f"\n  First Question ({first_q['questionId']}):")
                print(f"    Score: {first_q['score']:.1f}/{first_q['maxMarks']}")
                print(f"    Correct: {first_q['isCorrect']}")
                print(f"    Feedback: {first_q['feedback'][:100]}...")
                print(f"    Confidence: {first_q['confidence']:.2f}")
    
    else:
        print(f"❌ Failed to retrieve results: {results['error']}")
    
    print(f"\n{'='*60}")
    print("✅ All tests completed!")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    try:
        test_grading_pipeline()
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        sys.exit(1)
