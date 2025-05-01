import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка входа");
      }

      alert("Вы успешно вошли!");
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch (error) {
      alert(error.message);
    }
  };
  /*
   <div className='text-center'>
					<p className='text-gray-700 mb-4'>
						Ещё не зарегестрированы?{' '}
						<Link
							to='/auth/registration'
							className='text-blue-500 hover:text-blue-700 font-semibold'
						>
							Регистрация здесь
						</Link>
					</p>
				</div> */

 return (
    <div className='flex items-center justify-center min-h-screen bg-emerald-50'>
      <div className='max-w-md w-full p-8 bg-white rounded-2xl shadow-2xl space-y-6
                     border border-emerald-100 transition-all hover:shadow-3xl'>
        <div className="text-center space-y-2">
          <h1 className='text-3xl font-bold text-neutral-600'>Вход в аккаунт</h1>
          <p className="text-neutral-500">Продолжить ваше путешествие в мир Монополии</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
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
            Войти
          </button>
        </form>

        <div className="text-center text-neutral-500">
          Ещё не зарегистрированы?{" "}
          <Link 
            to="/auth/registration" 
            className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
          >
            Регистрация здесь
          </Link>
        </div>
      </div>
    </div>
  );
}