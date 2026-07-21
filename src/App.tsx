import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Insights from './pages/Insights';
import Pantry from './pages/Pantry';
import Health from './pages/Health';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route element={<AppLayout />}>
          <Route path="/journal" element={<Journal />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/health" element={<Health />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
