import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Lobby() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newGameName, setNewGameName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [includeBot, setIncludeBot] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch("http://localhost:5000/game/list");
      if (!response.ok) {
        throw new Error("Не удалось получить список игр");
      }
      const data = await response.json();
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      // Проверка на наличие имени игры
      if (!newGameName.trim() || maxPlayers <= 0) {
        throw new Error(
          "Пожалуйста, введите корректное название игры и количество игроков."
        );
      }

      const response = await fetch("http://localhost:5000/game/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGameName,
          maxPlayers: parseInt(maxPlayers), // Конвертация в число
          gameType: includeBot ? "with-bots" : "classic",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Попробуйте получить более детальную ошибку
        throw new Error(errorData.message || "Не удалось создать игру");
      }

      const newGame = await response.json();
      setGames((prevGames) => [...prevGames, newGame]); // Использование функции обновления состояния
      setNewGameName("");

      navigate(`/game/${newGame._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinGame = async (gameId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/game/${gameId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось присоединиться к игре");
      }

      // Перенаправление в игру
      navigate(`/game/${gameId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Загрузка игр...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div className="lobby-container">
      <h2>Игровое лобби</h2>

      <div className="create-game-form">
        <h3>Создать новую игру</h3>
        <form onSubmit={createGame}>
          <div className="form-group">
            <label>Название игры:</label>
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Максимум игроков:</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="6">6</option>
            </select>
          </div>

 <label>
    <input
      type="checkbox"
      checked={includeBot}
      onChange={(e) => setIncludeBot(e.target.checked)}
    />
    Добавить бота в игру
  </label>
  
          <button type="submit">Создать игру</button>
        </form>
      </div>

      <div className="games-list">
        <h3>Доступные игры</h3>
        {games.length === 0 ? (
          <p>Нет доступных игр. Создайте игру, чтобы начать!</p>
        ) : (
          games.map((game) => (
            <div key={game._id} className="game-item">
              <h4>{game.name}</h4>
              <p>Создал: {game.creator.username}</p>
              <p>
                Статус: {game.status === "waiting" ? "Ожидание" : "Активна"}
              </p>
              <p>
                Игроки: {game.players.length}/{game.maxPlayers}
              </p>
              <button
                onClick={() => joinGame(game._id)}
                disabled={
                  game.status !== "waiting" ||
                  game.players.length >= game.maxPlayers
                }
              >
                {game.status !== "waiting"
                  ? "Игра в процессе"
                  : game.players.length >= game.maxPlayers
                  ? "Игра заполнена"
                  : "Присоединиться"}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="navigation">
        <Link to="/profile">Назад в профиль</Link>
      </div>
    </div>
  );
}
