import React, { useState } from "react";

const PropertyManagementModal = ({ 
  isOpen, 
  onClose, 
  property,
  game,
  currentPlayer,
  onBuildHouse,
  onMortgageProperty,
  onUnmortgageProperty
}) => {
  const [error, setError] = useState("");

  const getHouseCost = () => {
    switch (property?.group) {
      case "brown":
      case "light-blue":
        return 50;
      case "pink":
      case "orange":
        return 100;
      case "red":
      case "yellow":
        return 150;
      case "green":
      case "blue":
        return 200;
      default:
        return 0;
    }
  };
  
  const ownsFullGroup = () => {
    if (!property || !game || !currentPlayer) return false;
    
    const propertiesInGroup = game.properties.filter(p => p.group === property.group);
    return propertiesInGroup.every(p => 
      p.owner && String(p.owner) === String(currentPlayer.user._id)
    );
  };
  
  const canBuildHouse = () => {
    if (!property || !currentPlayer) return false;
    
    if (property.type !== "property" || !["brown", "light-blue", "pink", "orange", "red", "yellow", "green", "blue"].includes(property.group)) {
      return false;
    }
    
    if (!ownsFullGroup()) return false;
    
    if (property.houses >= 5) return false;
    
    if (property.mortgaged) return false;
    
    if (currentPlayer.money < getHouseCost()) return false;
    
    const propertiesInGroup = game.properties.filter(p => p.group === property.group);
    const minHousesInGroup = Math.min(...propertiesInGroup.map(p => p.houses));
    
    return property.houses <= minHousesInGroup;
  };
  
  const canMortgage = () => {
    if (!property || !currentPlayer) return false;
    
    if (String(property.owner) !== String(currentPlayer.user._id)) return false;
    
    if (property.mortgaged) return false;
    
    return property.houses === 0;
  };
  
  const canUnmortgage = () => {
    if (!property || !currentPlayer) return false;
    
    if (String(property.owner) !== String(currentPlayer.user._id)) return false;
    
    if (!property.mortgaged) return false;
    
    const unmortgageAmount = Math.floor((property.price / 2) * 1.1);
    return currentPlayer.money >= unmortgageAmount;
  };
  
  const handleBuildHouse = () => {
    if (!canBuildHouse()) {
      setError("Невозможно построить дом на этой собственности");
      return;
    }
    
    onBuildHouse(property.id);
    onClose();
  };
  
  const handleMortgage = () => {
    if (!canMortgage()) {
      setError("Невозможно заложить эту собственность");
      return;
    }
    
    onMortgageProperty(property.id);
    onClose();
  };
  
  const handleUnmortgage = () => {
    if (!canUnmortgage()) {
      setError("Невозможно выкупить эту собственность");
      return;
    }
    
    onUnmortgageProperty(property.id);
    onClose();
  };
  
  if (!isOpen || !property) return null;
  
  const isOwnedByCurrentPlayer = 
    property.owner && 
    currentPlayer && 
    String(property.owner) === String(currentPlayer.user._id);
  
  const isRailroad = property.group === "railroad";
  const isUtility = property.group === "utility";
  const isRegularProperty = !isRailroad && !isUtility && property.type === "property";
  
  const unmortgageAmount = Math.floor((property.price / 2) * 1.1);
  
  const getOwnerName = () => {
    if (!property.owner) return "Нет владельца";
    
    const ownerPlayer = game.players.find(p => 
      p.user && String(p.user._id) === String(property.owner)
    );
    
    return ownerPlayer 
      ? (ownerPlayer.isBot ? ownerPlayer.botName : ownerPlayer.user.username)
      : "Неизвестный владелец";
  };

  const isDarkText = ['yellow', 'light-blue'].includes(property.group);

  ///В ПРОПЕРТИ НЕ ПЕРЕДАЕТСЯ ОПИСАНИЕ ПОЛЯ (?!)
  console.log("Property data:", property);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-11/12 max-w-lg max-h-[90vh] overflow-auto">
        <div 
          className={`px-4 py-3 flex justify-between items-center rounded-t-lg ${isDarkText ? 'text-black' : 'text-white'}`}
          style={{ backgroundColor: property.group ? getGroupColor(property.group) : '#f8f8f8' }}
        >
          <h3 className="text-lg font-medium m-0">Управление собственностью</h3>
          <button 
            className="bg-transparent border-0 text-2xl cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4 dark:text-white">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="property-details">
            <h4 className="text-center mt-0 mb-3 text-lg font-medium">
              {property.name}
            </h4>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
              <p className="my-1"><strong>Тип:</strong> {
                isRailroad ? "Железная дорога" : 
                isUtility ? "Коммунальное предприятие" : 
                "Собственность"
              }</p>
              <p className="my-1"><strong>Стоимость:</strong> ${property.price}</p>
              <p className="my-1"><strong>Владелец:</strong> {getOwnerName()}</p>
              {isRegularProperty && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-600 rounded">
                  <p className="my-1">
                    <strong>Текущая постройка:</strong> {
                      property.houses === 0 ? "Нет" : 
                      property.houses === 5 ? "Отель" : 
                      `${property.houses} ${
                        property.houses === 1 ? "дом" : 
                        property.houses < 5 ? "дома" : "домов"
                      }`
                    }
                  </p>
                  
                  {canBuildHouse() && (
                    <p className="my-1 text-green-600 dark:text-green-400 font-medium">
                      <strong>Следующая постройка:</strong> {
                        property.houses === 4 ? "Отель" : "Дом"
                      } (${getHouseCost()})
                    </p>
                  )}
                  
                  <div className="mt-2 text-sm">
                    <h6 className="my-1 text-sm font-medium">Таблица аренды:</h6>
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b dark:border-gray-700">
                          <td className="py-1 px-2">Базовая аренда:</td>
                          <td className="py-1 px-2">${property.rent[0]}</td>
                        </tr>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                          <td className="py-1 px-2">⭐</td>
                          <td className="py-1 px-2">${property.rent[1]}</td>
                        </tr>
                        <tr className="border-b dark:border-gray-700">
                          <td className="py-1 px-2">⭐⭐</td>
                          <td className="py-1 px-2">${property.rent[2]}</td>
                        </tr>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                          <td className="py-1 px-2">⭐⭐⭐</td>
                          <td className="py-1 px-2">${property.rent[3]}</td>
                        </tr>
                        <tr className="border-b dark:border-gray-700">
                          <td className="py-1 px-2">⭐⭐⭐⭐</td>
                          <td className="py-1 px-2">${property.rent[4]}</td>
                        </tr>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td className="py-1 px-2">⭐⭐⭐⭐⭐</td>
                          <td className="py-1 px-2">${property.rent[5]}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {property.mortgaged && (
                <span className="bg-red-600 bg-opacity-80 text-white px-2 py-1 rounded text-sm font-bold inline-block mt-2">
                  ЗАЛОЖЕНО
                </span>
              )}
            </div>
            
            {isOwnedByCurrentPlayer && (
              <div>
                <h5 className="mt-0 mb-2 text-base font-medium">Доступные действия</h5>
                
                {isRegularProperty && canBuildHouse() && (
                  <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded mb-2">
                    <p className="m-0">Построить {property.houses === 4 ? "отель" : "дом"} (${getHouseCost()})</p>
                    <button 
                      onClick={handleBuildHouse}
                      className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded"
                    >
                      Построить
                    </button>
                  </div>
                )}
                
                {canMortgage() && (
                  <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded mb-2">
                    <p className="m-0">Заложить собственность (получить ${Math.floor(property.price / 2)})</p>
                    <button 
                      onClick={handleMortgage}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 px-3 rounded"
                    >
                      Заложить
                    </button>
                  </div>
                )}
                
                {canUnmortgage() && (
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded mb-2">
                    <p className="m-0">Выкупить собственность (заплатить ${unmortgageAmount})</p>
                    <button 
                      onClick={handleUnmortgage}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded"
                    >
                      Выкупить
                    </button>
                  </div>
                )}
                
                {!canBuildHouse() && !canMortgage() && !canUnmortgage() && (
                  <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-center text-gray-600 dark:text-gray-300">
                    Нет доступных действий для этой собственности
                  </p>
                )}
                
                {isRegularProperty && ownsFullGroup() && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-500">
                    <h6 className="m-0 mb-1 text-sm font-medium">Правила строительства:</h6>
                    <ul className="ml-4 mt-1 p-0 text-sm">
                      <li className="mb-1">Вы должны владеть всеми собственностями группы одного цвета</li>
                      <li className="mb-1">Строительство должно быть равномерным - разница между количеством домов не должна превышать 1</li>
                      <li className="mb-1">Максимум 4 дома на собственности, затем можно построить отель</li>
                      <li>Нельзя строить на заложенной собственности</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {!isOwnedByCurrentPlayer && (
              <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-center text-gray-600 dark:text-gray-300 italic">
                Вы не являетесь владельцем этой собственности и не можете управлять ею.
              </p>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-right">
          <button 
            onClick={onClose} 
            className="bg-gray-500 hover:bg-gray-600 text-white py-1.5 px-3 rounded"
          >
            Закрыть
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

export default PropertyManagementModal;