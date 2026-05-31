"""
Tests for plagiarism detection and MCQ grading.

Run (prints visible):
    python tests/test_plagiarism.py
    python -m unittest tests/test_plagiarism.py -v -s
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.plagiarism import (
    build_peer_index,
    check_plagiarism,
    compute_tfidf_similarity,
    is_semantic_index_ready,
    prepare_plagiarism_index,
)
from app.grader import grade_mcq
from app.data_provider import DataProvider


def _print_header(title: str):
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)


def _print_plagiarism_result(result: dict):
    details = result.get("cheatingDetails", {})
    print(f"  Combined score : {result.get('cheatingScore')}%")
    print(f"  Flagged        : {result.get('cheatingFlag')}")
    print(f"  Semantic score : {details.get('similarityScore')}%")
    print(f"  TF-IDF score   : {details.get('tfidfScore')}%")
    print(f"  Suspected peer : {details.get('suspectedPeerId')}")
    print(f"  Message        : {details.get('message')}")
    if details.get("suspectedAnswerSnippet"):
        print(f"  Peer snippet   : {details.get('suspectedAnswerSnippet')}")


def _print_mcq_result(label: str, submitted: str, reference: str, result: dict):
    data = result["data"]
    print(f"\n  [{label}] submitted={submitted!r}  reference={reference!r}")
    print(f"  Score     : {data['score']} / {data['maxMarks']}")
    print(f"  Correct   : {data['isCorrect']}")
    print(f"  Feedback  : {data['feedback']}")


class TestPlagiarismDetection(unittest.TestCase):

    def test_tfidf_similarity(self):
        _print_header("TF-IDF similarity (similar vs unrelated texts)")

        text_a = (
            "Photosynthesis is the process by which plants convert light energy "
            "into chemical energy stored in glucose."
        )
        text_b = (
            "Photosynthesis is when plants make food using sunlight and convert "
            "light energy to chemical energy."
        )
        text_c = "Matter exists in solid, liquid and gaseous physical states."
        corpus = [text_a, text_b, text_c, "Water evaporates from oceans and lakes due to heat."]

        sim_ab = compute_tfidf_similarity(text_a, text_b, corpus)
        sim_ac = compute_tfidf_similarity(text_a, text_c, corpus)

        print(f"  Similar pair (A vs B)   : {sim_ab:.4f} ({sim_ab * 100:.1f}%)")
        print(f"  Unrelated pair (A vs C) : {sim_ac:.4f} ({sim_ac * 100:.1f}%)")

        self.assertGreater(sim_ab, sim_ac)

    def test_identical_answers_score_100(self):
        _print_header("TF-IDF identical answers")

        text = "The water cycle involves evaporation, condensation, and precipitation."
        corpus = [text, "Something completely different about rocks."]
        score = compute_tfidf_similarity(text, text, corpus)

        print(f"  Identical text score: {score:.4f} ({score * 100:.1f}%)")
        self.assertEqual(score, 1.0)

    def test_check_plagiarism_finds_peer(self):
        _print_header("Plagiarism check - identical peer answers")

        submissions = [
            {
                "studentId": "student_a",
                "answers": [{
                    "questionId": "q1",
                    "questionType": "text",
                    "submittedAnswer": "Photosynthesis converts sunlight into glucose.",
                }],
            },
            {
                "studentId": "student_b",
                "answers": [{
                    "questionId": "q1",
                    "questionType": "text",
                    "submittedAnswer": "Photosynthesis converts sunlight into glucose.",
                }],
            },
        ]

        print("  Indexing submissions (TF-IDF peer index + ChromaDB if available)...")
        peer_index = prepare_plagiarism_index("test_exam", submissions)
        print(f"  Semantic index ready: {is_semantic_index_ready('test_exam')}")
        print(f"  Peers indexed for q1: {len(peer_index.get('q1', []))}")

        result = check_plagiarism(
            exam_id="test_exam",
            student_id="student_a",
            question_id="q1",
            submitted_answer="Photosynthesis converts sunlight into glucose.",
            peer_index=peer_index,
        )

        _print_plagiarism_result(result)

        self.assertEqual(result["cheatingScore"], 100.0)
        self.assertTrue(result["cheatingFlag"])
        self.assertEqual(result["cheatingDetails"]["suspectedPeerId"], "student_b")

    def test_check_plagiarism_with_mock_exam(self):
        _print_header("Plagiarism check - mock exam_001 (student_001, q1)")

        provider = DataProvider()
        submissions = provider.get_exam_submissions("exam_001")

        print(f"  Students in exam_001: {len(submissions)}")
        peer_index = prepare_plagiarism_index("exam_001", submissions)
        print(f"  Semantic index ready: {is_semantic_index_ready('exam_001')}")
        print(f"  Text answers indexed per question:")
        for q_id, peers in peer_index.items():
            print(f"    {q_id}: {len(peers)} answers")

        answer_text = "Photosynthesis is when plants make food using sunlight."
        print(f"\n  Checking student_001 on q1:")
        print(f"  Answer: {answer_text!r}")

        result = check_plagiarism(
            exam_id="exam_001",
            student_id="student_001",
            question_id="q1",
            submitted_answer=answer_text,
            peer_index=peer_index,
        )

        _print_plagiarism_result(result)
        print(f"\n  Full result JSON:\n{json.dumps(result, indent=2)}")

        self.assertIn("cheatingScore", result)
        self.assertIn("cheatingFlag", result)
        self.assertIn("tfidfScore", result["cheatingDetails"])
        self.assertGreaterEqual(result["cheatingScore"], 0.0)


class TestMcqGrading(unittest.TestCase):

    def test_mcq_correct(self):
        _print_header("MCQ grading - correct answer")
        result = grade_mcq("NaCl", "NaCl", 2)
        _print_mcq_result("correct", "NaCl", "NaCl", result)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["score"], 2)
        self.assertTrue(result["data"]["isCorrect"])

    def test_mcq_incorrect(self):
        _print_header("MCQ grading - wrong answer")
        result = grade_mcq("H2O", "NaCl", 2)
        _print_mcq_result("incorrect", "H2O", "NaCl", result)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["score"], 0)
        self.assertFalse(result["data"]["isCorrect"])

    def test_mcq_case_insensitive(self):
        _print_header("MCQ grading - case insensitive")
        result = grade_mcq("nacl", "NaCl", 2)
        _print_mcq_result("case-insensitive", "nacl", "NaCl", result)

        self.assertTrue(result["data"]["isCorrect"])


if __name__ == "__main__":
    # buffer=False ensures print() output is shown even when tests pass
    unittest.main(verbosity=2, buffer=False)
