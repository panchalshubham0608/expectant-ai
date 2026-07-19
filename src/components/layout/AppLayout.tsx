import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-900">
      <main className="mx-auto max-w-md px-4 pb-24 pt-6">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

export default AppLayout;
