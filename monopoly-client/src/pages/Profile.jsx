import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/utils/Footer";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
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
          console.log("Получены данные профиля:", data);
          
          // Если аватар отсутствует, используем плейсхолдер
          setUserData({
            ...data,
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username)}&background=random`
          });
        } else {
          if (response.status === 401) {
            throw new Error("Требуется авторизация");
          }

          // Обработка случая, когда токен есть, но запрос не удался
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
              throw new Error("Неверный формат токена");
            }

            let base64Payload = tokenParts[1]
              .replace(/-/g, '+')
              .replace(/_/g, '/');
            
            const padding = '='.repeat((4 - (base64Payload.length % 4)) % 4);
            base64Payload += padding;

            const payload = JSON.parse(atob(base64Payload));
            const username = payload.username || "Пользователь";
            
            setUserData({
              _id: payload.id,
              username: username,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
              stats: { gamesPlayed: 0, wins: 0 },
            });
          } catch (tokenError) {
            console.error("Ошибка обработки токена:", tokenError);
            localStorage.removeItem("token");
            navigate("/auth/login");
          }
        }
      } catch (err) {
        setError(err.message || "Ошибка соединения с сервером");
        if (err.message === "Требуется авторизация") {
          localStorage.removeItem("token");
          navigate("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth/login");
  };

  const updateServerAvatar = async (newAvatar) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/auth/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatar: newAvatar }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при обновлении аватара");
      }
      
      const data = await response.json();
      console.log("Ответ сервера после обновления аватара:", data);
      
      return data;
    } catch (err) {
      console.error("Ошибка обновления аватара:", err);
      throw err;
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUpdatingAvatar(true);
    
    try {
      // Создаем объект FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // Получаем токен
      const token = localStorage.getItem("token");
      
      // Используем новый объединенный эндпоинт для загрузки и обновления аватара
      const response = await fetch("http://localhost:8080/auth/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка загрузки аватара");
      }
      
      const data = await response.json();
      console.log("Ответ после загрузки аватара:", data);
      
      if (data.success && data.avatar) {
        // Обновляем интерфейс с новым аватаром
        setUserData(prev => ({
          ...prev,
          avatar: data.avatar
        }));
      } else {
        throw new Error("Не удалось получить URL аватара");
      }
    } catch (err) {
      console.error("Ошибка загрузки аватара:", err);
      alert("Ошибка при обновлении аватара: " + err.message);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleChangeAvatar = async () => {
    const choice = window.prompt("Введите URL изображения или оставьте пустым для выбора файла");
    
    if (choice) {
      // Если введен URL
      setIsUpdatingAvatar(true);
      try {
        const result = await updateServerAvatar(choice);
        if (result.success) {
          setUserData(prev => ({
            ...prev,
            avatar: choice
          }));
        }
      } catch (err) {
        alert("Ошибка при обновлении аватара: " + err.message);
      } finally {
        setIsUpdatingAvatar(false);
      }
    } else {
      // Если пустой ввод, открываем выбор файла
      fileInputRef.current.click();
    }
  };

  // Отображение состояния загрузки
  if (loading) return (
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-xl">Загрузка профиля...</p>
      </div>
    </div>
  );

  // Отображение ошибки
  if (error) return (
    <div className="container mx-auto p-8 min-h-screen flex items-center justify-center">
      <p className="text-xl text-red-600">{error}</p>
    </div>
  );

  // Если данные не найдены
  if (!userData) return (
    <div className="container mx-auto p-8 min-h-screen flex items-center justify-center">
      <p className="text-xl">Профиль не найден</p>
    </div>
  );

  return (
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center m-2">
          <img src="../../public/logo.png" className="w-8 h-8" alt="Логотип" />
          <h1 className="m-2 text-2xl font-bold">Monopoly Profile</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
        >
          Выйти
        </button>
      </header>

      <section className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-4">
            {/* Отображение аватара */}
            <img
              src={userData.avatar}
              alt="Аватар пользователя"
              className="w-full h-full rounded-full border-4 border-emerald-400 object-cover"
            />
            {isUpdatingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-400 border-t-transparent"></div>
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold text-center">{userData.username}</h2>
          <button
            onClick={handleChangeAvatar}
            disabled={isUpdatingAvatar}
            className={`mt-4 px-4 py-2 text-sm text-white ${isUpdatingAvatar ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400'} rounded-lg transition-colors`}
          >
            {isUpdatingAvatar ? 'Обновление...' : 'Обновить аватар'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
            disabled={isUpdatingAvatar}
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
      <Footer/>
    </div>
  );
}