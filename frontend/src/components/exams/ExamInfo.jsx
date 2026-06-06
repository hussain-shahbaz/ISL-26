import StatusBadge from './StatusBadge';

const LOCKED_STATUSES = ['published', 'submitted', 'checked'];

const ExamInfo = ({ exam, onStatusChange, onEdit, onDelete, error }) => {

  const isLocked = LOCKED_STATUSES.includes(exam.status);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-PK', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const canMoveToDraft = () => {
    return new Date() < new Date(exam.scheduledTime);
  };

  const getAvailableStatuses = () => {
    if (exam.status === 'draft') return ['published'];
    if (exam.status === 'published' && canMoveToDraft()) return ['draft'];
    return [];
  };

  const availableStatuses = getAvailableStatuses();

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>{exam.title}</h2>
      <StatusBadge status={exam.status} />

      <p>Subject: {exam.subject}</p>
      <p>Teacher: {exam.teacherName}</p>
      <p>Duration: {exam.timeAllowed} mins</p>
      <p>Total Marks: {exam.totalMarks}</p>
      <p>Scheduled: {formatDate(exam.scheduledTime)}</p>
      <p>Students: {exam.students?.length || 0} enrolled</p>

      <div>
        {!isLocked && <button onClick={onEdit}>Edit</button>}

        {availableStatuses.map((status) => (
          <button key={status} onClick={() => onStatusChange(status)}>
            Move to {status}
          </button>
        ))}

        {!isLocked && (
          <button onClick={onDelete} style={{ color: 'red' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamInfo;