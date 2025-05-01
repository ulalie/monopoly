import React from "react";

export default function PlayerInfo({
  player,
  isCurrentPlayer,
  isActivePlayer,
}) {
  ///добавить статус и количество игроков
  return (
    <div style={{
      backgroundColor: isCurrentPlayer ? '#eef6ff' : '#fff',
      border: '1px solid #ccc',
      borderRadius: '3px',
      padding: '3px 5px',
      width: '120px',
      fontSize: '11px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      margin: '2px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        width: '100%',
        marginBottom: '3px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: player.color,
          border: '1px solid #aaa'
        }}></div>
        
        <strong style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '65px'
        }}>
          {player.user.username}
        </strong>
        
        {isActivePlayer && (
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
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '100%',
        fontSize: '10px',
        gap: '8px'
      }}>
        <span>💰 ${player.money}</span>
        <span>🏠 {player.properties?.length || 0}</span>
      </div>
      
      <div style={{
        fontSize: '9px',
        color: '#666',
        width: '100%',
        textAlign: 'left',
        marginTop: '2px'
      }}>
        Позиция: {player.position}
      </div>
    </div>
  );
}