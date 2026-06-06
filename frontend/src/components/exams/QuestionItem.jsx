const QuestionItem = ({ question, index }) => {
  return (
    <div>
      <p><strong>Q{index + 1}:</strong> {question.questionText}</p>
      <p>Type: {question.type} | Marks: {question.marks}</p>

      {question.type === 'mcq' && (
        <ul>
          {question.options.map((opt, i) => (
            <li key={i}
              style={{ 
                fontWeight: opt === question.referenceAnswer ? 'bold' : 'normal' 
              }}
            >
              {opt} {opt === question.referenceAnswer ? '✓' : ''}
            </li>
          ))}
        </ul>
      )}

      {question.type === 'text' && (
        <p>Reference Answer: {question.referenceAnswer}</p>
      )}
    </div>
  );
};

export default QuestionItem;