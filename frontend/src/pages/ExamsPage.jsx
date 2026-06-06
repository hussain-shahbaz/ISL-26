import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllExams, deleteExam } from '../services/exam_service';
import ExamCard from '../components/exams/ExamCard';

const ExamsPage = () => {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
    const res = await getAllExams();
    const data = res.data.data || [];
    setExams(data);

    // subjects nikal ke store karo
    const subjects = [...new Set(data.map(e => e.subject).filter(Boolean))];
    localStorage.setItem('recentSubjects', JSON.stringify(subjects));
  };
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    await deleteExam(id);
    const res = await getAllExams();
    setExams(res.data.data || []);
  };

  return (
    <div>
      <h1>My Exams</h1>
      <button onClick={() => navigate('/create')}>Create New Exam</button>

      {exams.map((exam) => (
        <ExamCard key={exam._id} exam={exam} onDelete={handleDelete} />
      ))}
    </div>
  );
};

export default ExamsPage;