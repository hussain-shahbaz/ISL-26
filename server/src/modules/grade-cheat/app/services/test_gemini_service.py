"""Test script for GeminiGradingService"""

import sys
import json
import os

# Add grade-cheat project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)

from app.services.gemini_service import GeminiGradingService
from app.config import Config


def test_gemini_service():
    """Test the Gemini grading service"""
    
    print("=" * 60)
    print("GEMINI SERVICE TEST")
    print("=" * 60)
    
    # Check API key
    print(f"\n1. Checking GEMINI_API_KEY configuration...")
    if not Config.GEMINI_API_KEY:
        print("   ❌ GEMINI_API_KEY is not set!")
        print("   Please set GEMINI_API_KEY in .env or config.py")
        return False
    print("   ✓ GEMINI_API_KEY is configured")
    
    # Initialize service
    print(f"\n2. Initializing GeminiGradingService...")
    try:
        service = GeminiGradingService()
        print("   ✓ Service initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize: {e}")
        return False
    
    # Test 1: Simple math problem
    print(f"\n3. Test 1: Simple Math Problem (Strict Mode)...")
    try:
        result = service.grade_answer(
            question_text="What is 2 + 2?",
            reference_answer="2 + 2 = 4",
            submitted_answer="4",
            marks=5,
            mode="strict",
        )
        
        if result.get("success"):
            print("   ✓ Grading successful")
            data = result.get("data", {})
            print(f"   Score: {data.get('score')}/{data.get('maxMarks')}")
            print(f"   Correct: {data.get('isCorrect')}")
            print(f"   Feedback: {data.get('feedback')}")
            print(f"   Confidence: {data.get('confidence')}")
        else:
            print(f"   ❌ Grading failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Conceptual question - Lenient mode
    print(f"\n4. Test 2: Conceptual Question (Lenient Mode)...")
    try:
        result = service.grade_answer(
            question_text="Explain the concept of inheritance in OOP",
            reference_answer="Inheritance allows a class to inherit properties and methods from a parent class, enabling code reuse and creating a hierarchy of classes.",
            submitted_answer="Inheritance is when one class gets stuff from another class",
            marks=10,
            mode="lenient",
        )
        
        if result.get("success"):
            print("   ✓ Grading successful")
            data = result.get("data", {})
            print(f"   Score: {data.get('score')}/{data.get('maxMarks')}")
            print(f"   Correct: {data.get('isCorrect')}")
            print(f"   Feedback: {data.get('feedback')}")
        else:
            print(f"   ❌ Grading failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Wrong answer - Medium mode
    print(f"\n5. Test 3: Wrong Answer (Medium Mode)...")
    try:
        result = service.grade_answer(
            question_text="What is the capital of France?",
            reference_answer="Paris",
            submitted_answer="London",
            marks=3,
            mode="medium",
        )
        
        if result.get("success"):
            print("   ✓ Grading successful")
            data = result.get("data", {})
            print(f"   Score: {data.get('score')}/{data.get('maxMarks')}")
            print(f"   Correct: {data.get('isCorrect')}")
            print(f"   Why Wrong: {data.get('whyWrong')}")
        else:
            print(f"   ❌ Grading failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print(f"\n" + "=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_gemini_service()
    sys.exit(0 if success else 1)
