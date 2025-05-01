import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SingUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/auth/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка регистрации");
      }

      alert("Регистрация прошла успешно!");
      window.location.href = "/auth/login";
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-emerald-50'>
      <div className='max-w-md w-full p-8 bg-white rounded-2xl shadow-2xl space-y-6
                     border border-emerald-100 transition-all hover:shadow-3xl'>
        <div className="text-center space-y-2">
          <h1 className='text-3xl font-bold text-neutral-600'>Регистрация</h1>
          <p className="text-neutral-500">Создайте аккаунт для начала игры</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className='w-full px-4 py-3 border-2 text-neutral-600 border-emerald-200 rounded-xl
                        focus:outline-none focus:border-emerald-400 focus:ring-2
                        focus:ring-emerald-100 transition-all placeholder-emerald-300'
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-3 border-2 text-neutral-600 border-emerald-200 rounded-xl
                        focus:outline-none focus:border-emerald-400 focus:ring-2
                        focus:ring-emerald-100 transition-all placeholder-emerald-300'
            />
          </div>
          
          <button
            type="submit"
            className='w-full py-3 bg-emerald-500 text-white rounded-xl
                      hover:bg-emerald-600 active:bg-emerald-700 
                      transition-colors font-semibold tracking-wide'
          >
            Зарегистрироваться
          </button>
        </form>

        <div className="text-center text-neutral-500">
          Уже есть аккаунт? {" "}
          <Link 
            to="/auth/login" 
            className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}

// {
//   "username": "admin",
//   "password": "admin123",
//   "roles": ["ADMIN"]
// }
//{
//   "username": "user",
//   "password": "useruser",
//   "roles": ["USER"]
// }
