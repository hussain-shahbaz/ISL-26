import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamsPage from '../pages/ExamsPage';
// import CreateExamPage from '../pages/exams/CreateExamPage';
// import ExamDetailPage from '../pages/exams/ExamDetailPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExamsPage />} />
        {/* <Route path="/create" element={<CreateExamPage />} /> */}
        {/* <Route path="/exam/:id" element={<ExamDetailPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;