import React, { useState, useEffect } from "react";

const TradeModal = ({ 
  isOpen, 
  onClose, 
  game, 
  currentPlayer, 
  onProposeTrade 
}) => {
  console.log("TradeModal рендерится, isOpen:", isOpen);
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerProperties, setOfferProperties] = useState([]);
  const [requestProperties, setRequestProperties] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [error, setError] = useState("");
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      console.log("TradeModal: useEffect запущен, isOpen = true");
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
  
  if (!isOpen) {
    console.log("TradeModal: isOpen = false, возвращаем null");
    return null;
  }

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
    console.log("Переключение предлагаемого свойства:", propertyId);
    if (offerProperties.includes(propertyId)) {
      setOfferProperties(offerProperties.filter(id => id !== propertyId));
    } else {
      setOfferProperties([...offerProperties, propertyId]);
    }
  };

  const toggleRequestProperty = (propertyId) => {
    console.log("Переключение запрашиваемого свойства:", propertyId);
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

    onProposeTrade({
      toPlayerId: selectedPlayer.user._id,
      offerProperties,
      requestProperties,
      offerMoney: parseInt(offerMoney) || 0,
      requestMoney: parseInt(requestMoney) || 0,
      isToBot: selectedPlayer.isBot, 
      botIndex: selectedPlayer.isBot ? game.players.indexOf(selectedPlayer) : null,
      botName: selectedPlayer.isBot ? selectedPlayer.botName : null,
    });
  };

  const noAvailablePlayers = availablePlayers.length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 w-11/12 max-w-2xl rounded shadow-md max-h-[90vh] overflow-auto p-4 dark:text-white">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="m-0 text-lg font-medium">Предложить обмен</h3>
          <button 
            className="bg-transparent border-0 text-2xl cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div>
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {noAvailablePlayers ? (
            <div className="text-gray-600 dark:text-gray-300 p-2">
              <p>Нет доступных игроков для обмена.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block mb-1">Выберите игрока для обмена:</label>
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-base dark:bg-gray-700 mt-1"
                  value={selectedPlayer ? game.players.indexOf(selectedPlayer) : ""}
                  onChange={(e) => handlePlayerSelect(e.target.value)}
                >
                  <option value="">-- Выберите игрока --</option>
                  {availablePlayers.map((player, index) => (
                    <option 
                      key={player.isBot ? `bot-${index}` : player.user._id} 
                      value={player.isBot ? player.user._id : player.user._id}
                    >
                      {player.isBot ? `${player.botName || "Бот"} [БОТ]` : player.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer && (
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[250px] bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <h4 className="font-medium mb-2">Ваше предложение</h4>
                    <div className="mb-3">
                      <label className="block mb-1">Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={currentPlayer.money}
                        value={offerMoney}
                        onChange={(e) => setOfferMoney(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-base dark:bg-gray-700"
                      />
                    </div>
                    <div className="mt-3">
                      <h5 className="font-medium mb-1">Ваши свойства:</h5>
                      {myProperties.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">У вас нет доступных свойств для обмена</p>
                      ) : (
                        <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto">
                          {myProperties.map(property => (
                            <li 
                              key={property.id} 
                              onClick={() => toggleOfferProperty(property.id)}
                              className={`flex items-center p-2 rounded mb-1 cursor-pointer border ${
                                offerProperties.includes(property.id) 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                checked={offerProperties.includes(property.id)}
                                onChange={() => {}} 
                                className="mr-2"
                              />
                              <span>{property.name}</span>
                              <span 
                                className={`inline-block w-2.5 h-2.5 rounded-full ml-1.5`}
                                style={{ backgroundColor: getGroupColor(property.group) }}
                              ></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[250px] bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <h4 className="font-medium mb-2">Вы запрашиваете</h4>
                    <div className="mb-3">
                      <label className="block mb-1">Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={selectedPlayer.money || 0}
                        value={requestMoney}
                        onChange={(e) => setRequestMoney(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-base dark:bg-gray-700"
                      />
                    </div>
                    <div className="mt-3">
                      <h5 className="font-medium mb-1">
                        Свойства {selectedPlayer.isBot ? (selectedPlayer.botName || "Бота") : selectedPlayer.user.username}:
                      </h5>
                      {selectedPlayerProperties.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">У игрока нет доступных свойств для обмена</p>
                      ) : (
                        <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto">
                          {selectedPlayerProperties.map(property => (
                            <li 
                              key={property.id} 
                              onClick={() => toggleRequestProperty(property.id)}
                              className={`flex items-center p-2 rounded mb-1 cursor-pointer border ${
                                requestProperties.includes(property.id) 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                checked={requestProperties.includes(property.id)}
                                onChange={() => {}} 
                                className="mr-2"
                              />
                              <span>{property.name}</span>
                              <span 
                                className={`inline-block w-2.5 h-2.5 rounded-full ml-1.5`}
                                style={{ backgroundColor: getGroupColor(property.group) }}
                              ></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedPlayer && selectedPlayer.isBot && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 p-3 rounded mt-4 mb-2 text-sm">
                  <p><strong>Примечание:</strong> Боты принимают решение о принятии сделки в зависимости от её выгодности и некоторого элемента случайности.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <button 
            className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded"
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className={`px-3 py-1.5 ${
              (!selectedPlayer || noAvailablePlayers) 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-indigo-500 hover:bg-indigo-600'
            } text-white rounded`}
            onClick={handleProposeTrade} 
            disabled={!selectedPlayer || noAvailablePlayers}
          >
            Предложить обмен
          </button>
        </div>
      </div>
    </div>
  );
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

export default TradeModal;