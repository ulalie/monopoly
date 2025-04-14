import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "./GameBoard";
import PlayerInfo from "./PlayerInfo";
import GameActions from "./GameActions";
import GameChat from "./GameChat";

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diceRoll, setDiceRoll] = useState(null);

  useEffect(() => {
    fetchGameData();
    // Настройка опроса для обновления данных игры
    const intervalId = setInterval(fetchGameData, 5000);

    return () => clearInterval(intervalId);
  }, [id]);

  const fetchGameData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await fetch(`http://localhost:5000/game/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Не удалось получить данные игры");
      }

      const gameData = await response.json();
      setGame(gameData);

      // Получить ID пользователя из токена
      const tokenParts = token.split(".");
      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.id;

      // Найти текущего игрока в игре
      const player = gameData.players.find((p) => p.user._id === userId);
      setCurrentPlayer(player);

      // Проверить, ход ли игрока
      setIsPlayerTurn(
        gameData.status === "active" &&
          gameData.players[gameData.currentPlayerIndex].user._id === userId
      );

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const rollDice = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/game/${id}/roll-dice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось бросить кубики");
      }

      const data = await response.json();
      setDiceRoll(data.dice);

      // Обновить данные игры после броска кубиков
      setGame(data.game);
    } catch (err) {
      setError(err.message);
    }
  };

  const buyProperty = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/game/${id}/buy-property`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось купить собственность");
      }

      const data = await response.json();
      setGame(data.game);
    } catch (err) {
      setError(err.message);
    }
  };

  const endTurn = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/game/${id}/end-turn`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось завершить ход");
      }

      const data = await response.json();
      setGame(data.game);
      setIsPlayerTurn(false);
      setDiceRoll(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Загрузка игры...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!game) return <div className="error">Игра не найдена</div>;

  return (
    <div className="game-container">
      <h2>{game.name}</h2>

      <div className="game-layout">
        {/* Левая боковая панель - Информация об игроке */}
        <div className="player-info-sidebar">
          {game.players.map((player) => (
            <PlayerInfo
              key={player.user._id}
              player={player}
              isCurrentPlayer={player.user._id === currentPlayer?.user._id}
              isActivePlayer={
                game.players[game.currentPlayerIndex].user._id ===
                player.user._id
              }
            />
          ))}
        </div>

        {/* Основная игровая доска */}
        <div className="main-board">
          <GameBoard
            game={game}
            currentPlayer={currentPlayer}
            diceRoll={diceRoll}
          />

          {/* Игровые действия */}
          {isPlayerTurn && (
            <GameActions
              canRollDice={!diceRoll}
              canBuyProperty={
                diceRoll &&
                game.properties[currentPlayer.position]?.price > 0 &&
                !game.properties[currentPlayer.position]?.owner
              }
              canEndTurn={diceRoll}
              onRollDice={rollDice}
              onBuyProperty={buyProperty}
              onEndTurn={endTurn}
            />
          )}
        </div>

        {/* Правая боковая панель - Чат */}
        <div className="game-chat-sidebar">
          <GameChat game={game} gameId={id} />
        </div>
      </div>
    </div>
  );
}
