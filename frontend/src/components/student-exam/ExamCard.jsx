import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ExamCard({ exam, submission }) {
  const navigate = useNavigate();

  const scheduledDate = new Date(exam.scheduledTime);
  const endTime = new Date(scheduledDate.getTime() + exam.timeAllowed * 60 * 1000);
  const now = new Date();

  // Determine effective status considering submission state
  let effectiveStatus = exam.status;
  let isExpired = false;
  let canTakeExam = false;

  if (submission) {
    effectiveStatus = submission.status === 'graded' ? 'graded' : 'submitted';
  } else if (now > endTime) {
    isExpired = true;
    effectiveStatus = 'expired';
  } else if (now >= scheduledDate && now <= endTime) {
    canTakeExam = true;
  }

  function handleClick() {
    if (submission) {
      navigate(`/student/exams/${exam._id}/result`);
    } else if (canTakeExam) {
      navigate(`/student/exams/${exam._id}`);
    }
  }

  const isClickable = !!submission || canTakeExam;

  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let accentClass = 'bg-zinc-400';
  if (effectiveStatus === 'published' || effectiveStatus === 'available') {
    accentClass = 'bg-gradient-to-b from-emerald-500 to-emerald-600';
  } else if (effectiveStatus === 'pending_grading' || effectiveStatus === 'submitted') {
    accentClass = 'bg-gradient-to-b from-blue-500 to-blue-600';
  } else if (effectiveStatus === 'graded') {
    accentClass = 'bg-gradient-to-b from-purple-500 to-indigo-600';
  } else if (effectiveStatus === 'expired') {
    accentClass = 'bg-gradient-to-b from-red-500 to-red-600';
  }

  return (
    <div
      className={`group relative bg-bg-surface border border-border rounded-2xl p-6 pl-7 overflow-hidden transition-all duration-250 ${
        isClickable
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
          : ''
      }`}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && isClickable && handleClick()}
      id={`exam-card-${exam._id}`}
    >
      {/* Accent border strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-250 ${isClickable ? 'group-hover:w-1.5' : ''} ${accentClass}`} />

      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-lg text-text-header leading-tight m-0">{exam.subject}</h3>
        <StatusBadge status={effectiveStatus} />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-text m-0 mb-4">
        <svg className="w-3.5 h-3.5 shrink-0 opacity-60 text-text" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
        </svg>
        {exam.instructorName || `Instructor #${exam.instructorId}`}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5 text-xs text-text">
          <svg className="w-3.5 h-3.5 shrink-0 opacity-60 text-text" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text">
          <svg className="w-3.5 h-3.5 shrink-0 opacity-60 text-text" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span>{formattedTime}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text">
          <svg className="w-3.5 h-3.5 shrink-0 opacity-60 text-text" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>{exam.totalMarks} marks</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text">
          <svg className="w-3.5 h-3.5 shrink-0 opacity-60 text-text" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          <span>{exam.timeAllowed} min</span>
        </div>
      </div>

      {isClickable && (
        <div className="mt-4 pt-3.5 border-t border-border text-[13px] font-semibold text-accent tracking-wide transition-all duration-200 group-hover:tracking-wider">
          {submission
            ? 'View Result →'
            : canTakeExam
              ? 'Start Exam →'
              : ''}
        </div>
      )}
    </div>
  );
}
