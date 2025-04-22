import React, { useEffect } from "react";

export default function GameBoard({ game, currentPlayer, diceRoll, onPropertyClick }) {

  useEffect(() => {
    console.log("Игровые данные получены:", {
      игроки: game.players.length,
      свойства: game.properties.length,
      текущийИгрок: currentPlayer
    });
  }, [game, currentPlayer]);

 
  const boardSize = 800;
  const squareSize = boardSize / 11;

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
      x = boardSize - ((position + 1) * squareSize);
      y = boardSize - squareSize;
    } else if (position <= 20) {
      // Левая колонка (снизу вверх)
      x = 0;
      y = boardSize - ((position - 10 + 1) * squareSize);
    } else if (position <= 30) {
      // Верхний ряд (слева направо)
      x = (position - 20) * squareSize;
      y = 0;
    } else {
      // Правая колонка (сверху вниз)
      x = boardSize - squareSize;
      y = (position - 30) * squareSize;
    }
    
    // Смещение для нескольких игроков на одной позиции
    const offsetX = (index % 2) * 15;
    const offsetY = Math.floor(index / 2) * 15;
    
    return { 
      x: x + offsetX + 20, 
      y: y + offsetY + 20
    };
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
        position: 'relative',
        margin: '0 auto',
        backgroundColor: '#e9f5e9',
        border: '2px solid #128c7e',
        borderRadius: '8px'
      }}
    >
      {/* Центральная область доски */}
      <div style={{
        position: 'absolute',
        left: `${squareSize}px`,
        top: `${squareSize}px`,
        width: `${boardSize - 2 * squareSize}px`,
        height: `${boardSize - 2 * squareSize}px`,
        backgroundColor: '#f8f8f8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
      }}>
        МОНОПОЛИЯ
      </div>
      
      {/* Отрисовка клеток доски */}
      {Array.from({ length: 40 }).map((_, index) => {
        const property = getPropertyByPosition(index);
        if (!property) return null;
        
        // Вычисление координат для клетки
        let x, y, width, height;
        
        if (index <= 10) {
          // Нижний ряд
          x = boardSize - ((index + 1) * squareSize);
          y = boardSize - squareSize;
          width = index === 0 ? squareSize : squareSize;
          height = squareSize;
        } else if (index <= 20) {
          // Левая колонка
          x = 0;
          y = boardSize - ((index - 10 + 1) * squareSize);
          width = squareSize;
          height = index === 20 ? squareSize : squareSize;
        } else if (index <= 30) {
          // Верхний ряд
          x = (index - 20) * squareSize;
          y = 0;
          width = index === 30 ? squareSize : squareSize;
          height = squareSize;
        } else {
          // Правая колонка
          x = boardSize - squareSize;
          y = (index - 30) * squareSize;
          width = squareSize;
          height = squareSize;
        }
        
        // Угловые клетки чуть больше
        const isCorner = index === 0 || index === 10 || index === 20 || index === 30;
        
        // Цвет клетки в зависимости от владельца
        let backgroundColor = '#f9f9f9';
        if (property.owner) {
          const ownerPlayer = game.players.find(p => p.user._id === property.owner);
          if (ownerPlayer) {
            backgroundColor = `${ownerPlayer.color}33`; // 33 - это полупрозрачность (20%)
          }
        }
        
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
                height: '4px',
                backgroundColor: groupColor,
                width: '100%',
                marginBottom: '2px'
              }}/>
            )}
            
            <div className="property-name" style={{ 
              fontSize: '8px', 
              fontWeight: 'bold',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {property.name || `Поле ${index}`}
            </div>
            
            {property.price && (
              <div className="property-price" style={{ 
                fontSize: '8px',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: '1px 0'
              }}>
                ${property.price}
              </div>
            )}
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
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: player.color,
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '10px',
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