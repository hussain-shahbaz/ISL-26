import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const ExamCard = ({ exam }) => {
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-PK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
        <h2>{exam.title}</h2>
        <p>Subject: {exam.subject}</p>
        <StatusBadge status={exam.status} />
        <p>Total Marks: {exam.totalMarks}</p>
        <p>Duration: {exam.timeAllowed} mins</p>
        <p>Scheduled: {formatDate(exam.scheduledTime)}</p>
        <button onClick={() => navigate(`/exam/question/${exam._id}`)}>View</button>
    </div>
    );
};

export default ExamCard;