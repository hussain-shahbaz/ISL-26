import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamsPage from '../pages/ExamsPage';
import CreateExamPage from '../pages/CreateExamPage';
import ExamDetailPage from '../pages/ExamDetailPage';
import EditExamPage from '../pages/EditExamPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExamsPage />} />
        <Route path="/create" element={<CreateExamPage />} />
        <Route path="/exam/question/:id" element={<ExamDetailPage />} />
        <Route path="/exam/:id/edit" element={<EditExamPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;