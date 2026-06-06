import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamDetails, submitExam } from '../../services/studentExam.service';
import QuestionCard from '../../components/student-exam/QuestionCard';
import ExamTimer from '../../components/student-exam/ExamTimer';
import SubmitModal from '../../components/student-exam/SubmitModal';

export default function ExamTakingPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: answer }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);

  useEffect(() => {
    async function fetchExam() {
      try {
        setLoading(true);
        const res = await getExamDetails(examId);
        setExam(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchExam();
  }, [examId]);

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const answeredCount = exam
    ? exam.questions.filter((q) => answers[q._id] && answers[q._id].trim() !== '').length
    : 0;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const formattedAnswers = exam.questions
        .filter((q) => answers[q._id])
        .map((q) => ({
          question: { questionId: q._id },
          submittedAnswer: answers[q._id],
        }));

      await submitExam(examId, formattedAnswers);
      navigate(`/student/exams/${examId}/result`, { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      setShowModal(false);
      setError(err.message);
    }
  };

  const handleTimeUp = useCallback(() => {
    // Auto-submit when time runs out
    setShowModal(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-text">
          <div className="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin" />
          <p className="m-0 text-sm font-medium">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-2 px-4">
          <h2 className="text-red-600 m-0 font-semibold text-2xl">Error</h2>
          <p className="text-text m-0">{error}</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="mt-3 py-2.5 px-5 rounded-lg border border-border bg-transparent text-text-header text-sm font-medium cursor-pointer transition-all duration-205 hover:bg-bg-muted"
          >
            ← Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !exam.questions) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-2 px-4">
          <h2 className="text-text-header m-0 font-semibold text-2xl">Exam not available</h2>
          <p className="text-text m-0">This exam doesn't have any questions or is not accessible.</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="mt-3 py-2.5 px-5 rounded-lg border border-border bg-transparent text-text-header text-sm font-medium cursor-pointer transition-all duration-205 hover:bg-bg-muted"
          >
            ← Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-left" id="exam-taking-page">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 px-8 py-4 bg-bg-surface/90 border-b border-border backdrop-blur-md flex-wrap md:px-4 md:py-3">
        <div className="flex items-center gap-4">
          <button
            className="bg-transparent border-0 text-text text-sm cursor-pointer py-1.5 px-2.5 rounded-lg transition-all duration-205 hover:bg-bg-muted hover:text-text-header"
            onClick={() => navigate('/student/exams')}
            id="back-to-exams"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-header m-0 tracking-tight">{exam.subject}</h1>
            <p className="text-[13px] text-text m-0 mt-0.5">
              {exam.totalMarks} marks · {exam.questions.length} questions
            </p>
          </div>
        </div>
        <ExamTimer durationMinutes={exam.timeAllowed} onTimeUp={handleTimeUp} />
      </div>

      <div className="flex flex-1 max-w-[1100px] mx-auto w-full px-8 py-6 pb-15 gap-7 md:flex-col md:p-4">
        {/* Question navigation sidebar */}
        <aside className="sticky top-[100px] self-start w-[180px] shrink-0 flex flex-col gap-4 md:static md:w-full md:flex-row md:flex-wrap md:items-center md:gap-3" id="question-nav">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text m-0 md:hidden">Questions</h3>
          <div className="grid grid-cols-4 gap-1.5 md:grid-cols-[repeat(auto-fill,38px)] md:flex-1">
            {exam.questions.map((q, idx) => {
              const isAnswered = answers[q._id] && answers[q._id].trim() !== '';
              const isActive = idx === activeQuestion;
              let navButtonClass = 'border-border text-text hover:border-accent hover:text-accent';

              if (isAnswered) {
                navButtonClass = 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-transparent text-white';
                if (isActive) navButtonClass += ' ring-2 ring-emerald-500/30';
              } else if (isActive) {
                navButtonClass = 'border-primary bg-primary/8 text-primary';
              }

              return (
                <button
                  key={q._id}
                  className={`w-[38px] h-[38px] rounded-lg border text-[13px] font-semibold cursor-pointer flex items-center justify-center transition-all duration-205 ${navButtonClass}`}
                  onClick={() => {
                    setActiveQuestion(idx);
                    document.getElementById(`question-${q._id}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }}
                  id={`nav-q-${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5 md:flex-1 md:min-w-[120px]">
            <div className="h-1 rounded bg-border overflow-hidden">
              <div
                className="h-full rounded bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                style={{
                  width: `${(answeredCount / exam.questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-[12px] text-text text-center">
              {answeredCount}/{exam.questions.length} answered
            </span>
          </div>

          <button
            className="w-full py-3 px-5 rounded-xl border-0 bg-gradient-to-br from-primary to-violet-600 text-white text-sm font-semibold cursor-pointer transition-all duration-250 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 md:w-auto md:shrink-0"
            onClick={() => setShowModal(true)}
            id="open-submit-modal"
          >
            Submit Exam
          </button>
        </aside>

        {/* Questions list */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">
          {exam.questions.map((question, idx) => (
            <QuestionCard
              key={question._id}
              question={question}
              index={idx}
              answer={answers[question._id] || ''}
              onAnswer={handleAnswer}
            />
          ))}
        </main>
      </div>

      {/* Submit Modal */}
      <SubmitModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
        totalQuestions={exam.questions.length}
        answeredCount={answeredCount}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
