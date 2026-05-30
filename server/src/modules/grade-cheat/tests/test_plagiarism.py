"""
Tests for plagiarism detection.

Run:
    python -m unittest tests/test_plagiarism.py
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.plagiarism import (
    build_peer_index,
    check_plagiarism,
    compute_tfidf_similarity,
)
from app.grader import grade_mcq
from app.data_provider import DataProvider


class TestPlagiarismDetection(unittest.TestCase):

    def test_tfidf_similarity(self):
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

        self.assertGreater(sim_ab, sim_ac)

    def test_identical_answers_score_100(self):
        text = "The water cycle involves evaporation, condensation, and precipitation."
        corpus = [text, "Something completely different about rocks."]
        self.assertEqual(compute_tfidf_similarity(text, text, corpus), 1.0)

    def test_check_plagiarism_finds_peer(self):
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
        peer_index = build_peer_index(submissions)
        result = check_plagiarism(
            student_id="student_a",
            question_id="q1",
            submitted_answer="Photosynthesis converts sunlight into glucose.",
            peer_index=peer_index,
        )

        self.assertEqual(result["cheatingScore"], 100.0)
        self.assertTrue(result["cheatingFlag"])
        self.assertEqual(result["cheatingDetails"]["suspectedPeerId"], "student_b")

    def test_check_plagiarism_with_mock_exam(self):
        provider = DataProvider()
        submissions = provider.get_exam_submissions("exam_001")
        peer_index = build_peer_index(submissions)

        result = check_plagiarism(
            student_id="student_001",
            question_id="q1",
            submitted_answer="Photosynthesis is when plants make food using sunlight.",
            peer_index=peer_index,
        )

        self.assertIn("cheatingScore", result)
        self.assertIn("cheatingFlag", result)
        self.assertGreaterEqual(result["cheatingScore"], 0.0)


class TestMcqGrading(unittest.TestCase):

    def test_mcq_correct(self):
        result = grade_mcq("NaCl", "NaCl", 2)
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["score"], 2)
        self.assertTrue(result["data"]["isCorrect"])

    def test_mcq_incorrect(self):
        result = grade_mcq("H2O", "NaCl", 2)
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["score"], 0)
        self.assertFalse(result["data"]["isCorrect"])

    def test_mcq_case_insensitive(self):
        result = grade_mcq("nacl", "NaCl", 2)
        self.assertTrue(result["data"]["isCorrect"])


if __name__ == "__main__":
    unittest.main()
