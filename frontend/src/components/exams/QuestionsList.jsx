import { useState } from 'react';
import { createQuestion, updateQuestion, deleteQuestion } from '../../services/exam_service';

const emptyQuestion = {
  type: 'text',
  questionText: '',
  marks: '',
  referenceAnswer: '',
  options: ['', '', '', ''],
};

const validateQuestion = (q) => {
  const errors = {};
  if (!q.questionText.trim())       errors.questionText    = 'Question text is required';
  if (!q.marks || q.marks <= 0 || !Number.isInteger(Number(q.marks)))
                                     errors.marks           = 'Marks must be a positive integer';
  if (!q.referenceAnswer.trim())    errors.referenceAnswer = 'Reference answer is required';
  if (q.type === 'mcq' && q.options.some(opt => !opt.trim()))
                                     errors.options         = 'All 4 options are required';
  return errors;
};

const QuestionsList = ({ questions, setQuestions, examId, editMode = false }) => {
  const [questionErrors, setQuestionErrors] = useState([]);
  const [apiError, setApiError]             = useState(null);

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion, options: ['', '', '', ''], isNew: true }]);
    setQuestionErrors([...questionErrors, {}]);
  };

  const removeQuestion = async (index) => {
    const q = questions[index];

    if (editMode && q._id) {
      try {
        await deleteQuestion(q._id);
      } catch (err) {
        const data = err.response?.data;
        if (data?.errors && Array.isArray(data.errors)) {
            setApiError(data.errors[0]);
        } else if (data?.message) {
            setApiError(data.message);
        } else {
            setApiError('Failed to delete question');
        }
        return;
      }
    }

    setQuestions(questions.filter((_, i) => i !== index));
    setQuestionErrors(questionErrors.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = field === 'marks' ? Number(value) : value;
    setQuestions(updated);

    const updatedErrors = [...questionErrors];
    if (updatedErrors[index] && Object.keys(updatedErrors[index]).length > 0) {
      updatedErrors[index] = validateQuestion(updated[index]);
    }
    setQuestionErrors(updatedErrors);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);

    const updatedErrors = [...questionErrors];
    if (updatedErrors[qIndex]) updatedErrors[qIndex].options = null;
    setQuestionErrors(updatedErrors);
  };

  const handleSaveQuestion = async (index) => {
    const q      = questions[index];
    const errors = validateQuestion(q);

    if (Object.keys(errors).length > 0) {
        const updatedErrors = [...questionErrors];
        updatedErrors[index] = errors;
        setQuestionErrors(updatedErrors);
        return;
    }

    setApiError(null);
    try {
        if (q._id) {
        await updateQuestion(q._id, q);
        } else {
        await createQuestion(examId, q);
        }
    } catch (err) {
        const data = err.response?.data;
        if (data?.errors && Array.isArray(data.errors)) {
        setApiError(data.errors[0]);
        } else if (data?.message) {
        setApiError(data.message);
        } else {
        setApiError('Failed to save question');
        }
    }
    };

  return (
    <div>
      <h3>Questions</h3>
      {apiError && <p style={{ color: 'red' }}>{apiError}</p>}

      {questions.map((q, index) => (
        <div key={index}>
          <p>Question {index + 1}</p>

          <div>
            <label>Type</label>
            <select value={q.type} onChange={(e) => handleChange(index, 'type', e.target.value)}>
              <option value="text">Text</option>
              <option value="mcq">MCQ</option>
            </select>
          </div>

          <div>
            <label>Question Text</label>
            <input value={q.questionText} onChange={(e) => handleChange(index, 'questionText', e.target.value)} />
            {questionErrors[index]?.questionText && <p style={{ color: 'red' }}>{questionErrors[index].questionText}</p>}
          </div>

          <div>
            <label>Marks</label>
            <input type="number" value={q.marks} onChange={(e) => handleChange(index, 'marks', e.target.value)} />
            {questionErrors[index]?.marks && <p style={{ color: 'red' }}>{questionErrors[index].marks}</p>}
          </div>

          <div>
            <label>Reference Answer</label>
            <input value={q.referenceAnswer} onChange={(e) => handleChange(index, 'referenceAnswer', e.target.value)} />
            {questionErrors[index]?.referenceAnswer && <p style={{ color: 'red' }}>{questionErrors[index].referenceAnswer}</p>}
          </div>

          {q.type === 'mcq' && (
            <div>
              <label>Options</label>
              {q.options.map((opt, oIndex) => (
                <input
                  key={oIndex}
                  placeholder={`Option ${oIndex + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(index, oIndex, e.target.value)}
                />
              ))}
              {questionErrors[index]?.options && <p style={{ color: 'red' }}>{questionErrors[index].options}</p>}
            </div>
          )}

          <button type="button" onClick={() => removeQuestion(index)}>Delete</button>
          {editMode && (
            <button type="button" onClick={() => handleSaveQuestion(index)}>Save Question</button>
          )}
        </div>
      ))}

      <button type="button" onClick={addQuestion}>Add Question</button>
    </div>
  );
};

export default QuestionsList;