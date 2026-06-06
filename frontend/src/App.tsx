import { Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/Landing';
import NotFoundPage from '@/pages/NotFound';
import LoginPage from '@/pages/auth/Login';
import RegisterPage from '@/pages/auth/Register';
import VerifyOtpPage from '@/pages/auth/VerifyOtp';
import ForgotPasswordPage from '@/pages/auth/ForgotPassword';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/app/AppShell';
import DashboardPage from '@/pages/app/Dashboard';
import ExamsListPage from '@/pages/app/ExamsList';
import ExamDetailPage from '@/pages/app/ExamDetail';
import CreateExamPage from '@/pages/app/CreateExam';
import SettingsPage from '@/pages/app/Settings';
import ExamRunnerPage from '@/pages/app/ExamRunner';
import ResultsPage from '@/pages/app/Results';
import UsersPage from '@/pages/app/Users';
import AuditPage from '@/pages/app/Audit';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Full-screen proctored runner lives outside the app shell. */}
      <Route
        path="/app/exam/:examId/take"
        element={
          <ProtectedRoute roles={['student']}>
            <ExamRunnerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="exams" element={<ExamsListPage />} />
        <Route
          path="exams/new"
          element={
            <ProtectedRoute roles={['teacher']}>
              <CreateExamPage />
            </ProtectedRoute>
          }
        />
        <Route path="exams/:id" element={<ExamDetailPage />} />
        <Route
          path="results"
          element={
            <ProtectedRoute roles={['student']}>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={['admin']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
