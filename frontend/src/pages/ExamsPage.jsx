import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllExams, deleteExam } from '../services/exam_service';

const ExamsPage = () => {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      console.log(import.meta.env.VITE_API_URL)
      const res = await getAllExams();
      setExams(res.data.data|| []);
    };
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    await deleteExam(id);
    const res = await getAllExams();
    setExams(res.data.data);
  };

  return (
    <div>
      <h1>My Exams</h1>
      <button onClick={() => navigate('/create')}>Create New Exam</button>

      {exams.map((exam) => (
        <div key={exam._id}>
          <h2>{exam.title}</h2>
          <p>{exam.subject}</p>
          <p>Status: {exam.status}</p>
          <p>Total Marks: {exam.totalMarks}</p>
          <button onClick={() => navigate(`/exam/${exam._id}`)}>View</button>
          <button onClick={() => handleDelete(exam._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};

export default ExamsPage;