const chanceCards = [
  { id: 1, text: "Штраф за превышение скорости: заплатите 15$", action: (player) => { player.money -= 15; return `${player.user.username} заплатил штраф 15$`; } },
  { id: 2, text: "Банк выплачивает вам дивиденды: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ дивидендов`; } },
  { id: 3, text: "Вы выиграли конкурс красоты: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} получил 100$ за победу в конкурсе`; } },
  { id: 4, text: "Переместитесь на СТАРТ", action: (player) => { player.position = 0; player.money += 200; return `${player.user.username} переместился на СТАРТ и получил 200$`; } },
  { id: 5, text: "Переместитесь на Парк Горького", action: (player) => { player.position = 13; return `${player.user.username} переместился на Парк Горького`; } },
  { id: 6, text: "Переместитесь на Проспект Независимости", action: (player) => { player.position = 26; return `${player.user.username} переместился на Проспект Независимости`; } },
  { id: 7, text: "Отправляйтесь в тюрьму", action: (player) => { player.position = 10; player.jailStatus = true; return `${player.user.username} отправляется в тюрьму`; } },
  { id: 8, text: "Оплатите ремонт всех ваших домов: 25$ за дом, 100$ за отель", action: (player, game) => { 
    let cost = 0;
    let houses = 0;
    let hotels = 0;
    
    game.properties.forEach(property => {
      if (property.owner && property.owner.toString() === player.user.toString()) {
        if (property.houses === 5) hotels++;
        else houses += property.houses;
      }
    });
    
    cost = (houses * 25) + (hotels * 100);
    player.money -= cost;
    return `${player.user.username} заплатил ${cost}$ за ремонт (${houses} домов, ${hotels} отелей)`;
  }},
  { id: 9, text: "Вы были избраны председателем правления: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ как председатель правления`; } },
  { id: 10, text: "Срок платежа по кредиту: заплатите 150$", action: (player) => { player.money -= 150; return `${player.user.username} заплатил 150$ по кредиту`; } }
];

const communityCards = [
  { id: 1, text: "Возврат налога: получите 20$", action: (player) => { player.money += 20; return `${player.user.username} получил возврат налога 20$`; } },
  { id: 2, text: "Ошибка банка в вашу пользу: получите 200$", action: (player) => { player.money += 200; return `${player.user.username} получил 200$ из-за ошибки банка`; } },
  { id: 3, text: "Оплата врача: заплатите 50$", action: (player) => { player.money -= 50; return `${player.user.username} заплатил 50$ за лечение`; } },
  { id: 4, text: "Продажа акций: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ от продажи акций`; } },
  { id: 5, text: "Выигрыш в лотерею: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} выиграл 100$ в лотерею`; } },
  { id: 6, text: "Оплата страховки: заплатите 50$", action: (player) => { player.money -= 50; return `${player.user.username} заплатил 50$ за страховку`; } },
  { id: 7, text: "Наследство: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} получил 100$ по наследству`; } },
  { id: 8, text: "Оплата учебы: заплатите 100$", action: (player) => { player.money -= 100; return `${player.user.username} заплатил 100$ за обучение`; } },
  { id: 9, text: "Консультационные услуги: получите 25$", action: (player) => { player.money += 25; return `${player.user.username} получил 25$ за консультацию`; } },
  { id: 10, text: "Отправляйтесь в тюрьму", action: (player) => { player.position = 10; player.jailStatus = true; return `${player.user.username} отправляется в тюрьму`; } }
];

function drawCard(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck[randomIndex];
}

export {
  chanceCards,
  communityCards,
  drawCard
};