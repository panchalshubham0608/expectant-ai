import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import ScrollToTop from './components/common/ScrollToTop';

import AppHome from './pages/AppHome';
import Dashboard from './pages/Dashboard';
import ProfileHome from './pages/ProfileHome';
import Journal from './pages/Journal';
import Insights from './pages/Insights';
import Pantry from './pages/Pantry';
import Health from './pages/Health';
import RequireAuth from './auth/RequireAuth';
import ExpectantProfile from './pages/ExpectantProfile';
import AppointmentsPage from './pages/AppointmentsPage';
import Reports from './pages/Reports';
import Reminders from './pages/Reminders';
import WeeklyUpdates from './pages/WeeklyUpdates';
import BabyNames from './pages/BabyNames';
import DailyDigestPage from './pages/DailyDigestPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user } = useAuth();
  const lastProfileId = localStorage.getItem('lastProfileId');

  const isAndroid = import.meta.env.MODE === "android";
  const Router = isAndroid ? HashRouter : BrowserRouter;

  return (
    <Router basename={isAndroid ? "" : "/expectant-ai/"}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={user ? <Navigate to={lastProfileId ? `/profile/${lastProfileId}` : "/dashboard"} replace /> : <AppHome />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:id" element={<AppLayout />}>
            <Route index element={<ProfileHome />} />
            <Route path="daily" element={<DailyDigestPage />} />
            <Route path="journal" element={<Journal />} />
            <Route path="insights" element={<Insights />} />
            <Route path="pantry" element={<Pantry />} />
            <Route path="health" element={<Health />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="expectant" element={<ExpectantProfile />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="weekly-updates" element={<WeeklyUpdates />} />
            <Route path="baby-names" element={<BabyNames />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
