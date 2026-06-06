import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { createExam } from '../services/exam_service';
import ExamForm from '../components/exams/ExamForm';
import QuestionsList from '../components/exams/QuestionsList';

const CreateExamPage = () => {
  const navigate = useNavigate();
  const [error, setError]       = useState(null);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [examData, setExamData] = useState({
    title:         '',
    subject:       '',
    timeAllowed:   '',
    totalMarks:    '',
    scheduledTime: '',
  });

  const handleExamChange = (e) => {
    setExamData({ ...examData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null }); // clear error on change
  };

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

    if (questions.length === 0)
      errors.questions = 'At least one question is required';

    return errors;
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const rollNumbers = rows.flat().slice(1).map(String).filter(Boolean); // slice(1) header skip
      setStudents(rollNumbers);
      setFieldErrors(prev => ({ ...prev, students: null }));
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
      await createExam({
        ...examData,
        timeAllowed: Number(examData.timeAllowed),  // string nahi integer
        totalMarks:  Number(examData.totalMarks),    // string nahi integer
        students,
        questions
      });
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        setError(data.errors[0]); // sirf pehla error
      } else if (data?.message) {
        setError(data.message);
      } else {
        setError('Something went wrong');
      }
    }
  };

  return (
    <div>
      <h1>Create Exam</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ExamForm
        examData={examData}
        onChange={handleExamChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
        fieldErrors={fieldErrors}
        mode="create"
      >
        <div>
          <h3>Students</h3>
          <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          {fieldErrors.students && <p style={{ color: 'red' }}>{fieldErrors.students}</p>}
          {students.length > 0 && (
            <div>
                <p>{students.length} students loaded</p>
                <p>Preview: {students.slice(0, 3).join(', ')}{students.length > 3 ? ` ... +${students.length - 3} more` : ''}</p>
            </div>
          )}
        </div>

        <QuestionsList questions={questions} setQuestions={setQuestions} />
        {fieldErrors.questions && <p style={{ color: 'red' }}>{fieldErrors.questions}</p>}

      </ExamForm>
    </div>
  );
};

export default CreateExamPage;