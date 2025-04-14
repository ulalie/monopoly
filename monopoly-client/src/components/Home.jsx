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
    <div class="bg-lime-100 ">
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
      <h1>Добро пожаловать в Монополию!</h1>
      <p>
        Это не просто игра — это ваш шанс стать магнатом виртуальной
        недвижимости, не вставая с дивана! 🏙️💸
        <br></br>
        Данное приложение является нашим курсовым проектом, который объединяет
        классическую настольную игру с цифровыми возможностями. Здесь вы можете:{" "}
        <br></br>✅ Играть с друзьями <b>онлайн</b> из любой точки мира{" "}
        <br></br>✅ Создавать приватные комнаты или присоединяться к случайным
        оппонентам <br></br>✅ Настраивать правила под свой вкус (быстрая игра?
        турнир? хаос?) <br></br>✅ Вести статистику побед и делиться
        достижениями в соцсетях <br></br>✅ Общаться в реальном времени через
        встроенный чат с эмодзи и стикерами <br></br>
        <br></br>
        <b>Зачем это нужно?</b>
        <br></br>
        Мы верим, что даже в эпоху TikTok и нейросетей люди должны уметь
        радоваться простым вещам: азарту торговли, смеху друзей и щелчку кубика
        в предвкушении хода. Это не просто игра — это повод собраться вместе,
        даже если между вами тысячи километров!
        <br></br>
        <b>Готовы начать?</b> <br></br>
        👉 Бросьте цифровой кубик — ваша империя начинается здесь! <br></br>
        Создано с любовью и 15 литрами кофе.
      </p>
    </div>
  );
}
