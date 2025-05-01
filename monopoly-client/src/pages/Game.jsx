import React, { useState, useEffect, useRef } from "react";
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
  
  // Хранение позиции прокрутки
  const scrollPositionRef = useRef(0);
  const isUpdatingRef = useRef(false);
  const gameContainerRef = useRef(null);

  const handleApiError = (error, message) => {
    console.error(message, error);
    setError(message);
    setNotification(`Ошибка: ${message}`);
    setTimeout(() => setNotification(""), 5000);
  };

  // Для сохранения позиции скролла перед обновлением данных
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  // Для восстановления позиции скролла после обновления данных
  const restoreScrollPosition = () => {
    // Устанавливаем небольшую задержку, чтобы DOM успел обновиться
    setTimeout(() => {
      window.scrollTo(0, scrollPositionRef.current);
      isUpdatingRef.current = false;
    }, 50);
  };

  // Добавляем обработчик прокрутки, чтобы обнаружить ручную прокрутку пользователем
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      // Если это не программная прокрутка во время обновления,
      // запоминаем новую позицию как пользовательскую
      if (!isUpdatingRef.current) {
        scrollPositionRef.current = window.scrollY;
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // После завершения прокрутки, позволим обновлению данных
      }, 200);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

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
      // Если мы находимся в процессе обновления, пропускаем этот цикл
      if (isUpdatingRef.current) {
        console.log("Пропуск обновления, предыдущее обновление еще не завершено");
        return;
      }
      
      // Проверяем состояние всех модальных окон
      if (isTradeModalOpen || isPropertyModalOpen) {
        console.log(`Пропуск обновления данных, т.к. открыто модальное окно (trade: ${isTradeModalOpen}, property: ${isPropertyModalOpen})`);
        return;
      }
      
      // Сохраняем текущую позицию прокрутки
      saveScrollPosition();
      isUpdatingRef.current = true;
      
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
      
      // Обновляем состояния в правильном порядке
      setGame(prevGame => {
        // Если игра существенно не изменилась, не обновляем состояние
        if (prevGame && 
            JSON.stringify(prevGame.players.map(p => p.position)) === 
            JSON.stringify(gameData.players.map(p => p.position)) &&
            prevGame.currentPlayerIndex === gameData.currentPlayerIndex &&
            prevGame.lastDiceRoll === gameData.lastDiceRoll) {
          console.log("Пропуск обновления - игра не изменилась существенно");
          isUpdatingRef.current = false;
          return prevGame;
        }
        return gameData;
      });

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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, "Ошибка загрузки данных игры");
      setLoading(false);
      isUpdatingRef.current = false;
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
      
      // Сохраняем текущую позицию прокрутки
      saveScrollPosition();
      
      // ВАЖНО: сохраняем локальную копию значения кубиков в переменной компонента
      // НЕ зависящей от автоматической синхронизации
      const diceValues = [...data.dice]; 
      
      setDiceRoll(diceValues);
      setGame(data.game);
      setNotification(`Выпало ${diceValues[0]} и ${diceValues[1]}!`);
      setTimeout(() => setNotification(""), 3000);
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
      
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
          // Повторно восстанавливаем прокрутку
          window.scrollTo(0, scrollPositionRef.current);
        }
      }, 1500);
 
      console.log("=== ЗАВЕРШЕНИЕ БРОСКА КУБИКОВ ===");
    } catch (err) {
      console.error("Критическая ошибка:", err);
      setDiceRoll(null); 
      handleApiError(err, "Ошибка броска кубиков");
      isUpdatingRef.current = false;
    }
  };

  const buyProperty = async () => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, "Ошибка покупки собственности");
      isUpdatingRef.current = false;
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
      
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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

      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();

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
      isUpdatingRef.current = false;
    }
  };

  const startGame = async () => {
    try {
      if (!canStartGame()) {
        setNotification("Невозможно начать игру. Нужно минимум 2 участника (игроки + боты)");
        setTimeout(() => setNotification(""), 3000);
        return;
      }
      
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, "Ошибка запуска игры");
      isUpdatingRef.current = false;
    }
  };

  const joinGame = async () => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, "Ошибка присоединения к игре");
      isUpdatingRef.current = false;
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
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, err.message || "Ошибка при строительстве дома");
      isUpdatingRef.current = false;
    }
  };

  const mortgageProperty = async (propertyId) => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      console.error("Ошибка в mortgageProperty:", err);
      handleApiError(err, err.message || "Ошибка при залоге собственности");
      isUpdatingRef.current = false;
    }
  };

  const unmortgageProperty = async (propertyId) => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, err.message || "Ошибка при выкупе собственности");
      isUpdatingRef.current = false;
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
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, err.message || "Ошибка отправки предложения обмена");
      isUpdatingRef.current = false;
    }
  };

  const acceptTrade = async (tradeId) => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, err.message || "Ошибка принятия предложения обмена");
      isUpdatingRef.current = false;
    }
  };

  const rejectTrade = async (tradeId) => {
    try {
      // Сохраняем позицию прокрутки
      saveScrollPosition();
      
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
      
      // Восстанавливаем позицию прокрутки
      restoreScrollPosition();
    } catch (err) {
      handleApiError(err, err.message || "Ошибка отклонения предложения обмена");
      isUpdatingRef.current = false;
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

  if (loading) return <div className="loading">Загрузка игры...</div>;
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
    <div className="game-container" ref={gameContainerRef}>
      <h2>{game.name}</h2>
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
      
      <div className="game-players-info" style={{
        backgroundColor: '#fafafa',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          fontSize: '14px'
        }}>
          <div>
            <strong>Статус:</strong> {game.status === "waiting" ? "⏳ Ожидание игроков" : "▶️ Игра активна"}
          </div>
          <div>
            <strong>Игроков:</strong> {game.players.length}/{game.maxPlayers} 
            {game.botCount > 0 && ` (🤖 ${game.botCount})`}
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center'
        }}>
          {game.players.map((player, index) => (
            <div key={player.user?._id || player.botId} style={{
              backgroundColor: game.currentPlayerIndex === index ? '#eef6ff' : '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px 10px',
              width: '180px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: player.color,
                  border: '1px solid #aaa'
                }}></div>
                <strong>{player.isBot ? `🤖 ${player.botName}` : `👤 ${player.user.username}`}</strong>
              </div>
              
              <div>💰 {player.money} $</div>
              <div>🏠 {player.properties?.length || 0} собственности</div>

              {game.currentPlayerIndex === index && (
                <div style={{
                  marginTop: '4px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  alignSelf: 'center'
                }}>
                  Сейчас ходит
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {game.status === "waiting" && (
        <div className="waiting-room">
          {!isPlayer && !isFull ? (
            <div>
              <p>Вы еще не присоединились к этой игре.</p>
              <button onClick={joinGame}>
                Присоединиться к игре
              </button>
            </div>
          ) : isFull && !isPlayer ? (
            <p>Игра заполнена. Вы не можете присоединиться.</p>
          ) : null}
          
          {isCreator ? (
            <div>
              <button 
                onClick={startGame}
                disabled={!canStartGame()}
              >
                НАЧАТЬ ИГРУ
              </button>
              {!canStartGame() && (
                <p className="hint">Нужно минимум 2 участника (игроки + боты) для начала игры</p>
              )}
            </div>
          ) : isPlayer ? (
            <div>
              <p>Ожидание, пока создатель игры начнет игру...</p>
              <button onClick={leaveGame} className="leave-button">
                Покинуть игру
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Отображение предложений обмена, если они есть */}
      {isPlayer && (
        <TradeOffers 
          game={game}
          currentPlayer={currentPlayer}
          onAcceptTrade={acceptTrade}
          onRejectTrade={rejectTrade}
        />
      )}

      <div className="game-layout">
        <div className="player-info-sidebar">
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

        <div className="main-board">
          <GameBoard
            game={game}
            currentPlayer={currentPlayer}
            diceRoll={diceRoll}
            onPropertyClick={handlePropertyClick}
            gameId={id}
          />

          {game.status === "active" && (
            <div>
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

      {/* Модальное окно для предложения обмена */}
      {isPlayer && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={closeTradeModal}
          game={game}
          currentPlayer={currentPlayer}
          onProposeTrade={proposeTrade}
        />
      )}

      {/* Модальное окно управления собственностью */}
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