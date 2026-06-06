import { Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/Landing';
import NotFoundPage from '@/pages/NotFound';
import LoginPage from '@/pages/auth/Login';
import RegisterPage from '@/pages/auth/Register';
import VerifyOtpPage from '@/pages/auth/VerifyOtp';
import ForgotPasswordPage from '@/pages/auth/ForgotPassword';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
