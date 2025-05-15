import React, { useEffect, useState } from "react";
import Footer from "../components/utils/Footer";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:8080/auth/users", {
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
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center m-2">
          <img src="../../public/logo.png" className="w-8 h-8" alt="Логотип" />
          <h1 className="m-2 text-2xl font-bold">Админ-панель</h1>
        </div>
      </header>

      <section className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Список пользователей</h2>
        
        {users.length === 0 ? (
          <p className="text-center text-gray-500">Пользователи не найдены</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <div 
                key={user._id}
                className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{user.username}</h3>
                    <p className="text-sm text-gray-500">ID: {user._id}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full">
                    Пользователь
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer/>
    </div>
  );
}