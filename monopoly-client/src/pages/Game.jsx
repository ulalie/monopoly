import React, { useState, useEffect, useCallback } from "react";
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

  // Используем useCallback для мемоизации функции fetchGameData
  const fetchGameData = useCallback(async () => {
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
  }, [id, navigate, isTradeModalOpen, isPropertyModalOpen]); // Зависимости для useCallback

  useEffect(() => {
    fetchGameData();
    // Сохраняем ID интервала, чтобы потом можно было его очистить
    const intervalId = setInterval(fetchGameData, 5000);
    setUpdateIntervalId(intervalId);
    
    return () => {
      clearInterval(intervalId);
      if (window.updateTimeoutId) clearTimeout(window.updateTimeoutId);
    };
  }, [fetchGameData]); // Теперь fetchGameData - зависимость

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-t-2 border-b-2 border-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl text-neutral-700 dark:text-neutral-300">Загрузка игры...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-l-4 border-red-500 max-w-md">
        <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Ошибка</h2>
        <p className="text-neutral-700 dark:text-neutral-300">{error}</p>
      </div>
    </div>
  );

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border-l-4 border-yellow-500 max-w-md">
        <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Игра не найдена</h2>
        <p className="text-neutral-700 dark:text-neutral-300">Возможно, игра была удалена или у вас нет доступа.</p>
      </div>
    </div>
  );

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
    <div className="h-screen w-full flex flex-col overflow-hidden bg-neutral-50 dark:bg-gray-900 text-neutral-800 dark:text-white">
      {/* Верхняя панель с названием игры и уведомлениями */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mr-4">
            {game.name}
          </h2>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            game.status === 'waiting' 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          }`}>
            {game.status === 'waiting' ? 'Ожидание' : 'Активна'}
          </span>
        </div>
        
        {notification && (
          <div className="animate-pulse bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-1.5 rounded-lg shadow-sm">
            {notification}
          </div>
        )}
      </div>

      {/* Модуль ожидания начала игры */}
      {game.status === "waiting" && (
        <div className="bg-white dark:bg-gray-800 border-b border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
          <div className="max-w-2xl mx-auto text-center">
            {!isPlayer && !isFull ? (
              <div className="space-y-3">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Вы еще не присоединились к этой игре.
                </p>
                <button 
                  onClick={joinGame}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Присоединиться к игре
                </button>
              </div>
            ) : isFull && !isPlayer ? (
              <p className="text-neutral-600 dark:text-neutral-300 p-3 bg-neutral-100 dark:bg-neutral-700/70 rounded-lg inline-block">
                Игра заполнена. Вы не можете присоединиться.
              </p>
            ) : null}
            
            {isCreator ? (
              <div className="space-y-3">
                <button 
                  onClick={startGame}
                  disabled={!canStartGame()}
                  className={`px-6 py-3 font-medium text-lg rounded-lg transition-all shadow-sm ${
                    canStartGame() 
                      ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white hover:shadow' 
                      : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  НАЧАТЬ ИГРУ
                </button>
                {!canStartGame() && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    Нужно минимум 2 участника для начала игры
                  </p>
                )}
              </div>
            ) : isPlayer ? (
              <div className="space-y-3">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Ожидание начала игры...
                </p>
                <button 
                  onClick={leaveGame} 
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                >
                  Покинуть игру
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Основной контейнер игры */}
      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель с информацией об игроках и действиями */}
        <div className="w-72 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* Секция игроков */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-medium text-emerald-700 dark:text-emerald-400 mb-2">Участники игры</h3>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex justify-between">
              <span>Всего: {game.players.length}/{game.maxPlayers}</span>
              {game.botCount > 0 && <span>🤖 Ботов: {game.botCount}</span>}
            </div>
          </div>
          
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700 overflow-y-auto flex-grow">
            {game.players.map((player, index) => (
              <div 
                key={player.user?._id || player.botId || `bot-${index}`}
                className={`p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                  game.status === "active" && game.currentPlayerIndex === index 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 dark:border-emerald-600' 
                    : ''
                }`}
              >
                <div className="flex items-center mb-2">
                  <div 
                    className="w-4 h-4 rounded-full mr-2 shadow-sm border border-neutral-300 dark:border-neutral-600"
                    style={{ backgroundColor: player.color }}
                  ></div>
                  <span className="font-medium truncate">
                    {player.isBot 
                      ? <span className="flex items-center">
                          {player.botName || "Бот"} 
                          <span className="ml-1 text-xs bg-neutral-200 dark:bg-neutral-700 px-1 rounded">БОТ</span>
                        </span>
                      : player.user.username
                    }
                  </span>
                  {player.user && currentPlayer?.user && String(player.user._id) === String(currentPlayer.user._id) && (
                    <span className="ml-auto text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                      ВЫ
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-neutral-100 dark:bg-neutral-700/50 p-1.5 rounded flex items-center">
                    <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">💰</span>
                    <span>{player.money.toLocaleString()}</span>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700/50 p-1.5 rounded flex items-center">
                    <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">🏠</span>
                    <span>{game.properties.filter(p => 
                      p.owner && String(p.owner) === String(player.user?._id)
                    ).length}</span>
                  </div>
                  
                  {game.status === "active" && game.currentPlayerIndex === index && (
                    <div className="col-span-2 mt-1 text-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 py-1 px-2 rounded-lg animate-pulse">
                      Текущий ход
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Блок для предложений обмена */}
          {isPlayer && game.trades && game.trades.length > 0 && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
              <h3 className="font-medium text-emerald-700 dark:text-emerald-400 mb-3">Предложения обмена</h3>
              <div className="max-h-80 overflow-y-auto pr-1 space-y-3">
                <TradeOffers 
                  game={game}
                  currentPlayer={currentPlayer}
                  onAcceptTrade={acceptTrade}
                  onRejectTrade={rejectTrade}
                />
              </div>
            </div>
          )}
          
          {/* Блок игровых действий - перемещен из нижней панели */}
          {game.status === "active" && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 mt-auto">
              <h3 className="font-medium text-emerald-700 dark:text-emerald-400 mb-3">Игровые действия</h3>
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

        {/* Основной контейнер с игровой доской - теперь без нижней панели действий */}
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          {/* Игровая доска, занимает все пространство */}
          <div className="flex-1 overflow-hidden p-3">
            <div className="h-full overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md">
              <GameBoard
                game={game}
                currentPlayer={currentPlayer}
                diceRoll={diceRoll}
                onPropertyClick={handlePropertyClick}
                gameId={id}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Модальные окна */}
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