import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';

import AppHome from './pages/AppHome';
import Dashboard from './pages/Dashboard';
import ProfileDetail from './pages/ProfileDetail';
import Journal from './pages/Journal';
import Insights from './pages/Insights';
import Pantry from './pages/Pantry';
import Health from './pages/Health';
import RequireAuth from './auth/RequireAuth';
import ProfilePage from './pages/ProfilePage';
import AppointmentsPage from './pages/AppointmentsPage';
import Reports from './pages/Reports';
import Reminders from './pages/Reminders';

function App() {
  return (
    <BrowserRouter basename="/expectant-ai">
      <Routes>
        <Route path="/" element={<AppHome />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:id" element={<AppLayout />}>
            <Route index element={<ProfileDetail />} />
            <Route path="journal" element={<Journal />} />
            <Route path="insights" element={<Insights />} />
            <Route path="pantry" element={<Pantry />} />
            <Route path="health" element={<Health />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="expectant" element={<ProfilePage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reminders" element={<Reminders />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
