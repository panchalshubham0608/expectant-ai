import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';

import {
  Home,
  MessageCircle,
  BarChart3,
  ShoppingBasket,
  HeartPulse,
  LogOut,
  Menu,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';

function BottomNav() {
  const { id } = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const basePath = id ? `/profile/${id}` : '/dashboard';

  const items = [
    {
      name: 'Home',
      path: basePath,
      icon: Home,
    },
    {
      name: 'Journal',
      path: `${basePath}/journal`,
      icon: MessageCircle,
    },
    {
      name: 'Insights',
      path: `${basePath}/insights`,
      icon: BarChart3,
    },
    {
      name: 'Pantry',
      path: `${basePath}/pantry`,
      icon: ShoppingBasket,
    },
    {
      name: 'Health',
      path: `${basePath}/health`,
      icon: HeartPulse,
    },
  ];

  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0
      border-t bg-white
      "
    >
      <div className="relative mx-auto flex max-w-md justify-around py-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                flex flex-col items-center gap-1 text-xs
                ${isActive ? 'text-green-700' : 'text-gray-400'}
                `
              }
            >
              <Icon size={22} />

              {item.name}
            </NavLink>
          );
        })}
        {id && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex flex-col items-center gap-1 text-xs text-gray-400 transition hover:text-green-700"
              aria-label="Open profile menu"
              aria-expanded={isMenuOpen}
            >
              <Menu size={22} />
              More
            </button>
            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <UsersRound size={17} />
                  View profiles
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default BottomNav;
