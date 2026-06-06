/**
 * Confirmation modal before submitting an exam.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {number} totalQuestions
 * @param {number} answeredCount
 * @param {boolean} isSubmitting — loading state
 */
export default function SubmitModal({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  const unanswered = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-md p-5 transition-all duration-200"
      onClick={onClose}
      id="submit-modal-overlay"
    >
      <div
        className="bg-bg-surface border border-border rounded-2xl p-8 w-full max-w-[420px] text-center shadow-2xl transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-modal-title"
        id="submit-modal"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-violet-500/12 flex items-center justify-center mx-auto mb-4">
          <svg className="text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        <h2 className="text-[22px] font-semibold text-text-header m-0 mb-1.5" id="submit-modal-title">
          Submit Exam?
        </h2>

        <p className="text-sm text-text m-0 mb-6">
          Once submitted, you cannot modify your answers.
        </p>

        {/* Summary stats */}
        <div className="flex items-center justify-center p-4 bg-bg-muted rounded-xl mb-4">
          <div className="flex-1 text-center">
            <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{answeredCount}</span>
            <span className="text-[11px] font-semibold text-text uppercase tracking-wider">Answered</span>
          </div>
          <div className="w-px h-9 bg-border" />
          <div className="flex-1 text-center">
            <span className={`block text-2xl font-bold leading-tight ${unanswered > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-header'}`}>
              {unanswered}
            </span>
            <span className="text-[11px] font-semibold text-text uppercase tracking-wider">Unanswered</span>
          </div>
          <div className="w-px h-9 bg-border" />
          <div className="flex-1 text-center">
            <span className="block text-2xl font-bold text-text-header leading-tight">{totalQuestions}</span>
            <span className="text-[11px] font-semibold text-text uppercase tracking-wider">Total</span>
          </div>
        </div>

        {unanswered > 0 && (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-6">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            You have {unanswered} unanswered {unanswered === 1 ? 'question' : 'questions'}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            className="flex-1 py-3 px-5 rounded-xl text-sm font-semibold cursor-pointer border-0 transition-all duration-205 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-bg-muted hover:bg-border text-text-header"
            onClick={onClose}
            disabled={isSubmitting}
            id="submit-modal-cancel"
          >
            Go Back
          </button>
          <button
            className="flex-1 py-3 px-5 rounded-xl text-sm font-semibold cursor-pointer border-0 transition-all duration-205 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-br from-primary to-violet-600 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
            onClick={onConfirm}
            disabled={isSubmitting}
            id="submit-modal-confirm"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
