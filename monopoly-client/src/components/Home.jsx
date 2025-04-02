import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="home-container">
      <h1>Добро пожаловать в Монополию!</h1>

      {isAuthenticated ? (
        <div className="auth-links">
          <Link to="/profile" className="nav-button">
            Профиль
          </Link>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/auth/login" className="nav-button">
            Войти
          </Link>
          <Link to="/auth/registration" className="nav-button">
            Регистрация
          </Link>
        </div>
      )}
    </div>
  );
}
