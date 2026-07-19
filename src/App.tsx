import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Insights from "./pages/Insights";
import Pantry from "./pages/Pantry";
import Pregnancy from "./pages/Pregnancy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/pregnancy" element={<Pregnancy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;