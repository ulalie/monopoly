import React, { useState, useEffect } from "react";

const TradeModal = ({ 
  isOpen, 
  onClose, 
  game, 
  currentPlayer, 
  onProposeTrade 
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerProperties, setOfferProperties] = useState([]);
  const [requestProperties, setRequestProperties] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [error, setError] = useState("");
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayer(null);
      setOfferProperties([]);
      setRequestProperties([]);
      setOfferMoney(0);
      setRequestMoney(0);
      setError("");
      
      if (game && game.players && currentPlayer) {
        const others = game.players.filter(player => {
          if (player.user && 
              currentPlayer.user && 
              String(player.user._id) === String(currentPlayer.user._id)) {
            return false;
          }
          return true; 
        });
        
        console.log("Доступные игроки для обмена:", others);
        setAvailablePlayers(others);
        
        if (others.length === 0) {
          setError("Нет доступных игроков для обмена.");
        }
      }
    }
  }, [isOpen, game, currentPlayer]);

  if (!isOpen) return null;

  const myProperties = game.properties.filter(property => 
    property.owner && 
    String(property.owner) === String(currentPlayer.user._id) &&
    property.houses === 0 && 
    !property.mortgaged 
  );

  const selectedPlayerProperties = selectedPlayer 
    ? game.properties.filter(property => {
        const ownerId = selectedPlayer.isBot 
          ? selectedPlayer.user._id 
          : (selectedPlayer.user && selectedPlayer.user._id);
          
        return property.owner && 
          String(property.owner) === String(ownerId) &&
          property.houses === 0 && 
          !property.mortgaged; 
      }) 
    : [];

  const handlePlayerSelect = (playerId) => {
    console.log("Выбран игрок с ID:", playerId);
    
    if (!playerId) {
      setSelectedPlayer(null);
      setRequestProperties([]);
      return;
    }
    
    const player = game.players.find(p => {
      if (p.isBot) {
        return p.botId === playerId || (p.user && String(p.user._id) === String(playerId));
      }
      return p.user && String(p.user._id) === String(playerId);
    });
    
    if (player) {
      console.log("Найден игрок:", player);
      setSelectedPlayer(player);
      setRequestProperties([]);
    } else {
      console.error("Игрок не найден по ID:", playerId);
      setError("Не удалось найти выбранного игрока");
    }
  };

  const toggleOfferProperty = (propertyId) => {
    if (offerProperties.includes(propertyId)) {
      setOfferProperties(offerProperties.filter(id => id !== propertyId));
    } else {
      setOfferProperties([...offerProperties, propertyId]);
    }
  };

  const toggleRequestProperty = (propertyId) => {
    if (requestProperties.includes(propertyId)) {
      setRequestProperties(requestProperties.filter(id => id !== propertyId));
    } else {
      setRequestProperties([...requestProperties, propertyId]);
    }
  };

  const handleProposeTrade = () => {
    if (!selectedPlayer) {
      setError("Выберите игрока для обмена");
      return;
    }

    if (offerProperties.length === 0 && requestProperties.length === 0 && offerMoney === 0 && requestMoney === 0) {
      setError("Выберите что-то для обмена");
      return;
    }

    if (offerMoney > currentPlayer.money) {
      setError("У вас недостаточно денег для предложения");
      return;
    }

    if (requestMoney > (selectedPlayer.money || 0)) {
      setError("У выбранного игрока недостаточно денег");
      return;
    }

    const toPlayerId = selectedPlayer.isBot
      ? selectedPlayer.user._id
      : selectedPlayer.user._id; 

    onProposeTrade({
      toPlayerId,
      offerProperties,
      requestProperties,
      offerMoney: parseInt(offerMoney) || 0,
      requestMoney: parseInt(requestMoney) || 0,
      isToBot: selectedPlayer.isBot 
    });
  };

  const noAvailablePlayers = availablePlayers.length === 0;

  return (
    <div className="trade-modal-backdrop">
      <div className="trade-modal">
        <div className="trade-modal-header">
          <h3>Предложить обмен</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="trade-modal-body">
          {error && <div className="trade-error">{error}</div>}

          {noAvailablePlayers ? (
            <div className="no-players-message">
              <p>Нет доступных игроков для обмена.</p>
            </div>
          ) : (
            <>
              <div className="player-select">
                <label>Выберите игрока для обмена:</label>
                <select 
                  value={selectedPlayer ? (selectedPlayer.isBot ? selectedPlayer.user._id : selectedPlayer.user._id) : ""}
                  onChange={(e) => handlePlayerSelect(e.target.value)}
                >
                  <option value="">-- Выберите игрока --</option>
                  {availablePlayers.map(player => (
                    <option key={player.isBot ? `bot-${player.user._id}` : player.user._id} 
                           value={player.isBot ? player.user._id : player.user._id}>
                      {player.isBot ? `${player.botName || "Бот"} [БОТ]` : player.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer && (
                <div className="trade-content">
                  <div className="trade-column">
                    <h4>Ваше предложение</h4>
                    <div className="money-input">
                      <label>Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={currentPlayer.money}
                        value={offerMoney}
                        onChange={(e) => setOfferMoney(e.target.value)}
                      />
                    </div>
                    <div className="properties-list">
                      <h5>Ваши свойства:</h5>
                      {myProperties.length === 0 ? (
                        <p className="no-properties">У вас нет доступных свойств для обмена</p>
                      ) : (
                        <ul>
                          {myProperties.map(property => (
                            <li 
                              key={property.id}
                              className={offerProperties.includes(property.id) ? "selected" : ""}
                              onClick={() => toggleOfferProperty(property.id)}
                            >
                              {property.name}
                              <span className={`group-marker ${property.group}`}></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="trade-column">
                    <h4>Вы запрашиваете</h4>
                    <div className="money-input">
                      <label>Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={selectedPlayer.money || 0}
                        value={requestMoney}
                        onChange={(e) => setRequestMoney(e.target.value)}
                      />
                    </div>
                    <div className="properties-list">
                      <h5>Свойства {selectedPlayer.isBot ? (selectedPlayer.botName || "Бота") : selectedPlayer.user.username}:</h5>
                      {selectedPlayerProperties.length === 0 ? (
                        <p className="no-properties">У игрока нет доступных свойств для обмена</p>
                      ) : (
                        <ul>
                          {selectedPlayerProperties.map(property => (
                            <li 
                              key={property.id}
                              className={requestProperties.includes(property.id) ? "selected" : ""}
                              onClick={() => toggleRequestProperty(property.id)}
                            >
                              {property.name}
                              <span className={`group-marker ${property.group}`}></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedPlayer && selectedPlayer.isBot && (
                <div className="bot-trade-info">
                  <p><strong>Примечание:</strong> Боты принимают решение о принятии сделки в зависимости от её выгодности и некоторого элемента случайности.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="trade-modal-footer">
          <button onClick={onClose} className="cancel-button">Отмена</button>
          <button 
            onClick={handleProposeTrade} 
            disabled={!selectedPlayer || noAvailablePlayers}
            className="propose-button"
          >
            Предложить обмен
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeModal;