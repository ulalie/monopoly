import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Начинаем загрузку профиля");
        const token = localStorage.getItem("token");
        if (!token) {
          console.log("Токен отсутствует, перенаправление на страницу входа");
          navigate("/auth/login");
          return;
        }

        console.log("Отправляем запрос к API /auth/profile");
        try {
          const response = await fetch("http://localhost:8080/auth/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("Статус ответа API:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("Данные профиля получены:", data);
            setUserData(data);
            setLoading(false);
          } else {
            console.log(
              "API вернул ошибку, пробуем использовать данные из токена"
            );

            try {
              const tokenParts = token.split(".");
              if (tokenParts.length !== 3) {
                throw new Error("Некорректный формат токена");
              }

              const payload = JSON.parse(atob(tokenParts[1]));
              console.log("Данные из токена:", payload);

              const username = payload.username || "Пользователь";
              setUserData({
                _id: payload.id,
                username: username,
                avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
                stats: {
                  gamesPlayed: 0,
                  wins: 0,
                },
              });

              setLoading(false);
            } catch (err) {
              console.error("Ошибка декодирования токена:", err);
              setError("Ошибка аутентификации");
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Ошибка запроса к API:", err);
          setError("Ошибка соединения с сервером");
          setLoading(false);
        }
      } catch (err) {
        console.error("Общая ошибка загрузки профиля:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading) return <div>Загрузка профиля...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!userData) return <div>Профиль не найден</div>;

  return (
    <div className="profile-container">
      <h2>Профиль пользователя</h2>

      <div className="profile-header">
        <img
          src={
            userData.avatar
          }
          alt="Аватар пользователя"
          className="profile-avatar"
        />
        <h3>{userData.username}</h3>
      </div>

      <div className="profile-stats">
        <p>Сыграно игр: {userData.stats?.gamesPlayed || 0}</p>
        <p>Побед: {userData.stats?.wins || 0}</p>
      </div>

      <div className="profile-actions">
        <Link to="/lobby" className="button primary">
          Перейти в лобби
        </Link>
        <Link to="/" className="button secondary">
          На главную
        </Link>
      </div>
    </div>
  );
}
