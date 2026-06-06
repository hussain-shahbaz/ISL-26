import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExamById, updateExamStatus, deleteExam } from '../services/exam_service';
import { getQuestionsByExam } from '../services/exam_service';
import ExamInfo   from '../components/exams/ExamInfo';
import QuestionItem from '../components/exams/QuestionItem';

const ExamDetailPage = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [exam, setExam]           = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, questionsRes] = await Promise.all([
          getExamById(id),
          getQuestionsByExam(id)
        ]);
        setExam(examRes.data.data);
        setQuestions(questionsRes.data.data.questions || []);;
      } catch (err) {
        const data = err.response?.data;
        if (data?.errors) setError(data.errors[0]);
        else if (data?.message) setError(data.message);
        else setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setError(null);
    try {
      const res = await updateExamStatus(id, newStatus);
      setExam(res.data.data);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setError(data.errors[0]);
      else if (data?.message) setError(data.message);
      else setError('Something went wrong');
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteExam(id);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setError(data.errors[0]);
      else if (data?.message) setError(data.message);
      else setError('Something went wrong');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!exam)   return <p>Exam not found</p>;

  return (
    <div>
      <button onClick={() => navigate('/')}>Back</button>

      <ExamInfo
        exam={exam}
        error={error}
        onEdit={() => navigate(`/exam/${id}/edit`)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      <h3>Questions ({questions.length})</h3>
      {questions.length === 0
        ? <p>No questions added yet</p>
        : questions.map((q, i) => (
            <QuestionItem key={q._id} question={q} index={i} />
          ))
      }
    </div>
  );
};

export default ExamDetailPage;