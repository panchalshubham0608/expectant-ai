import { NavLink, useParams } from 'react-router-dom';

import { Home, MessageCircle, BarChart3, ShoppingBasket, HeartPulse } from 'lucide-react';

function BottomNav() {
  const { id } = useParams();
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
      <div className="mx-auto flex max-w-md justify-around py-3">
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
      </div>
    </nav>
  );
}

export default BottomNav;
