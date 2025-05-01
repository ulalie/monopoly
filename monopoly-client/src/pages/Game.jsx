import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "../components/game/board/GameBoard";
import PlayerInfo from "../components/game/player/PlayerInfo";
import GameActions from "../components/game/actions/GameActions";
import TradeModal from "../components/game/trades/TradeModal";
import TradeOffers from "../components/game/trades/TradeOffer";
import PropertyManagementModal from "../components/game/modals/PropertyManagementModal";

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diceRoll, setDiceRoll] = useState(null);
  const [notification, setNotification] = useState("");
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [updateIntervalId, setUpdateIntervalId] = useState(null);

  const handleApiError = (error, message) => {
    console.error(message, error);
    setError(message);
    setNotification(`Ошибка: ${message}`);
    setTimeout(() => setNotification(""), 5000);
  };

  useEffect(() => {
    fetchGameData();
    // Сохраняем ID интервала, чтобы потом можно было его очистить
    const intervalId = setInterval(fetchGameData, 5000);
    setUpdateIntervalId(intervalId);
    
    return () => {
      clearInterval(intervalId);
      if (window.updateTimeoutId) clearTimeout(window.updateTimeoutId);
    };
  }, [id]);

  const canStartGame = () => {
    if (!game || !currentPlayer) return false;
    
    const isCreator = String(game.creator) === String(currentPlayer.user._id);
    console.log("Проверка создателя:", {
      создатель: game.creator,
      текущийИгрок: currentPlayer.user._id,
      совпадает: isCreator
    });
    
    const totalPlayers = game.players.length;
    const hasEnoughPlayers = totalPlayers >= 2;
    
    console.log("Проверка игроков:", {
      всего: totalPlayers,
      достаточно: hasEnoughPlayers
    });
    
    return isCreator && 
           game.status === "waiting" && 
           hasEnoughPlayers;
  };

  const fetchGameData = async () => {
    try {
      // Проверяем состояние всех модальных окон
      if (isTradeModalOpen || isPropertyModalOpen) {
        console.log(`Пропуск обновления данных, т.к. открыто модальное окно (trade: ${isTradeModalOpen}, property: ${isPropertyModalOpen})`);
        return;
      }
      
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await fetch(`http://localhost:8080/game/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Не удалось получить данные игры");
      }

      const gameData = await response.json();
      
      setGame(gameData);

      const tokenParts = token.split(".");
      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.id;

      const player = gameData.players.find(p => 
        p.user && String(p.user._id) === String(userId)
      );
      setCurrentPlayer(player);

      const isCurrentPlayerTurn = 
        gameData.status === "active" &&
        !gameData.players[gameData.currentPlayerIndex].isBot &&
        gameData.players[gameData.currentPlayerIndex].user &&
        String(gameData.players[gameData.currentPlayerIndex].user._id) === String(userId);
    
      setIsPlayerTurn(isCurrentPlayerTurn);
      
      console.log("Состояние кубиков на сервере:", {
        lastDiceRoll: gameData.lastDiceRoll,
        diceRollNull: gameData.lastDiceRoll === null,
        currentPlayerIndex: gameData.currentPlayerIndex,
        playerName: gameData.players[gameData.currentPlayerIndex].user?.username || 'Бот'
      });

      setDiceRoll(gameData.lastDiceRoll ? gameData.lastDiceRoll.dice : null);

      setLoading(false);
    } catch (err) {
      handleApiError(err, "Ошибка загрузки данных игры");
      setLoading(false);
    }
  };

  const rollDice = async () => {
    try {
      console.log("=== НАЧАЛО БРОСКА КУБИКОВ ===");
      console.log("Текущее состояние:", {
        isPlayerTurn,
        gameLastDiceRoll: game?.lastDiceRoll,
        localDiceRoll: diceRoll
      });
      
      if (game?.lastDiceRoll !== null || diceRoll !== null) {
        console.log("Блокировка: кубики уже брошены");
        setNotification("Кубики уже брошены в этот ход");
        setTimeout(() => setNotification(""), 3000);
        return;
      }

      console.log("Установка временного значения для блокировки кнопки");
      setDiceRoll([0, 0]);
      setNotification("Бросаем кубики...");
      
      const token = localStorage.getItem("token");
      console.log("Отправка запроса к серверу");
      
      const response = await fetch(
        `http://localhost:8080/game/${id}/roll-dice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.log("Запрос не прошел, статус:", response.status);
        setDiceRoll(null);
        
        const errorData = await response.json();
        console.error("Ошибка броска кубиков:", errorData);
        setNotification(`Ошибка: ${errorData.message || "Не удалось бросить кубики"}`);
        setTimeout(() => setNotification(""), 5000);
        return;
      }

      const data = await response.json();
      console.log("Успешный ответ сервера:", {
        dice: data.dice,
        gameLastDiceRoll: data.game?.lastDiceRoll
      });
      
      // ВАЖНО: сохраняем локальную копию значения кубиков в переменной компонента
      // НЕ зависящей от автоматической синхронизации
      const diceValues = [...data.dice]; 
      
      setDiceRoll(diceValues);
      setGame(data.game);
      setNotification(`Выпало ${diceValues[0]} и ${diceValues[1]}!`);
      setTimeout(() => setNotification(""), 3000);
      
      // Принудительно блокируем обновление diceRoll
      // таймаут для предотвращения слишком быстрого обновления
      setTimeout(() => {
        console.log("Проверка перед повторной установкой diceRoll:", {
          currentDiceRoll: diceRoll,
          savedDiceValues: diceValues
        });
   
        if (!diceRoll || diceRoll[0] === 0) {
          console.log("Перезаписываем значение кубиков:", diceValues);
          setDiceRoll(diceValues);
        }
      }, 1500);
 
      console.log("=== ЗАВЕРШЕНИЕ БРОСКА КУБИКОВ ===");
    } catch (err) {
      console.error("Критическая ошибка:", err);
      setDiceRoll(null); 
      handleApiError(err, "Ошибка броска кубиков");
    }
  };

  // Остальной код функций оставляем без изменений...
  const buyProperty = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/buy-property`,
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
      setGame(data);
    } catch (err) {
      handleApiError(err, "Ошибка покупки собственности");
    }
  };

  const endTurn = async () => {
    try {
      console.log("=== НАЧАЛО ЗАВЕРШЕНИЯ ХОДА ===");
      console.log("Текущее состояние:", {
        isPlayerTurn,
        gameLastDiceRoll: game?.lastDiceRoll,
        localDiceRoll: diceRoll
      });
      
      setNotification("Завершаем ход...");
      
      const token = localStorage.getItem("token");
      console.log("Отправка запроса к серверу");
      
      const response = await fetch(
        `http://localhost:8080/game/${id}/end-turn`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.log("Запрос не прошел, статус:", response.status);
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось завершить ход");
      }

      console.log("Сброс локальных состояний");
      // ВАЖНО: сначала сбрасываем локальные состояния, потом обновляем с сервера
      setDiceRoll(null);
      setIsPlayerTurn(false);
      
      const data = await response.json();
      console.log("Успешный ответ сервера, обновляем игру");
      setGame(data);

      setTimeout(() => {
        console.log("Принудительное обновление через 500мс");
        fetchGameData();
        setNotification("Ход успешно завершен");
        setTimeout(() => setNotification(""), 2000);
      }, 500);
      
      console.log("=== ЗАВЕРШЕНИЕ ХОДА ВЫПОЛНЕНО ===");
    } catch (err) {
      console.error("Ошибка:", err);
      handleApiError(err, err.message || "Ошибка завершения хода");
    }
  };

  const startGame = async () => {
    try {
      if (!canStartGame()) {
        setNotification("Невозможно начать игру. Нужно минимум 2 участника (игроки + боты)");
        setTimeout(() => setNotification(""), 3000);
        return;
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось начать игру");
      }

      const data = await response.json();
      setGame(data);
      setNotification("Игра успешно начата!");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, "Ошибка запуска игры");
    }
  };

  const joinGame = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/join`,
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

      await fetchGameData();
      setNotification("Вы успешно присоединились к игре!");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, "Ошибка присоединения к игре");
    }
  };

  const leaveGame = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Не удалось покинуть игру");
      }
      
      setNotification("Вы успешно покинули игру");
      navigate("/lobby");
    } catch (err) {
      handleApiError(err, "Ошибка при выходе из игры");
    }
  };

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setIsPropertyModalOpen(true);
    
    // Останавливаем автоматическое обновление на время открытия модального окна
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
    }
  };

  const closePropertyModal = () => {
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
    
    // Восстанавливаем автоматическое обновление
    if (!updateIntervalId) {
      const newIntervalId = setInterval(fetchGameData, 5000);
      setUpdateIntervalId(newIntervalId);
    }
    
    // Запускаем обновление сразу после закрытия модального окна
    setTimeout(fetchGameData, 100);
  };

  const buildHouse = async (propertyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/build`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ propertyId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось построить дом");
      }

      const data = await response.json();
      setGame(data);
      setNotification("Дом успешно построен");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, err.message || "Ошибка при строительстве дома");
    }
  };

  const mortgageProperty = async (propertyId) => {
    try {
      const token = localStorage.getItem("token");
      console.log(`Отправка запроса на залог собственности: ${propertyId}, gameId: ${id}`);
      
      const response = await fetch(
        `http://localhost:8080/game/${id}/mortgage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ propertyId })
        }
      );

      console.log(`Ответ получен, статус: ${response.status}`);
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Не удалось заложить собственность");
        } else {
          // Если не JSON, используем статус и текст статуса
          throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText || "Не удалось заложить собственность"}`);
        }
      }

      const data = await response.json();
      setGame(data);
      setNotification("Собственность успешно заложена");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      console.error("Ошибка в mortgageProperty:", err);
      handleApiError(err, err.message || "Ошибка при залоге собственности");
    }
  };

  const unmortgageProperty = async (propertyId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/unmortgage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ propertyId })
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Не удалось выкупить собственность");
        } else {
          throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText || "Не удалось выкупить собственность"}`);
        }
      }

      const data = await response.json();
      setGame(data);
      setNotification("Собственность успешно выкуплена");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, err.message || "Ошибка при выкупе собственности");
    }
  };

  const openTradeModal = () => {
    console.log("Открываем модальное окно обмена");
    setIsTradeModalOpen(true);
    
    // Останавливаем автоматическое обновление на время открытия модального окна
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
    }
    
    // Устанавливаем таймер автоматического закрытия через 3 минуты
    window.updateTimeoutId = setTimeout(() => {
      console.log("Автоматическое закрытие модального окна через 3 минуты");
      setIsTradeModalOpen(false);
      
      // Восстанавливаем автоматическое обновление
      if (!updateIntervalId) {
        const newIntervalId = setInterval(fetchGameData, 5000);
        setUpdateIntervalId(newIntervalId);
      }
      
      fetchGameData();
    }, 180000); // 3 минуты
  };

  const closeTradeModal = () => {
    console.log("Закрываем модальное окно обмена");
    setIsTradeModalOpen(false);
    
    // Отменяем таймер автоматического закрытия
    if (window.updateTimeoutId) {
      clearTimeout(window.updateTimeoutId);
    }
    
    // Восстанавливаем автоматическое обновление
    if (!updateIntervalId) {
      const newIntervalId = setInterval(fetchGameData, 5000);
      setUpdateIntervalId(newIntervalId);
    }
    
    // Запускаем обновление сразу после закрытия модального окна
    setTimeout(fetchGameData, 100);
  };

  const proposeTrade = async (tradeData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/trade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tradeData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось предложить обмен");
      }

      const data = await response.json();
      setGame(data.game);
      closeTradeModal();
      
      if (data.botRejected) {
        setNotification(`Бот отклонил предложение: ${data.rejectionReason || "Предложение невыгодно"}`);
      } else if (data.trade && data.trade.status === "accepted") {
        setNotification("Бот принял предложение обмена");
      } else {
        setNotification("Предложение обмена отправлено");
      }
      
      setTimeout(() => setNotification(""), 5000);
    } catch (err) {
      handleApiError(err, err.message || "Ошибка отправки предложения обмена");
    }
  };

  const acceptTrade = async (tradeId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/trade/${tradeId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось принять обмен");
      }

      const data = await response.json();
      setGame(data);
      setNotification("Предложение обмена принято");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, err.message || "Ошибка принятия предложения обмена");
    }
  };

  const rejectTrade = async (tradeId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${id}/trade/${tradeId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось отклонить обмен");
      }

      const data = await response.json();
      setGame(data);
      setNotification("Предложение обмена отклонено");
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      handleApiError(err, err.message || "Ошибка отклонения предложения обмена");
    }
  };

  const getActionState = () => {
    console.log("Проверка состояния действий:", {
      isPlayerTurn,
      lastDiceRoll: game?.lastDiceRoll, 
      diceRoll
    });
    
    const canRollDice = isPlayerTurn && !game?.lastDiceRoll && !diceRoll;
    
    const canBuyProperty = isPlayerTurn && 
                         (diceRoll || (game?.lastDiceRoll?.dice)) && 
                         canBuyCurrentProperty();
    
    const canEndTurn = isPlayerTurn && 
                      (diceRoll || (game?.lastDiceRoll?.dice));
    
    return { canRollDice, canBuyProperty, canEndTurn };
  };

  const { canRollDice, canBuyProperty, canEndTurn } = getActionState();

  if (loading) return <div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
    <p className="text-xl">Загрузка игры...</p>
  </div>
</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!game) return <div className="error">Игра не найдена</div>;

  const isCreator = currentPlayer && String(game.creator) === String(currentPlayer.user._id);
  const isPlayer = !!currentPlayer;
  const totalParticipants = game.players.length + (game.botCount || 0);
  const isFull = totalParticipants >= game.maxPlayers;
  const canTradeInActiveGame = game.status === "active" && isPlayer;

  function canBuyCurrentProperty() {
    if (!currentPlayer || !diceRoll) return false;
    
    const property = game.properties.find(p => p.id === currentPlayer.position);
    
    return property && 
           property.type === "property" && 
           !property.owner && 
           currentPlayer.money >= (property.price || 0);
  }

  return (
    <div className="game-container" style={{
      height: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: '5px',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px'
      }}>
        <h2 style={{ margin: '0', fontSize: '16px' }}>{game.name}</h2>
        {notification && (
          <div className="notification" style={{
            padding: '2px 8px',
            backgroundColor: '#e6f7ff',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {notification}
          </div>
        )}
      </div>
      
      {/* Компактная верхняя панель с информацией о игроках

      <div className="game-players-info" style={{
        backgroundColor: '#fafafa',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '4px',
        marginBottom: '4px',
        maxHeight: '85px',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2px',
          fontSize: '11px'
        }}>
          <div>
            <strong>Статус:</strong> {game.status === "waiting" ? "⏳ Ожидание" : "▶️ Активна"}
          </div>
          <div>
            <strong>Игроков:</strong> {game.players.length}/{game.maxPlayers} 
            {game.botCount > 0 && ` (🤖 ${game.botCount})`}
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          justifyContent: 'center'
        }}>
          {game.players.map((player, index) => (
            <div key={player.user?._id || player.botId} style={{
              backgroundColor: game.currentPlayerIndex === index ? '#eef6ff' : '#fff',
              border: '1px solid #ccc',
              borderRadius: '3px',
              padding: '3px 5px',
              width: '120px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: player.color,
                  border: '1px solid #aaa'
                }}></div>
                <strong style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65px'}}>
                  {player.isBot ? `${player.botName}` : `${player.user.username}`}
                </strong>
                {game.currentPlayerIndex === index && (
                  <span style={{
                    marginLeft: 'auto',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '0px 3px',
                    borderRadius: '8px',
                    fontSize: '8px',
                  }}>
                    Ходит
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px' }}>
                <span>💰 {player.money}</span>
                <span>🏠 {player.properties?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>

      </div> */}


      {/* Компактный блок для режима ожидания */}
      {game.status === "waiting" && (
        <div className="waiting-room" style={{
          padding: '4px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '4px',
          textAlign: 'center'
        }}>
          {!isPlayer && !isFull ? (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Вы еще не присоединились к этой игре.</p>
              <button 
                onClick={joinGame}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Присоединиться к игре
              </button>
            </div>
          ) : isFull && !isPlayer ? (
            <p style={{ margin: '0', fontSize: '12px' }}>Игра заполнена. Вы не можете присоединиться.</p>
          ) : null}
          
          {isCreator ? (
            <div>
              <button 
                onClick={startGame}
                disabled={!canStartGame()}
                style={{
                  padding: '5px 10px',
                  backgroundColor: canStartGame() ? '#4CAF50' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: canStartGame() ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                НАЧАТЬ ИГРУ
              </button>
              {!canStartGame() && (
                <p className="hint" style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#666' }}>
                  Нужно минимум 2 участника для начала игры
                </p>
              )}
            </div>
          ) : isPlayer ? (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Ожидание начала игры...</p>
              <button 
                onClick={leaveGame} 
                className="leave-button"
                style={{
                  padding: '3px 8px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Покинуть игру
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Более компактное отображение предложений обмена */}
      {isPlayer && (
        <div style={{ maxHeight: '70px', overflowY: 'auto', marginBottom: '4px' }}>
          <TradeOffers 
            game={game}
            currentPlayer={currentPlayer}
            onAcceptTrade={acceptTrade}
            onRejectTrade={rejectTrade}
          />
        </div>
      )}

      {/* Основной контейнер с игровой доской и информацией */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden',
        minHeight: 0 // Важно для корректной работы flex в Firefox
      }}>
        {/* Уменьшенная боковая панель с информацией о игроках */}
        <div style={{ 
          width: '160px',
          overflowY: 'auto',
          padding: '3px',
          marginRight: '4px',
          backgroundColor: '#f8f8f8',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {game.players.map((player, index) => (
            <PlayerInfo
              key={player.user?._id || player.botId || `bot-${index}`}
              player={player}
              isCurrentPlayer={player.user?._id === currentPlayer?.user._id}
              isActivePlayer={
                game.status === "active" &&
                game.currentPlayerIndex === game.players.indexOf(player)
              }
              isBot={player.isBot}
            />
          ))}
        </div>

        {/* Уменьшенная основная часть с игровой доской */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0 // Важно для корректной работы flex в Firefox
        }}>
          <div style={{ 
            flex: 1,
            overflow: 'auto',
            marginBottom: '4px',
            minHeight: 0 // Важно для корректной работы flex в Firefox
          }}>
            <GameBoard
              game={game}
              currentPlayer={currentPlayer}
              diceRoll={diceRoll}
              onPropertyClick={handlePropertyClick}
              gameId={id}
            />
          </div>

          {game.status === "active" && (
            <div style={{ padding: '2px 0' }}>
              <GameActions
                canRollDice={canRollDice}
                canBuyProperty={canBuyProperty}
                canEndTurn={canEndTurn}
                onRollDice={rollDice}
                onBuyProperty={buyProperty}
                onEndTurn={endTurn}
                canTrade={canTradeInActiveGame}
                onOpenTradeModal={openTradeModal}
              />
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна - они не влияют на прокрутку */}
      {isPlayer && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={closeTradeModal}
          game={game}
          currentPlayer={currentPlayer}
          onProposeTrade={proposeTrade}
        />
      )}

      <PropertyManagementModal
        isOpen={isPropertyModalOpen}
        onClose={closePropertyModal}
        property={selectedProperty}
        game={game}
        currentPlayer={currentPlayer}
        onBuildHouse={buildHouse}
        onMortgageProperty={mortgageProperty}
        onUnmortgageProperty={unmortgageProperty}
      />
    </div>
  );
}