import React, { useState } from "react";
import { Link } from "react-router-dom"; // Импортируем Link

export default function Profile() {
  //   const [userData, setUserData] = useState([]);
  //   const [loading, setLoading] = useState(true);
  //   const [error, setError] = useState(null);

  //   useEffect(() => {
  //     const fetchUsers = async () => {
  //       try {
  //         const token = localStorage.getItem("token");
  //         if (!token) {
  //           throw new Error("Пользователь не авторизован");
  //         }

  //         const res = await fetch("http://localhost:5000/user", {
  //           method: "GET",
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //             "Content-Type": "application/json",
  //           },
  //         });
  //         if (!response.ok) {
  //             throw new Error(`HTTP error! status: ${response.status}`);
  //           }

  //           const data = await response.json();
  //           setUserData(data);
  //       } catch (err) {
  //         setError(err.message);
  //       } finally {
  //         setLoading(false);
  //       }
  //     };
  //   });

  const [userData] = useState({
    username: "Игрок123",
    avatar: "https://via.placeholder.com/150",
    stats: {
      gamesPlayed: 15,
      wins: 8,
    },
  });

  return (
    <div>
      <h2>Профиль пользователя</h2>
      <div>
        <Link to="/lobby">Перейти в лобби</Link>
      </div>
      <div>
        <img src={userData.avatar} alt="Аватар пользователя" />{" "}
        {/* Добавил alt для изображения */}
      </div>
      <div>
        <p>Никнейм: {userData.username}</p>
        <p>Сыграно игр: {userData.stats.gamesPlayed}</p>
        <p>Побед: {userData.stats.wins}</p>
      </div>
      <div>
        <Link to="/">На главную</Link>
      </div>
    </div>
  );
}
