import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ExamListPage from './pages/student-exam/ExamListPage';
import ExamTakingPage from './pages/student-exam/ExamTakingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/student/exams" element={<ExamListPage />} />
        <Route path="/student/exams/:examId" element={<ExamTakingPage />} />
        {/* Fallback routes */}
        <Route path="/student" element={<Navigate to="/student/exams" replace />} />
        <Route path="*" element={<Navigate to="/student/exams" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
