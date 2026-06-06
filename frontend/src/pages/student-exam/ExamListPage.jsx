import { useState, useEffect } from 'react';
import { getAllExams, getSubmissionResult } from '../../services/studentExam.service';
import { MOCK_STUDENT } from '../../services/mock/studentExamMock';
import ExamCard from '../../components/student-exam/ExamCard';

export default function ExamListPage() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await getAllExams();
        const examList = res.data;
        setExams(examList);

        // Fetch submissions for each exam to determine status
        const submissionMap = {};
        await Promise.all(
          examList.map(async (exam) => {
            try {
              const subRes = await getSubmissionResult(exam._id, MOCK_STUDENT._id);
              if (subRes.data) {
                submissionMap[exam._id] = subRes.data;
              }
            } catch {
              // No submission for this exam — that's fine
            }
          })
        );
        setSubmissions(submissionMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Derive effective status for filtering
  function getEffectiveStatus(exam) {
    const sub = submissions[exam._id];
    if (sub) return sub.status === 'graded' ? 'graded' : 'submitted';
    const endTime = new Date(new Date(exam.scheduledTime).getTime() + exam.timeAllowed * 60000);
    if (new Date() > endTime) return 'expired';
    return 'available';
  }

  const filteredExams = filter === 'all'
    ? exams
    : exams.filter((e) => getEffectiveStatus(e) === filter);

  const filterCounts = {
    all: exams.length,
    available: exams.filter((e) => getEffectiveStatus(e) === 'available').length,
    submitted: exams.filter((e) => getEffectiveStatus(e) === 'submitted').length,
    graded: exams.filter((e) => getEffectiveStatus(e) === 'graded').length,
    expired: exams.filter((e) => getEffectiveStatus(e) === 'expired').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-10 max-w-[1000px] mx-auto sm:px-4 sm:py-6">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-text">
          <div className="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin dark:border-t-indigo-400" />
          <p className="m-0 text-sm font-medium">Loading your exams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-8 py-10 max-w-[1000px] mx-auto sm:px-4 sm:py-6">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-2">
          <h2 className="text-red-600 m-0 font-semibold text-2xl">Something went wrong</h2>
          <p className="text-text m-0">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-10 max-w-[1000px] mx-auto sm:px-4 sm:py-6" id="exam-list-page">
      {/* Header */}
      <div className="mb-7 text-left">
        <div>
          <h1 className="text-3xl font-bold text-text-header m-0 mb-1.5 tracking-tight sm:text-2xl">My Exams</h1>
          <p className="text-[15px] text-text m-0">
            Welcome back, <strong className="text-text-header font-semibold">{MOCK_STUDENT.name}</strong> — here are your assigned exams.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex gap-1.5 mb-7 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        id="exam-filters"
      >
        {['all', 'available', 'submitted', 'graded', 'expired'].map((f) => (
          <button
            key={f}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 ${filter === f
              ? 'bg-gradient-to-br from-primary to-violet-600 text-white border-transparent shadow-md shadow-primary/20 hover:text-white'
              : 'border-border bg-transparent text-text hover:border-accent hover:text-text-header'
              }`}
            onClick={() => setFilter(f)}
            id={`filter-${f}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-bold transition-all ${filter === f ? 'bg-white/25 text-white' : 'bg-black/6 text-text dark:bg-white/8'
                }`}
            >
              {filterCounts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Exam Grid */}
      {filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-15 px-5 text-text gap-3 opacity-65">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="m-0 text-sm font-medium">No exams match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 animate-fade-in-up sm:grid-cols-1" id="exam-grid">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam._id}
              exam={exam}
              submission={submissions[exam._id] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
