import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SingUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); // Очистка предыдущих ошибок
    
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

      window.location.href = "/auth/login";
    } catch (error) {
      // Использование состояния вместо alert
      setError(error.message);
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
          
          {/* Отображение сообщения об ошибке */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg> {error}
              </p>
            </div>
          )}
          
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