/**
 * Renders a single exam question — MCQ (radio) or Text (textarea).
 *
 * @param {object} question — question data from the exam
 * @param {number} index — 0-based question index
 * @param {string} answer — current submitted answer
 * @param {function} onAnswer — callback(questionId, answer)
 * @param {boolean} readOnly — true when viewing results
 */
export default function QuestionCard({ question, index, answer, onAnswer, readOnly = false }) {
  const isMcq = question.type === 'mcq';
  const questionNumber = index + 1;

  return (
    <div
      className={`bg-bg-surface border rounded-2xl p-6 transition-all duration-200 ${
        answer ? 'border-primary/30 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]' : 'border-border'
      } ${readOnly ? 'opacity-95' : ''}`}
      id={`question-${question._id}`}
    >
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="inline-flex items-center justify-center min-w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white text-[13px] font-bold tracking-wider">
          Q{questionNumber}
        </span>
        <span className="text-xs text-text bg-bg-muted px-2.5 py-1 rounded-lg font-medium">
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </span>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ml-auto ${
            isMcq ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          {isMcq ? 'MCQ' : 'Written'}
        </span>
      </div>

      <p className="text-[16px] leading-relaxed text-text-header m-0 mb-4.5 font-medium">{question.questionText}</p>

      {isMcq ? (
        <div className="flex flex-col gap-2">
          {question.options.map((option, optIdx) => {
            const optionId = `q${question._id}-opt${optIdx}`;
            const isSelected = answer === option;
            return (
              <label
                key={optIdx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm text-text-header transition-all duration-200 ${
                  readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-primary/8 border-primary/40 shadow-sm'
                    : 'border-border hover:bg-accent/5 hover:border-accent/30'
                }`}
                htmlFor={optionId}
              >
                <input
                  type="radio"
                  id={optionId}
                  name={`question-${question._id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => !readOnly && onAnswer?.(question._id, option)}
                  disabled={readOnly}
                  className="absolute opacity-0 w-0 h-0"
                />
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary to-violet-500 text-white'
                      : 'bg-bg-muted text-text'
                  }`}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="leading-relaxed">{option}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className={`w-full min-h-[120px] p-3.5 border rounded-xl font-sans text-sm leading-relaxed text-text-header resize-y box-border transition-all duration-200 placeholder:text-text/50 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/12 ${
            readOnly ? 'cursor-default bg-bg-muted border-border' : 'border-border bg-bg-surface'
          }`}
          placeholder={readOnly ? '' : 'Type your answer here...'}
          value={answer || ''}
          onChange={(e) => !readOnly && onAnswer?.(question._id, e.target.value)}
          disabled={readOnly}
          rows={5}
          id={`textarea-${question._id}`}
        />
      )}
    </div>
  );
}
