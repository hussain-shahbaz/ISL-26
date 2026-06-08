import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoader } from '@/components/ui/spinner';

const LandingPage = lazy(() => import('@/pages/Landing'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const RegisterPage = lazy(() => import('@/pages/auth/Register'));
const VerifyOtpPage = lazy(() => import('@/pages/auth/VerifyOtp'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'));
const AppShell = lazy(() => import('@/components/app/AppShell').then((m) => ({ default: m.AppShell })));
const DashboardPage = lazy(() => import('@/pages/app/Dashboard'));
const ExamsListPage = lazy(() => import('@/pages/app/ExamsList'));
const ExamDetailPage = lazy(() => import('@/pages/app/ExamDetail'));
const CreateExamPage = lazy(() => import('@/pages/app/CreateExam'));
const SettingsPage = lazy(() => import('@/pages/app/Settings'));
const ExamRunnerPage = lazy(() => import('@/pages/app/ExamRunner'));
const ResultsPage = lazy(() => import('@/pages/app/Results'));
const StudentResultPage = lazy(() => import('@/pages/app/StudentResult'));
const UsersPage = lazy(() => import('@/pages/app/Users'));
const AuditPage = lazy(() => import('@/pages/app/Audit'));
const RiskPage = lazy(() => import('@/pages/app/Risk'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
            path="results/:id"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentResultPage />
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
          <Route
            path="risk"
            element={
              <ProtectedRoute roles={['admin']}>
                <RiskPage />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
