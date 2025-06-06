import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/utils/Footer";

export default function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Ошибка проверки авторизации:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center m-2">
          <img src="../../public/logo.png" className="w-8 h-8" alt="logo" />
          <h1 className="m-2 text-2xl font-bold">Monopoly</h1>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center">
            
            
            { userData?.roles?.includes("ADMIN") && (
              <Link
                to="/admin"
                className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-rose-400 transition-colors"
              >
                Список пользователей
              </Link>
            )}

            <Link
              to="/lobby"
              className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
            >
              В лобби
            </Link>

            <Link
              to="/profile"
              className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
            >
              Профиль
            </Link>
            
            <button
              onClick={handleLogout}
              className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="m-2 p-2">
            <Link
              to="/auth/login"
              className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
            >
              Войти
            </Link>
            <Link
              to="/auth/registration"
              className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
            >
              Регистрация
            </Link>
          </div>
        )}
      </header>


      <section className="text-center mb-12">
      <h1 className="text-5xl font-medium mb-4">Добро пожаловать в Монополию!</h1>
      <p className="text-xl mb-6 p-2">
        Это не просто игра — это ваш шанс стать магнатом виртуальной
        недвижимости, не вставая с дивана! 🏙️💸
       </p>
       <p className="text-xl p-2">
        Данное приложение является нашим курсовым проектом, который объединяет
        классическую настольную игру с цифровыми возможностями.
        </p>
      </section>


      <section>
         <h3 className="text-3xl font-bold mb-6 text-center">
          Чем вы можете заняться?
        </h3>
        <ul className="text-xl m-2 p-2 grid grid-cols-1 md:grid-cols-3 gap-4 test-xl list-none text-start">
          <li className="p-6 shadow-lg rounded-lg"><h3>🤖 Сражаться с умными ботами разных уровней сложности — от новичка до финансового гуру</h3></li>
          <li className="p-6 shadow-lg rounded-lg"><h3>🎲 Создавать приватные комнаты или присоединяться к случайным
        оппонентам</h3></li>
          <li className="p-6 shadow-lg rounded-lg"><h3>📊 Осваивать экономические стратегии без спешки и давления живых соперников</h3></li>
          <li className="p-6 shadow-lg rounded-lg"><h3>🏆 Вести статистику побед и делиться
        достижениями в соцсетях</h3></li>
          <li className="p-6 shadow-lg rounded-lg"><h3>💬Общаться в реальном времени через
        встроенный чат с эмодзи и стикерами</h3></li>
        </ul>
        <p className="text-xl  text-center m-2 p-2">
        Мы верим, что даже в эпоху TikTok и нейросетей люди должны уметь
        радоваться простым вещам: азарту торговли, смеху друзей и щелчку кубика
        в предвкушении хода. Это не просто игра — это повод собраться вместе,
        даже если между вами тысячи километров!
        </p>
        <p className="text-xl  text-center m-2 p-2">      
        <b>Готовы начать? Бросьте цифровой кубик — ваша империя начинается здесь! <br></br>
        Создано с любовью и 15 литрами кофе.
      </b></p>
      </section>
      <section className="flex items-center justify-center">
      {isAuthenticated ? (
        <div className=" m-2 p-2">
          <Link to="/lobby" className="rounded-xl bg-emerald-400 m-2 px-5 py-3 text-xl text-amber-50 hover:bg-emerald-300 transition-colors">
             Начать игру
          </Link>
        </div>
      ) : (
        <div className=" m-2 p-2">
          <Link to="/auth/login" className="rounded-xl bg-emerald-400 m-2 px-5 py-3 text-xl text-amber-50 hover:bg-emerald-300 transition-colors">
            Начать игру
          </Link>
        </div>
      )}
      </section>
      <Footer/>
    </div>
  );
}
