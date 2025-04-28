import { handleSpecialSquare, calculateRent } from '../utils/gameUtils.js';
import { drawCard, chanceCards, communityCards } from '../utils/cardData.js';

async function processPropertyLanding(game, currentPlayer, landedProperty) {
  console.log(`[processPropertyLanding] Игрок приземлился на ${landedProperty ? landedProperty.name : 'неизвестное поле'}`);
  
  if (!landedProperty) return;

  // Обработка в зависимости от типа клетки
  switch (landedProperty.type) {
    case "property":
    case "railroad":
    case "utility":
      if (landedProperty.owner && 
          landedProperty.owner.toString() !== currentPlayer.user._id.toString() &&
          !landedProperty.mortgaged) {
        
        // Находим владельца собственности среди игроков
        const ownerPlayer = game.players.find(p => 
          p.user._id.toString() === landedProperty.owner.toString()
        );
        
        if (!ownerPlayer) {
          console.log("[processPropertyLanding] Владелец не найден:", landedProperty.owner);
          break;
        }

        // Рассчитываем арендную плату
        const rentAmount = calculateRent(landedProperty, game);
        
        // Проверяем, может ли игрок заплатить аренду сразу
        if (currentPlayer.money >= rentAmount) {
          // Автоматическая оплата аренды
          currentPlayer.money -= rentAmount;
          ownerPlayer.money += rentAmount;
          
          // Добавляем сообщение в чат
          game.chat.push({
            message: `${currentPlayer.user.username} заплатил ${rentAmount}$ игроку ${ownerPlayer.user.username} за аренду ${landedProperty.name}`,
            timestamp: new Date()
          });
          
          console.log(`[processPropertyLanding] Оплачена аренда: ${rentAmount}$`);
        } else {
          // Создаем ожидающий платеж
          game.paymentPending = {
            from: currentPlayer.user._id,
            to: landedProperty.owner,
            amount: rentAmount,
            propertyId: landedProperty.id
          };
          
          game.chat.push({
            message: `${currentPlayer.user.username} должен заплатить ${rentAmount}$ за аренду ${landedProperty.name}`,
            timestamp: new Date()
          });
          
          console.log(`[processPropertyLanding] Создан ожидающий платеж: ${rentAmount}$`);
        }
      }
      break;
      
    case "chance":
      const chanceCard = drawCard(chanceCards);
      
      // Сначала добавляем сообщение о вытянутой карте
      game.chat.push({
        message: `${currentPlayer.user.username} вытянул карту "Шанс": ${chanceCard.text}`,
        timestamp: new Date()
      });
      
      // Выполняем действие карты
      if (typeof chanceCard.action === 'function') {
        try {
          const actionResult = chanceCard.action(currentPlayer, game);
          
          // Добавляем сообщение о результате действия карты
          if (actionResult) {
            game.chat.push({
              message: actionResult,
              timestamp: new Date()
            });
          }
          
          // Если игрок попал на новое поле, обрабатываем это поле
          const newProperty = game.properties.find(p => p.id === currentPlayer.position);
          if (newProperty && newProperty.id !== landedProperty.id) {
            await processPropertyLanding(game, currentPlayer, newProperty);
          }
        } catch (error) {
          console.error("[processPropertyLanding] Ошибка при выполнении действия карты Шанс:", error);
        }
      }
      break;
      
    case "community":
      const communityCard = drawCard(communityCards);
      
      // Сначала добавляем сообщение о вытянутой карте
      game.chat.push({
        message: `${currentPlayer.user.username} вытянул карту "Общественная казна": ${communityCard.text}`,
        timestamp: new Date()
      });
      
      // Выполняем действие карты
      if (typeof communityCard.action === 'function') {
        try {
          const actionResult = communityCard.action(currentPlayer, game);
          
          // Добавляем сообщение о результате действия карты
          if (actionResult) {
            game.chat.push({
              message: actionResult,
              timestamp: new Date()
            });
          }
          
          // Если игрок попал на новое поле, обрабатываем это поле
          const newProperty = game.properties.find(p => p.id === currentPlayer.position);
          if (newProperty && newProperty.id !== landedProperty.id) {
            await processPropertyLanding(game, currentPlayer, newProperty);
          }
        } catch (error) {
          console.error("[processPropertyLanding] Ошибка при выполнении действия карты Общественная казна:", error);
        }
      }
      break;
      
    case "tax":
      // Обработка клеток налога
      const taxAmount = landedProperty.id === 4 ? 200 : 100; // Подоходный налог или налог на роскошь
      currentPlayer.money -= taxAmount;

      game.chat.push({
        message: `${currentPlayer.user.username} заплатил ${taxAmount}$ налога`,
        timestamp: new Date()
      });
      break;
      
    case "special":
      handleSpecialSquare(game, currentPlayer, landedProperty);
      break;
  }
}

export{
  processPropertyLanding
};