import React, { useState, useEffect, useRef } from "react";

export default function GameBoard({ game, currentPlayer, diceRoll, onPropertyClick, gameId }) {
  const boardSize = 760;
  const cornerSize = 110;
  const propertyWidth = 60;
  const propertyHeight = 110;

  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [userScrolled, setUserScrolled] = useState(false);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Универсальная функция получения ID игрока (бота или обычного)
  const getPlayerId = (player) =>
    player.user && player.user._id ? String(player.user._id) : String(player.user);

  const getPropertyByPosition = (position) => {
    return game.properties.find((p) => p.id === position);
  };

  const getGroupColor = (group) => {
    switch (group) {
      case "brown":
        return "#8B4513";
      case "light-blue":
        return "#87CEEB";
      case "pink":
        return "#FF69B4";
      case "orange":
        return "#FFA500";
      case "red":
        return "#FF0000";
      case "yellow":
        return "#FFFF00";
      case "green":
        return "#008000";
      case "blue":
        return "#0000FF";
      case "railroad":
        return "#000000";
      case "utility":
        return "#C0C0C0";
      default:
        return "#FFFFFF";
    }
  };

  const getPlayerPosition = (player, index) => {
    const position = player.position;
    let x, y;

    if (position <= 10) {
      // Нижний ряд (справа налево)
      x = boardSize - cornerSize - position * propertyWidth;
      y = boardSize - propertyHeight;
    } else if (position <= 20) {
      // Левая колонка (снизу вверх)
      x = 0;
      y = boardSize - cornerSize - (position - 10) * propertyWidth;
    } else if (position <= 30) {
      // Верхний ряд (слева направо)
      x = cornerSize + (position - 21) * propertyWidth;
      y = 0;
    } else {
      // Правая колонка (сверху вниз)
      x = boardSize - propertyHeight;
      y = cornerSize + (position - 31) * propertyWidth;
    }

    // Смещение для нескольких игроков на одной клетке
    const offsetX = (index % 2) * 15;
    const offsetY = Math.floor(index / 2) * 15;

    return {
      x: x + offsetX + 5,
      y: y + offsetY + 5,
    };
  };

  // Группировка игроков по позиции
  const playersByPosition = {};
  game.players.forEach((player) => {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  });

  // Обработчик прокрутки чата
  const handleScroll = () => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      // Если пользователь прокрутил вверх более чем на 100px от нижней границы
      const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
      setUserScrolled(!isNearBottom);
    }
  };

  useEffect(() => {
    if (game.chat) {
      // Сохраняем текущую позицию прокрутки
      const chatContainer = chatContainerRef.current;
      const wasAtBottom = chatContainer && 
        (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 30);
      
      // Приводим все сообщения к единому виду
      const formattedMessages = game.chat.map((msg) => {
        if (msg.user && typeof msg.user === "object" && msg.user.username) {
          return msg;
        }
        if (typeof msg.message === "string" && msg.message.includes(":")) {
          const [username, ...messageParts] = msg.message.split(":");
          return {
            ...msg,
            user: { username: username.trim() },
            message: messageParts.join(":").trim(),
          };
        }
        return msg;
      });
      setChatMessages(formattedMessages);
      
      // Прокручиваем вниз ТОЛЬКО если пользователь был в нижней части чата
      // или если это было первое обновление (chatMessages.length === 0)
      if ((wasAtBottom || chatMessages.length === 0) && !userScrolled) {
        setTimeout(() => scrollToBottom(), 50);
      }
    }
    // eslint-disable-next-line
  }, [game.chat]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Получаем gameId из props или из объекта game (если в props не передан)
    const currentGameId = gameId || (game && game._id);
    
    if (!currentGameId) {
      console.error("Ошибка: ID игры не определен");
      return; // Прерываем выполнение функции, если ID игры отсутствует
    }

    try {
      const token = localStorage.getItem("token");
      
      console.log(`Отправка сообщения для игры с ID: ${currentGameId}`);
      
      const response = await fetch(`http://localhost:8080/game/${currentGameId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Оптимистичное обновление UI с правильным user-объектом
      let username = "";
      let id = "";
      if (currentPlayer.isBot) {
        username = currentPlayer.botName || "Бот";
        id = getPlayerId(currentPlayer);
      } else {
        username = currentPlayer.user?.username || "Игрок";
        id = getPlayerId(currentPlayer);
      }

      const newMessage = {
        user: { _id: id, username },
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, newMessage]);
      setMessage("");
      // Сбрасываем флаг ручной прокрутки при отправке сообщения
      setUserScrolled(false);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
      alert(`Не удалось отправить сообщение: ${err.message}`);
    }
  };

  const renderBuildings = (property, x, y, width, height, position) => {
    if (!property.houses || property.houses === 0 || property.type !== "property") {
      return null;
    }

    const isHorizontal = position <= 10 || (position > 20 && position <= 30);
    const houseSize = 8;
    const hotelSize = 12;
    let houseStyle = {};
    let housesContainerStyle = {};

    if (property.houses === 5) {
      // Отель
      if (isHorizontal) {
        housesContainerStyle = {
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: position <= 10 ? "25%" : "60%",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        };
        houseStyle = {
          width: `${hotelSize}px`,
          height: `${hotelSize}px`,
          backgroundColor: "#C41E3A",
          border: "1px solid #8B0000",
        };
      } else {
        housesContainerStyle = {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: position <= 20 ? "60%" : "25%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        };
        houseStyle = {
          width: `${hotelSize}px`,
          height: `${hotelSize}px`,
          backgroundColor: "#C41E3A",
          border: "1px solid #8B0000",
        };
      }
      return (
        <div style={housesContainerStyle}>
          <div style={houseStyle}></div>
        </div>
      );
    } else {
      // Дома
      if (isHorizontal) {
        housesContainerStyle = {
          position: "absolute",
          left: "0",
          right: "0",
          top: position <= 10 ? "25%" : "60%",
          display: "flex",
          justifyContent: "space-evenly",
        };
      } else {
        housesContainerStyle = {
          position: "absolute",
          top: "0",
          bottom: "0",
          left: position <= 20 ? "60%" : "25%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
        };
      }
      return (
        <div style={housesContainerStyle}>
          {Array(property.houses)
            .fill()
            .map((_, i) => (
              <div
                key={i}
                style={{
                  width: `${houseSize}px`,
                  height: `${houseSize}px`,
                  backgroundColor: "#3CB043",
                  border: "1px solid #2E8B57",
                }}
              ></div>
            ))}
        </div>
      );
    }
  };

  if (!game || !game.properties || game.properties.length === 0) {
    return <div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
      <p className="text-xl">Загрузка игровой доски...</p>
    </div>
  </div>;
  }

  // Убедитесь, что у вас есть идентификатор игры
  const currentGameId = gameId || (game && game._id);
  console.log("ID игры в компоненте:", currentGameId);

  return (
    <div
      className="game-board"
      style={{
        width: `${boardSize}px`,
        height: `${boardSize}px`,
        position: "relative",
        margin: "0 auto",
        backgroundColor: "#e9f5e9",
        border: "2px solid #128c7e",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Центральная часть с чатом */}
      <div
        style={{
          position: "absolute",
          left: `${cornerSize}px`,
          top: `${cornerSize}px`,
          width: `${boardSize - 2 * cornerSize}px`,
          height: `${boardSize - 2 * cornerSize}px`,
          backgroundColor: "#f8f8f8",
          display: "flex",
          flexDirection: "column",
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        {/* Блок чата */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            position: "relative", // Для абсолютного позиционирования кнопки прокрутки
          }}
        >
          <div
            style={{
              padding: "12px",
              fontWeight: "bold",
              fontSize: "16px",
              color: "#333",
              backgroundColor: "transparent",
              textAlign: "center",
            }}
          >
            Игровой чат 
            {/*{currentGameId ? `(ID: ${currentGameId})` : '(ID не определен)'}*/}
          </div>
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#aaa" }}>
                Сообщений пока нет
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: "10px", color: "#333" }}>
                  <strong>{msg.user?.username || "Система"}:</strong>{" "}
                  {msg.message}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Кнопка для прокрутки вниз когда пользователь прокрутил чат вверх */}
          {userScrolled && (
            <button
              onClick={() => {
                scrollToBottom();
                setUserScrolled(false);
              }}
              style={{
                position: "absolute",
                bottom: "70px",
                right: "20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                cursor: "pointer",
                zIndex: 20,
                fontSize: "20px",
              }}
            >
              ↓
            </button>
          )}
          
          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              padding: "12px",
              gap: "8px",
              backgroundColor: "transparent",
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={currentGameId ? "Введите сообщение..." : "ID игры не определен"}
              disabled={!currentGameId}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!currentGameId}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: currentGameId ? "#4CAF50" : "#cccccc",
                color: "white",
                border: "none",
                fontWeight: "bold",
                cursor: currentGameId ? "pointer" : "not-allowed",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => {
                if (currentGameId) e.currentTarget.style.backgroundColor = "#45a049";
              }}
              onMouseOut={(e) => {
                if (currentGameId) e.currentTarget.style.backgroundColor = "#4CAF50";
              }}
            >
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* Отрисовка клеток доски */}
      {Array.from({ length: 40 }).map((_, index) => {
        const property = getPropertyByPosition(index);
        if (!property) return null;

        let x, y, width, height;
        const isCorner = index === 0 || index === 10 || index === 20 || index === 30;

        if (isCorner) {
          width = cornerSize;
          height = cornerSize;
          if (index === 0) {
            x = boardSize - cornerSize;
            y = boardSize - cornerSize;
          } else if (index === 10) {
            x = 0;
            y = boardSize - cornerSize;
          } else if (index === 20) {
            x = 0;
            y = 0;
          } else if (index === 30) {
            x = boardSize - cornerSize;
            y = 0;
          }
        } else {
          if (index <= 10) {
            x = boardSize - cornerSize - index * propertyWidth;
            y = boardSize - propertyHeight;
            width = propertyWidth;
            height = propertyHeight;
          } else if (index <= 20) {
            x = 0;
            y = boardSize - cornerSize - (index - 10) * propertyWidth;
            width = propertyHeight;
            height = propertyWidth;
          } else if (index <= 30) {
            x = cornerSize + (index - 21) * propertyWidth;
            y = 0;
            width = propertyWidth;
            height = propertyHeight;
          } else {
            x = boardSize - propertyHeight;
            y = cornerSize + (index - 31) * propertyWidth;
            width = propertyHeight;
            height = propertyWidth;
          }
        }

        // Цвет клетки по владельцу (с учетом ObjectId)
        let backgroundColor = "#f9f9f9";
        if (property.owner) {
          const ownerPlayer = game.players.find(
            (p) => getPlayerId(p) === String(property.owner)
          );
          if (ownerPlayer) {
            backgroundColor = `${ownerPlayer.color}33`;
          }
        }

        const groupColor = property.group ? getGroupColor(property.group) : null;

        return (
          <div
            key={index}
            className={`board-square ${property.owner ? "owned" : ""}${
              isCorner ? "corner-square" : ""
            }`}
            onClick={() => onPropertyClick(property)}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor,
              border: "1px solid #ccc",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "2px",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {/* Цветная полоса для группы */}
            {groupColor && property.type === "property" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  backgroundColor: groupColor,
                  width: "100%",
                  height: "100%",
                  opacity: 0.5,
                }}
              />
            )}

{[0, 10, 20, 30].includes(property.id) && (
  <div
    className="property-name"
    style={{
      fontSize: '8px',
      fontWeight: 'bold',
      textAlign: 'center',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }}
  >
    {property.name || `Поле ${index}`}
  </div>
)}

            {/* Цена */}
            {property.price && (
              <div
                className="property-price"
                style={{
                  position: "absolute",
                  fontSize: "8px",
                  color: "black",
                  backgroundColor: "rgba(0,0,0,0.1)",
                  padding: "1px 2px",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...(index <= 10
                    ? {
                        top: "80%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "100%",
                      }
                    : index <= 20
                    ? {
                        right: "40%",
                        top: "50%",
                        transform: "translateY(-50%) rotate(-90deg)",
                        height: "20%",
                        width: "100%",
                        transformOrigin: "center",
                      }
                    : index <= 30
                    ? {
                        bottom: "85%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "100%",
                      }
                    : {
                        left: "40%",
                        top: "50%",
                        transform: "translateY(-50%) rotate(90deg)",
                        height: "20%",
                        width: "100%",
                        transformOrigin: "center",
                      }),
                }}
              >
                ${property.price}
              </div>
            )}


{[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39].includes(property.id) && (
  <div
    style={{
      position: 'absolute',
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(index <= 10
        ? { // Верхний ряд — фото внизу
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '60px',
            width: '60px'
          }
        : index <= 20
        ? { // Левая колонка — фото справа
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '60px',
            width: '60px'
          }
        : index <= 30
        ? { // Нижний ряд — фото сверху
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '60px',
            width: '60px'
          }
        : { // Правая колонка — фото слева
            left: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '60px',
            width: '60px'
          }
      )
    }}
  >
    <img
      src={
        (property.id === 15 || property.id === 25 || property.id === 35)
          ? '/pic/id_15_25_35.png'
          : [2, 4, 17, 33, 38].includes(property.id)
            ? '/pic/doll.png'
            : [7, 22, 36].includes(property.id)
              ? '/pic/chance.png'
              : `/pic/id_${property.id}.png`
      }
      alt="Property"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover' // квадратная картинка
      }}
    />
  </div>
)}

            {/* Индикатор заложенной собственности */}
            {property.mortgaged && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-35deg)",
                  backgroundColor: "rgba(255, 0, 0, 0.7)",
                  color: "white",
                  fontSize: "8px",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  zIndex: 5,
                }}
              >
                ЗАЛОЖЕНО
              </div>
            )}

            {/* Дома и отели */}
            {renderBuildings(property, x, y, width, height, index)}
          </div>
        );
      })}

      {/* Фишки игроков */}
      {game.players.map((player) => {
        const playerId = getPlayerId(player);
        const positionPlayers = playersByPosition[player.position] || [];
        const positionIndex = positionPlayers.findIndex(
          (p) => getPlayerId(p) === playerId
        );
        const { x, y } = getPlayerPosition(player, positionIndex);

        return (
          <div
            key={playerId}
            className={`player-token ${
              playerId === getPlayerId(currentPlayer) ? "current-player" : ""
            }`}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: "35px",
              height: "35px",
              borderRadius: "50%",
              backgroundColor: player.color,
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            {player.isBot
              ? player.botName?.[0] || "B"
              : player.user?.username?.[0] || "?"}
          </div>
        );
      })}

      {/* Кубики */}
      {diceRoll && (
  <div
    className="dice-display"
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      display: "flex",
      gap: "15px",
      zIndex: 20,
      backgroundColor: "rgba(255,255,255,0.95)",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    }}
  >
    {diceRoll.map((value, index) => (
      <div
        key={index}
        className="die animate-roll"
        style={{
          width: "50px",
          height: "50px",
          background: "linear-gradient(145deg, #ffffff, #e6e6e6)",
          borderRadius: "10px",
          border: "2px solid #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          fontWeight: "bold",
          color: "#333",
          boxShadow: "inset -2px -2px 5px #ffffff, inset 2px 2px 5px #d1d1d1",
        }}
      >
        {value}
      </div>
    ))}
  </div>
)}

    </div>
  );
}
/////надо сделать кнопки того же цвета что и на главных страницах