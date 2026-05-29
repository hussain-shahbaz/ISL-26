#!/usr/bin/env python3
"""Test pipeline - Grade an exam with Gemini and generate analytics"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import Config
from app.services import ExamCheckingService
from app.services.analysis_service import ExamAnalysisService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_pipeline():
    """Test the complete grading and analytics pipeline"""
    
    print("=" * 60)
    print("EXAM GRADING & ANALYTICS PIPELINE TEST")
    print("=" * 60)
    
    try:
        print("\n1. Testing imports...")
        exam_service = ExamCheckingService()
        analysis_service = ExamAnalysisService()
        print("   ✓ Services initialized successfully")
        
        print("\n2. Checking config...")
        print(f"   - MongoDB URI: {Config.MONGODB_URI}")
        print(f"   - MongoDB DB: {Config.MONGODB_DB}")
        print(f"   - Gemini Model: {Config.GEMINI_MODEL}")
        print(f"   - Gemini API Key: {'*' * 10 if Config.GEMINI_API_KEY else 'NOT SET'}")
        
        print("\n3. Testing data provider...")
        from app.data_provider import DataProvider
        dp = DataProvider()
        questions = dp.get_exam_questions("exam_001")
        submissions = dp.get_exam_submissions("exam_001")
        print(f"   ✓ Found {len(questions)} questions")
        print(f"   ✓ Found {len(submissions)} student submissions")
        
        print("\n4. Running grading pipeline for exam_001 (mode: medium)...")
        result = exam_service.check_exam("exam_001", "medium")
        
        if result['success']:
            print(f"   ✓ Grading successful!")
            print(f"   - Total graded: {result['data']['totalGraded']}")
            print(f"   - Average score: {result['data']['avgScore']}")
        else:
            print(f"   ✗ Grading failed: {result['error']}")
            return False
        
        print("\n5. Fetching analytics...")
        analysis = analysis_service.get_analysis("exam_001")
        
        if analysis:
            print(f"   ✓ Analytics retrieved!")
            print(f"   - Total students: {analysis['totalStudents']}")
            print(f"   - Average score: {analysis['avgScore']}/{analysis['totalMarks']}")
            print(f"   - Top students: {[s['studentId'] for s in analysis['topStudents']]}")
            print(f"   - Strong concepts: {len(analysis['strongConcepts'])}")
            print(f"   - Weak concepts: {len(analysis['weakConcepts'])}")
        else:
            print(f"   ✗ Analytics not found")
            return False
        
        print("\n" + "=" * 60)
        print("✓ PIPELINE TEST COMPLETED SUCCESSFULLY")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pipeline()
    sys.exit(0 if success else 1)
