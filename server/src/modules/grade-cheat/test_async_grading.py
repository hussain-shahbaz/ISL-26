#!/usr/bin/env python3
"""
Test script for async grading system with progress tracking

Demonstrates:
1. Starting an async grading task
2. Polling for progress updates
3. Retrieving final results
"""

import requests
import time
import json
import sys
from urllib.parse import urlencode

BASE_URL = "http://localhost:5000/api"


def print_header(text):
    """Print a formatted header"""
    print(f"\n{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}\n")


def print_progress_bar(percentage, width=40):
    """Print a visual progress bar"""
    filled = int(width * percentage / 100)
    bar = '█' * filled + '░' * (width - filled)
    return f"[{bar}] {percentage:.1f}%"


def test_async_grading():
    """Test the complete async grading workflow"""
    
    print_header("ASYNC EXAM GRADING WITH PROGRESS TRACKING")
    
    # Test parameters
    exam_id = "exam_001"
    mode = "medium"
    instructions = "Focus on conceptual understanding and penalize minor wording issues"
    
    print(f"Test Configuration:")
    print(f"  • Exam ID: {exam_id}")
    print(f"  • Grading Mode: {mode}")
    print(f"  • Custom Instructions: {instructions[:50]}...")
    print()
    
    # Step 1: Start async grading task
    print_header("STEP 1: START ASYNC GRADING TASK")
    
    params = {
        "examId": exam_id,
        "mode": mode,
        "instructions": instructions
    }
    
    try:
        response = requests.post(f"{BASE_URL}/grade/async", params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            print(f"✗ Failed to start grading: {data.get('error')}")
            return False
        
        task_id = data["taskId"]
        estimated_questions = data.get("estimatedQuestions", "unknown")
        
        print(f"✓ Grading task started successfully!")
        print(f"  • Task ID: {task_id}")
        print(f"  • Status Code: {response.status_code}")
        print(f"  • Estimated Questions: {estimated_questions}")
        print(f"\n  Progress URL: {data.get('checkProgressUrl')}")
        
    except requests.exceptions.RequestException as e:
        print(f"✗ Error starting grading task: {e}")
        return False
    
    # Step 2: Poll progress
    print_header("STEP 2: MONITOR GRADING PROGRESS")
    
    max_wait = 300  # 5 minutes max wait
    poll_interval = 1  # Check every second
    start_time = time.time()
    last_percentage = 0
    
    print("Progress updates:\n")
    
    while time.time() - start_time < max_wait:
        try:
            response = requests.get(f"{BASE_URL}/grade/progress", params={"taskId": task_id})
            response.raise_for_status()
            progress_data = response.json()
            
            status = progress_data["status"]
            elapsed = progress_data.get("elapsed", 0)
            
            if status == "processing":
                progress_info = progress_data.get("progress", {})
                current = progress_info.get("current", 0)
                total = progress_info.get("total", 0)
                percentage = progress_info.get("percentage", 0)
                
                # Only print if percentage changed
                if percentage != last_percentage:
                    bar = print_progress_bar(percentage)
                    print(f"  {bar} | {current}/{total} questions | Elapsed: {elapsed:.1f}s")
                    last_percentage = percentage
                
            elif status == "completed":
                print(f"\n✓ Grading completed!")
                result = progress_data.get("result", {})
                print(f"\nFinal Results:")
                print(f"  • Total Graded: {result.get('totalGraded')}")
                print(f"  • Average Score: {result.get('avgScore')}")
                print(f"  • Total Time: {elapsed:.1f}s")
                print(f"  • Message: {result.get('message')}")
                return True
                
            elif status == "failed":
                error = progress_data.get("error", "Unknown error")
                print(f"\n✗ Grading failed: {error}")
                print(f"  Elapsed: {elapsed:.1f}s")
                return False
            
            time.sleep(poll_interval)
            
        except requests.exceptions.RequestException as e:
            print(f"\n✗ Error checking progress: {e}")
            return False
    
    print(f"\n✗ Grading timeout after {max_wait} seconds")
    return False


def test_sync_grading():
    """Test synchronous grading for comparison"""
    
    print_header("SYNCHRONOUS GRADING (BLOCKING)")
    
    exam_id = "exam_001"
    mode = "strict"
    
    print(f"Test Configuration:")
    print(f"  • Exam ID: {exam_id}")
    print(f"  • Grading Mode: {mode}")
    print()
    
    try:
        print("Starting grading...")
        start_time = time.time()
        
        response = requests.post(
            f"{BASE_URL}/grade",
            params={"examId": exam_id, "mode": mode}
        )
        response.raise_for_status()
        data = response.json()
        
        elapsed = time.time() - start_time
        
        if data.get("success"):
            result = data.get("data", {})
            print(f"✓ Grading completed in {elapsed:.1f}s!")
            print(f"  • Total Graded: {result.get('totalGraded')}")
            print(f"  • Average Score: {result.get('avgScore')}")
            print(f"  • Message: {result.get('message')}")
        else:
            print(f"✗ Grading failed: {data.get('error')}")
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")


def test_health_check():
    """Test API health"""
    
    print_header("HEALTH CHECK")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        response.raise_for_status()
        data = response.json()
        
        print(f"✓ API is healthy!")
        print(f"  • Status: {data.get('status')}")
        print(f"  • Service: {data.get('service')}")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"✗ Health check failed: {e}")
        print("\nMake sure:")
        print("  1. Flask app is running: python main.py")
        print("  2. Redis server is running: redis-server")
        print("  3. Celery worker is running: celery -A app.celery_app worker")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("   ASYNC GRADING SYSTEM - TEST SUITE")
    print("=" * 70)
    
    # Health check first
    if not test_health_check():
        print("\n✗ Cannot connect to API. Exiting.")
        sys.exit(1)
    
    print("\n" + "-" * 70)
    print("Choose test to run:")
    print("  1. Async grading with progress tracking")
    print("  2. Sync grading (blocking)")
    print("  3. Both")
    print("-" * 70)
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        success = test_async_grading()
    elif choice == "2":
        test_sync_grading()
        success = True
    elif choice == "3":
        success = test_async_grading()
        print("\n")
        test_sync_grading()
    else:
        print("Invalid choice")
        success = False
    
    # Cleanup option
    if success and choice != "2":
        print_header("CLEANUP")
        task_id = input("Enter task ID to clean up (or press Enter to skip): ").strip()
        if task_id:
            try:
                response = requests.delete(f"{BASE_URL}/grade/cleanup", params={"taskId": task_id})
                if response.status_code == 200:
                    print(f"✓ Task {task_id} cleaned up")
                else:
                    print(f"✗ Cleanup failed: {response.text}")
            except Exception as e:
                print(f"✗ Error: {e}")
    
    print("\n" + "=" * 70)
    print("   TEST COMPLETE")
    print("=" * 70 + "\n")
