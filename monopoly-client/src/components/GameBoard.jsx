// components/GameBoard.js
import React from "react";

export default function GameBoard({ game, currentPlayer, diceRoll }) {
  // Размеры доски
  const boardSize = 800;
  const squareSize = boardSize / 11;
  
  // Вспомогательная функция для получения собственности по позиции
  const getPropertyByPosition = (position) => {
    return game.properties.find(p => p.id === position);
  };
  
  // Помощник для получения позиции игрока на доске
  const getPlayerPosition = (player, index) => {
    const position = player.position;
    let x, y;
    
    // Рассчитать координаты x, y на основе позиции
    if (position <= 10) {
      // Нижний ряд
      x = boardSize - (position * squareSize);
      y = boardSize - squareSize;
    } else if (position <= 20) {
      // Левая колонка
      x = 0;
      y = boardSize - ((position - 10) * squareSize);
    } else if (position <= 30) {
      // Верхний ряд
      x = (position - 20) * squareSize;
      y = 0;
    } else {
      // Правая колонка
      x = boardSize - squareSize;
      y = (position - 30) * squareSize;
    }
    
    // Смещение нескольких игроков в одной позиции
    x += (index % 2) * 15;
    y += Math.floor(index / 2) * 15;
    
    return { x, y };
  };
  
  // Группировка игроков по позиции
  const playersByPosition = {};
  game.players.forEach(player => {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  });
  
  return (
    <div className="game-board" style={{ width: `${boardSize}px`, height: `${boardSize}px` }}>
      {/* Нарисовать квадраты доски */}
      {Array.from({ length: 40 }).map((_, index) => {
        const property = getPropertyByPosition(index);
        
        // Рассчитать позицию
        let x, y;
        if (index <= 10) {
          // Нижний ряд
          x = boardSize - (index * squareSize);
          y = boardSize - squareSize;
        } else if (index <= 20) {
          // Левая колонка
          x = 0;
          y = boardSize - ((index - 10) * squareSize);
        } else if (index <= 30) {
          // Верхний ряд
          x = (index - 20) * squareSize;
          y = 0;
        } else {
          // Правая колонка
          x = boardSize - squareSize;
          y = (index - 30) * squareSize;
        }
        
        // Угловые квадраты больше
        const isCorner = index === 0 || index === 10 || index === 20 || index === 30;
        const width = isCorner ? squareSize : squareSize;
        const height = isCorner ? squareSize : squareSize;
        
        return (
          <div 
            key={index}
            className={`board-square ${property?.owner ? 'owned' : ''}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: property?.owner ? 
                game.players.find(p => p.user._id === property.owner)?.color + '33' : // 33 - это шестнадцатеричное значение для 20% непрозрачности
                '#f9f9f9',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2px'
            }}
          >
            <div className="property-name" style={{ fontSize: '8px', fontWeight: 'bold' }}>
              {property?.name || `Поле ${index}`}
            </div>
            
            {property?.price && (
              <div className="property-price" style={{ fontSize: '8px' }}>
                ${property.price}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Нарисовать фишки игроков */}
      {game.players.map((player, playerIndex) => {
        // Найти позицию этого игрока среди всех игроков в той же точке
        const positionIndex = playersByPosition[player.position].findIndex(p => p.user._id === player.user._id);
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
            {player.user.username.charAt(0)}
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
          gap: '10px'
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