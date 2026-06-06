import { useAuthStore } from '@/store/auth';
import StudentDashboard from './dashboards/StudentDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
}
