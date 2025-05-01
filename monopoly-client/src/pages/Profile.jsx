import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          const tokenParts = token.split(".");
          const payload = JSON.parse(atob(tokenParts[1]));
          const username = payload.username || "Пользователь";
          setUserData({
            _id: payload.id,
            username: username,
            avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
            stats: { gamesPlayed: 0, wins: 0 },
          });
        }
      } catch (err) {
        setError("Ошибка соединения с сервером");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserData((prev) => ({
          ...prev,
          avatar: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeAvatar = () => {
    const choice = window.prompt("Введите URL изображения или нажмите Отмена для загрузки файла:");
    if (choice) {
      setUserData((prev) => ({
        ...prev,
        avatar: choice,
      }));
    } else {
      fileInputRef.current.click(); // откроет диалог выбора файла
    }
  };

  if (loading) return (
<div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-xl">Загрузка профиля...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto p-8 min-h-screen flex items-center justify-center">
      <p className="text-xl text-red-600">{error}</p>
    </div>
  );

  if (!userData) return (
    <div className="container mx-auto p-8 min-h-screen flex items-center justify-center">
      <p className="text-xl">Профиль не найден</p>
    </div>
  );

  return (
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center m-2">
          <img src="../../public/logo.png" className="w-8 h-8" />
          <h1 className="m-2 text-2xl font-bold">Monopoly Profile</h1>
        </div>
      </header>

      <section className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src={userData.avatar}
            alt="Аватар пользователя"
            className="w-32 h-32 rounded-full border-4 border-emerald-400 mb-4 object-cover"
          />
          <h2 className="text-3xl font-bold text-center">{userData.username}</h2>
          <button
            onClick={handleChangeAvatar}
            className="mt-4 px-4 py-2 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors"
          >
            Обновить аватар
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Статистика игр</h3>
            <div className="space-y-2">
              <p>Сыграно: {userData.stats?.gamesPlayed || 0}</p>
              <p>Побед: {userData.stats?.wins || 0}</p>
              {userData.stats?.gamesPlayed > 0 && (
                <p>Процент побед: {Math.round((userData.stats.wins / userData.stats.gamesPlayed) * 100)}%</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Достижения</h3>
            <p className="text-gray-500">Достижения появятся здесь</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/lobby" className="rounded-xl bg-emerald-400 px-6 py-3 text-xl text-center text-white hover:bg-emerald-300 transition-colors">
            Перейти в лобби
          </Link>
          <Link to="/" className="rounded-xl bg-gray-200 px-6 py-3 text-xl text-center hover:bg-gray-300 transition-colors">
            На главную
          </Link>
        </div>
      </section>
    </div>
  );
}
