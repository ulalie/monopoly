import { Link } from "react-router-dom";
import React from "react";

export default function Footer() {
  return (
     <footer className="bg-gray-50 border-t border-gray-200 mt-12 py-6"> {/* Уменьшили mt-20 → mt-12 и py-8 → py-6 */}
      <div className="container mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="/logo.png" 
              alt="Monopoly Logo" 
              className="w-8 h-8"
            />
            <span className="ml-2 text-lg font-bold text-gray-600">
              Monopoly
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0 ml-30">
            <Link 
              to="/" 
              className="text-gray-500 hover:text-emerald-500 transition-colors"
            >
              Главная
            </Link>
            <Link 
              to="/lobby" 
              className="text-gray-500 hover:text-emerald-500 transition-colors"
            >
              Лобби
            </Link>
            <Link 
              to="/profile" 
              className="text-gray-500 hover:text-emerald-500 transition-colors"
            >
              Профиль
            </Link>
          </nav>

          <div className="text-center md:text-right text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Monopoly Team</p>
            <p>Курсовой проект по веб-разработке</p>
          </div>
        </div>
      </div>
    </footer>
  );
}