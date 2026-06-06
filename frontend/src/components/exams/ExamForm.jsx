const ExamForm = ({ examData, onChange, onSubmit, onCancel, fieldErrors = {}, mode = 'create', children }) => {
  const subjects = JSON.parse(localStorage.getItem('recentSubjects') || '[]');
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label>Title</label>
        <input name="title" value={examData.title} onChange={onChange} />
        {fieldErrors.title && <p style={{ color: 'red' }}>{fieldErrors.title}</p>}
      </div>

      <div>
        <label>Subject</label>
        <input name="subject" value={examData.subject} onChange={onChange} list="subject-suggestions" />
        <datalist id="subject-suggestions">
          {subjects.map((s, i) => <option key={i} value={s} />)}
        </datalist>
        {fieldErrors.subject && <p style={{ color: 'red' }}>{fieldErrors.subject}</p>}
      </div>

      <div>
        <label>Duration (mins)</label>
        <input name="timeAllowed" type="number" value={examData.timeAllowed} onChange={onChange} />
        {fieldErrors.timeAllowed && <p style={{ color: 'red' }}>{fieldErrors.timeAllowed}</p>}
      </div>

      <div>
        <label>Total Marks</label>
        <input name="totalMarks" type="number" value={examData.totalMarks} onChange={onChange} />
        {fieldErrors.totalMarks && <p style={{ color: 'red' }}>{fieldErrors.totalMarks}</p>}
      </div>

      <div>
        <label>Scheduled Time</label>
        <input name="scheduledTime" type="datetime-local" value={examData.scheduledTime} onChange={onChange} />
        {fieldErrors.scheduledTime && <p style={{ color: 'red' }}>{fieldErrors.scheduledTime}</p>}
      </div>

      {children}

      <button type="submit">{mode === 'create' ? 'Create' : 'Update'}</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
};

export default ExamForm;