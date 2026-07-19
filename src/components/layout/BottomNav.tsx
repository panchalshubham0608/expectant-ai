import { NavLink } from "react-router-dom";

import {
  Home,
  MessageCircle,
  BarChart3,
  ShoppingBasket,
  Baby
} from "lucide-react";


const items = [
  {
    name: "Home",
    path: "/",
    icon: Home,
  },
  {
    name: "Journal",
    path: "/journal",
    icon: MessageCircle,
  },
  {
    name: "Insights",
    path: "/insights",
    icon: BarChart3,
  },
  {
    name: "Pantry",
    path: "/pantry",
    icon: ShoppingBasket,
  },
  {
    name: "Baby",
    path: "/pregnancy",
    icon: Baby,
  },
];


function BottomNav() {

  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0
      border-t bg-white
      "
    >

      <div className="mx-auto flex max-w-md justify-around py-3">

        {items.map((item)=>{

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({isActive}) =>
                `
                flex flex-col items-center gap-1 text-xs
                ${
                  isActive
                  ? "text-green-700"
                  : "text-gray-400"
                }
                `
              }
            >

              <Icon size={22}/>

              {item.name}

            </NavLink>
          );

        })}

      </div>

    </nav>
  );
}

export default BottomNav;