import React, { useState, useEffect, useRef } from "react";

export default function GameBoard({ game, currentPlayer, diceRoll, onPropertyClick, gameId }) {
  const boardSize = 760;
  const cornerSize = 110;
  const propertyWidth = 60;
  const propertyHeight = 110;

  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);

  const getPropertyByPosition = (position) => {
    return game.properties.find(p => p.id === position);
  };

  
  const getGroupColor = (group) => {
    switch(group) {
      case "brown": return "#8B4513";
      case "light-blue": return "#87CEEB";
      case "pink": return "#FF69B4";
      case "orange": return "#FFA500";
      case "red": return "#FF0000";
      case "yellow": return "#FFFF00";
      case "green": return "#008000";
      case "blue": return "#0000FF";
      case "railroad": return "#000000";
      case "utility": return "#C0C0C0";
      default: return "#FFFFFF";
    }
  };
  
  const getPlayerPosition = (player, index) => {
    const position = player.position;
    let x, y;
    
    if (position <= 10) {
      // Нижний ряд (справа налево)
      x = boardSize - cornerSize - (position * propertyWidth);
      y = boardSize - propertyHeight;
    } else if (position <= 20) {
      // Левая колонка (снизу вверх)
      x = 0;
      y = boardSize - cornerSize - ((position - 10) * propertyWidth);
    } else if (position <= 30) {
      // Верхний ряд (слева направо)
      x = cornerSize + ((position - 21) * propertyWidth);
      y = 0;
    } else {
      // Правая колонка (сверху вниз)
      x = boardSize - propertyHeight;
      y = cornerSize + ((position - 31) * propertyWidth);
    }
    
    // Смещение для нескольких игроков на одной позиции
    const offsetX = (index % 2) * 15;
    const offsetY = Math.floor(index / 2) * 15;
    
    return { 
      x: x + offsetX + 5, 
      y: y + offsetY + 5
    };
  };

  ///////В ЧАТЕ НЕ РАБОТАЕТ КНОПКА ОТПРАВИТЬ
  useEffect(() => {
    if (game.chat) {
      setChatMessages(game.chat);
      scrollToBottom();
    }
  }, [game.chat]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e?.preventDefault(); // Защита от undefined
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
  
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/game/${gameId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmedMessage }),
        }
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Оптимистичное обновление UI
      const newMessage = { 
        user: { username: currentPlayer.username }, 
        message: trimmedMessage,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      setMessage("");
      
      // Прокрутка к новому сообщению
      setTimeout(scrollToBottom, 100);
      
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
      // Можно добавить уведомление для пользователя
    }
  };

  
  // Функция для рендеринга домов на собственности
  const renderBuildings = (property, x, y, width, height, position) => {
    if (!property.houses || property.houses === 0 || property.type !== "property") {
      return null;
    }

    // Определяем, будут ли дома отрисовываться горизонтально или вертикально
    const isHorizontal = position <= 10 || (position > 20 && position <= 30);
    
    // Определяем размер и отступы для домов
    const houseSize = 8;
    const hotelSize = 12; 
    let houseStyle = {};
    let housesContainerStyle = {};
    
    if (property.houses === 5) {
      // Отель
      if (isHorizontal) {
        housesContainerStyle = {
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: position <= 10 ? '25%' : '60%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        };
        houseStyle = {
          width: `${hotelSize}px`,
          height: `${hotelSize}px`,
          backgroundColor: '#C41E3A',
          border: '1px solid #8B0000'
        };
      } else {
        housesContainerStyle = {
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: position <= 20 ? '60%' : '25%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        };
        houseStyle = {
          width: `${hotelSize}px`,
          height: `${hotelSize}px`,
          backgroundColor: '#C41E3A',
          border: '1px solid #8B0000'
        };
      }
      
      return (
        <div style={housesContainerStyle}>
          <div style={houseStyle}></div>
        </div>
      );
    } else {
      // Дома (от 1 до 4)
      if (isHorizontal) {
        housesContainerStyle = {
          position: 'absolute',
          left: '0',
          right: '0',
          top: position <= 10 ? '25%' : '60%',
          display: 'flex',
          justifyContent: 'space-evenly'
        };
      } else {
        housesContainerStyle = {
          position: 'absolute',
          top: '0',
          bottom: '0',
          left: position <= 20 ? '60%' : '25%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly'
        };
      }
      
      return (
        <div style={housesContainerStyle}>
          {Array(property.houses).fill().map((_, i) => (
            <div 
              key={i}
              style={{
                width: `${houseSize}px`,
                height: `${houseSize}px`,
                backgroundColor: '#3CB043',
                border: '1px solid #2E8B57'
              }}
            ></div>
          ))}
        </div>
      );
    }
  };
  
  // Группировка игроков по позиции для корректного отображения
  const playersByPosition = {};
  game.players.forEach(player => {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  });
  
  if (!game || !game.properties || game.properties.length === 0) {
    return <div>Загрузка игровой доски...</div>;
  }
  
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
        <div style={{
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
        }}>
          
          {/* Блок чата */}
          <div style={{
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "rgba(255, 255, 255, 0.8)", // Полупрозрачный фон
  backdropFilter: "blur(8px)", // Эффект размытия
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", // Лёгкая тень
}}>
  <div style={{
    padding: "12px",
    fontWeight: "bold",
    fontSize: "16px",
    color: "#333",
    backgroundColor: "transparent", // Без отдельного цвета для шапки
    textAlign: "center",
  }}>
    Игровой чат
  </div>

  <div style={{
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  }}>
    {chatMessages.length === 0 ? (
      <div style={{ textAlign: "center", color: "#aaa" }}>Сообщений пока нет</div>
    ) : (
      chatMessages.map((msg, i) => (
        <div key={i} style={{ marginBottom: "10px", color: "#333" }}>
          <strong>{msg.user?.username || "Система"}:</strong> {msg.message}
        </div>
      ))
    )}
    <div ref={chatEndRef} />
  </div>

  <form onSubmit={sendMessage} style={{
    display: "flex",
    padding: "12px",
    gap: "8px",
    backgroundColor: "transparent",
  }}>
    <input
      type="text"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder="Введите сообщение..."
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
      style={{
        padding: "10px 18px",
        borderRadius: "8px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "background-color 0.3s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#45a049")}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4CAF50")}
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
          // Угловые клетки
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
          // Обычные клетки
          if (index <= 10) {
            // Нижний ряд (справа налево)
            x = boardSize - cornerSize - (index * propertyWidth);
            y = boardSize - propertyHeight;
            width = propertyWidth;
            height = propertyHeight;
          } else if (index <= 20) {
            // Левая колонка (снизу вверх)
            x = 0;
            y = boardSize - cornerSize - ((index - 10) * propertyWidth);
            width = propertyHeight;
            height = propertyWidth;
          } else if (index <= 30) {
            // Верхний ряд (слева направо)
            x = cornerSize + ((index - 21) * propertyWidth);
            y = 0;
            width = propertyWidth;
            height = propertyHeight;
          } else {
            // Правая колонка (сверху вниз)
            x = boardSize - propertyHeight;
            y = cornerSize + ((index - 31) * propertyWidth);
            width = propertyHeight;
            height = propertyWidth;
          }
        }
        
        // Цвет клетки в зависимости от владельца
        let backgroundColor = '#f9f9f9';
        if (property.owner) {
          const ownerPlayer = game.players.find(p => p.user._id === property.owner);
          if (ownerPlayer) {
            backgroundColor = `${ownerPlayer.color}33`; // 33 - это полупрозрачность (20%)
          }
        }
///нужно поправить эту штуку





//////нужен ли этот кусок кода?
        // Цветная полоса для группы свойств
        const groupColor = property.group ? getGroupColor(property.group) : null;
        
        return (
          <div 
            key={index}
            className={`board-square ${property.owner ? 'owned' : ''}${isCorner ? 'corner-square' : ''}`}
            onClick={() => onPropertyClick(property)}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor,
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2px',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
          >

            {/* Цветная полоса для группы */}
            {groupColor && property.type === "property" && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: groupColor,
                width: '100%',
                height: '100%',
                opacity: 0.5
              }}/>
            )}
            

{/* Название полей */}
{/* МОЖНО СДЕЛАТЬ ЛУЧШЕ*/}
{![1,3,5,6,8,9,11,12,13,14,15,16,18,19,21,23,24,25,26,27,28,29,31,32,34,35,37,39].includes(property.id) && (
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



         
{property.price && (
  <div 
    className="property-price" 
    style={{ 
      position: 'absolute',
      fontSize: '8px',
      color: 'black',
      backgroundColor: 'rgba(0,0,0,0.1)',
      padding: '1px 2px',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(index <= 10 
        ? { // Нижняя сторона (горизонтальная)
            top: '80%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%'
          }
        : index <= 20 
        ? { // Левая сторона (вертикальная)
            right: '40%', // Было right: '2px', теперь left
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            height: '20%',
            width: '100%',
            transformOrigin: 'center'
          }
        : index <= 30 
        ? { // Верхняя сторона (горизонтальная)
            bottom: '85%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%'
          }
        : { // Правая сторона (вертикальная)
            left: '40%', // Было left: '2px', теперь right
            top: '50%',
            transform: 'translateY(-50%) rotate(90deg)',
            height: '20%',
            width: '100%',
            transformOrigin: 'center'
          }
      )
    }}
  >
    ${property.price}
  </div>
)}


{[1,3,5,6,8,9,11,12,13,14,15,16,18,19,21,23,24,25,26,27,28,29,31,32,34,35,37,39].includes(property.id) && (
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
      src={(property.id === 15 || property.id === 25 || property.id === 35)
        ? '/pic/id_15_25_35.png'
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
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                backgroundColor: 'rgba(255, 0, 0, 0.7)',
                color: 'white',
                fontSize: '8px',
                padding: '1px 3px',
                borderRadius: '2px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 5
              }}>
                ЗАЛОЖЕНО
              </div>
            )}
            
            {/* Отрисовка домов/отелей на собственности */}
            {renderBuildings(property, x, y, width, height, index)}
          </div>
        );
      })}
      
      {/* Отрисовка фишек игроков */}
      {game.players.map((player) => {
        // Найти позицию игрока относительно всех игроков в той же клетке
        const positionPlayers = playersByPosition[player.position] || [];
        const positionIndex = positionPlayers.findIndex(p => p.user._id === player.user._id);
        const { x, y } = getPlayerPosition(player, positionIndex);
        
        return (
          <div
            key={player.user._id}
            className={`player-token ${player.user._id === currentPlayer?.user._id ? 'current-player' : ''}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              backgroundColor: player.color,
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {player.isBot 
              ? (player.botName?.[0] || 'B') 
              : (player.user?.username?.[0] || '?')}
          </div>
        );
      })}
      
      {/* Отображение кубиков */}
      {diceRoll && (
        <div className="dice-display" style={{ 
          position: 'absolute', 
          left: '50%', 
          top: '50%', 
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          gap: '10px',
          zIndex: 20,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}>
          {diceRoll.map((value, index) => (
            <div key={index} className="die" style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}