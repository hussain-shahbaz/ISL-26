import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getExamById, updateExam } from '../services/exam_service';
import ExamForm from '../components/exams/ExamForm';
import QuestionsList from '../components/exams/QuestionsList';

const EditExamPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [students, setStudents]   = useState([]);
  const [questions, setQuestions] = useState([]);
  const [examData, setExamData]   = useState({
    title:         '',
    subject:       '',
    timeAllowed:   '',
    totalMarks:    '',
    scheduledTime: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});

    const validate = () => {
    const errors = {};

    if (!examData.title.trim())
        errors.title = 'Title is required';

    if (!examData.subject.trim())
        errors.subject = 'Subject is required';

    if (!examData.timeAllowed || examData.timeAllowed <= 0 || !Number.isInteger(Number(examData.timeAllowed)))
        errors.timeAllowed = 'Duration must be a positive integer';

    if (!examData.totalMarks || examData.totalMarks <= 0 || !Number.isInteger(Number(examData.totalMarks)))
        errors.totalMarks = 'Total marks must be a positive integer';

    if (!examData.scheduledTime)
        errors.scheduledTime = 'Scheduled time is required';
    else if (new Date(examData.scheduledTime) <= new Date())
        errors.scheduledTime = 'Scheduled time must be in the future';

    if (students.length === 0)
        errors.students = 'Please upload a students file';

    return errors;
    };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await getExamById(id);
        const exam = res.data.data;

        setExamData({
          title:         exam.title,
          subject:       exam.subject,
          timeAllowed:   exam.timeAllowed,
          totalMarks:    exam.totalMarks,
          scheduledTime: exam.scheduledTime
            ? new Date(exam.scheduledTime).toISOString().slice(0, 16)
            : '',
        });
        setStudents(exam.students || []);
        setQuestions(res.data.data.questions || []);
      } catch (err) {
        setError('Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const handleExamChange = (e) => {
    setExamData({ ...examData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook  = XLSX.read(evt.target.result, { type: 'binary' });
      const sheet     = workbook.Sheets[workbook.SheetNames[0]];
      const rows      = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const rollNumbers = rows.flat().slice(1).map(String).filter(Boolean);
      setStudents(rollNumbers);
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
    }

    try {
        await updateExam(id, {
        ...examData,
        timeAllowed: Number(examData.timeAllowed),
        totalMarks:  Number(examData.totalMarks),
        students,
        });
        navigate(`/exam/question/${id}`);
    } catch (err) {
        const data = err.response?.data;
        if (data?.errors) setError(data.errors[0]);
        else if (data?.message) setError(data.message);
        else setError('Something went wrong');
    }
    };
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Edit Exam</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ExamForm
        examData={examData}
        onChange={handleExamChange}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/exam/question/${id}`)}
        mode="edit"
      >
        <div>
          <h3>Students</h3>
          <p>{students.length} students currently enrolled</p>
          <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          {students.length > 0 && (
            <p>Preview: {students.slice(0, 3).join(', ')}{students.length > 3 ? ` ... +${students.length - 3} more` : ''}</p>
          )}
        </div>
      </ExamForm>

      <h3>Questions</h3>
      <QuestionsList questions={questions} setQuestions={setQuestions} examId={id} editMode={true} />
    </div>
  );
};

export default EditExamPage;