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
