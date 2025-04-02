import React, { useState } from "react";

export default function SingUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/auth/registration", {
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
    <div>
      <h1>Регистрация</h1>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Зарегистрироваться</button>
      </form>
    </div>
  );
}

// {
//   "username": "admin",
//   "password": "admin123",
//   "roles": ["ADMIN"]
// }
//user useruser
