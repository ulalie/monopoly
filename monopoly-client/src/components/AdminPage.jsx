import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/auth/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Ошибка при загрузке пользователей");
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Список пользователей</h1>
      <ul>
        {users.map((user) => (
          <li key={user._id}>{user.username}</li>
        ))}
      </ul>
    </div>
  );
}
/*import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/auth/login" />;
  }

  try {
    const user = JSON.parse(atob(token.split(".")[1])); // Расшифровываем токен
    if (!user.roles.includes("ADMIN")) {
      return <Navigate to="/" />; // Перенаправляем, если пользователь не администратор
    }
  } catch (error) {
    console.error("Ошибка валидации токена:", error);
    return <Navigate to="/auth/login" />;
  }

  return children;
}*/
