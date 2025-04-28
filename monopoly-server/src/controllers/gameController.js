import Game from "../models/Game.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import bcrypt from "bcryptjs"; 
import { initializeMonopolyProperties } from'../utils/propertyData.js';
import { processPropertyLanding } from '../services/GameService.js';

class GameController {
  constructor() {
    // Привязка методов к контексту this
    this.botTurn = this.botTurn.bind(this);
    this.createGame = this.createGame.bind(this);
    this.startGame = this.startGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.endTurn = this.endTurn.bind(this);
  }

async createGame(req, res) {
  try {
    const { name, maxPlayers, gameType, botCount } = req.body;
    const userId = req.user.id;

    // Получаем данные пользователя для правильного отображения имени
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Проверка корректности количества ботов
    const actualMaxPlayers = maxPlayers || 4;
    const actualBotCount = botCount || 0;
    
    if (actualBotCount >= actualMaxPlayers) {
      return res.status(400).json({ 
        message: "Количество ботов должно быть меньше максимального количества игроков" 
      });
    }

    const newGame = new Game({
      name,
      creator: userId,
      maxPlayers: actualMaxPlayers,
      gameType: gameType || "classic",
      botCount: actualBotCount,
      players: [
        {
          user: userId,
          position: 0,
          money: 1500,
          properties: [],
          color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        },
      ],
      properties: [...initializeMonopolyProperties()],
      chat: [],
      lastDiceRoll: null,
      paymentPending: null,
      trades: [],
    });

    // Добавляем ботов, если нужно
    if (gameType === "with-bots" && actualBotCount > 0) {
      let botUser = await User.findOne({ username: "Бот" });
      
      if (!botUser) {
        const botPassword = Math.random().toString(36).substring(2, 15);
        const hashPassword = await bcrypt.hash(botPassword, 7);
        const botRole = await Role.findOne({ value: "USER" });
        
        botUser = new User({
          username: "Бот",
          password: hashPassword,
          roles: [botRole.value],
          isBot: true
        });
        
        await botUser.save();
      }

      // Генерируем разные имена и цвета для ботов
      const botColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF3333"];
      const botNames = ["Бот Алекс", "Бот Макс", "Бот Ева", "Бот Лиза", "Бот Игорь"];
      
      // Добавляем указанное количество ботов
      for (let i = 0; i < actualBotCount; i++) {
        const botName = botNames[i % botNames.length];
        const botColor = botColors[i % botColors.length];
        
        newGame.players.push({
          user: botUser._id,
          position: 0,
          money: 1500,
          properties: [],
          color: botColor, 
          isBot: true,
          botName: `${botName} ${i+1}` // Добавляем номер, чтобы боты не повторялись
        });
        
        newGame.chat.push({
          message: `${botName} ${i+1} присоединился к игре`,
          timestamp: new Date()
        });
      }

      // Автоматически начинаем игру только если достигнуто максимальное количество игроков
      const totalPlayers = newGame.players.length;
      const shouldAutoStart = totalPlayers >= actualMaxPlayers;
      
      if (shouldAutoStart) {
        newGame.status = "active";
        newGame.currentPlayerIndex = 0; 
        
        newGame.chat.push({
          message: `Игра автоматически началась, так как достигнуто максимальное количество игроков! Первый ход: ${user.username || "Игрок"}`,
          timestamp: new Date()
        });
      }
    }

    console.log("Новая игра создается:", {
      название: name,
      игроков: newGame.players.length,
      ботов: newGame.players.filter(p => p.isBot).length,
      статус: newGame.status
    });

    await newGame.save();
    console.log("Игра успешно создана с ID:", newGame._id);

    // Заполняем детали пользователей для ответа
    const populatedGame = await Game.findById(newGame._id)
      .populate("creator", "username")
      .populate("players.user", "username");

    res.status(201).json(populatedGame);
    
    if (newGame.status === "active" && newGame.players[0].isBot) {
      setTimeout(() => {
        this.botTurn(newGame);
      }, 1000);
    }
  } catch (error) {
    console.log("Ошибка создания игры:", error);
    res.status(500).json({ message: "Ошибка создания игры", error: error.message });
  }
}

  async startGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const isCreator = String(game.creator._id) === String(userId);
      const isParticipant = game.players.some(p => String(p.user._id) === String(userId));

      if (!isCreator && !isParticipant) {
        return res.status(403).json({ message: "Вы не участвуете в этой игре" });
      }

      if (game.status !== "waiting") {
        return res.status(400).json({ message: "Игра уже запущена" });
      }

      const totalPlayers = game.players.length;
      if (totalPlayers < 2) {
        return res.status(400).json({ message: "Для начала игры нужно минимум 2 участника" });
      }

      game.status = "active";
      game.currentPlayerIndex = 0;
      
      const firstPlayerName = game.players[0].isBot 
        ? (game.players[0].botName || 'Бот') 
        : game.players[0].user.username;
      
      game.chat.push({
        message: `Игра началась! Первый ход: ${firstPlayerName}`,
        timestamp: new Date()
      });

      await game.save();
      res.json(game);
      
      if (game.players[0].isBot) {
        setTimeout(() => {
          this.botTurn(game);
        }, 1000);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка запуска игры" });
    }
  }

  async botTurn(game) {
    try {
      console.log("[botTurn] Начало хода бота для игры", game._id);
      
      // Получаем актуальную игру из базы данных
      const updatedGame = await Game.findById(game._id)
        .populate("creator", "username")
        .populate("players.user", "username");
        
      if (!updatedGame || updatedGame.status !== 'active') {
        console.log("[botTurn] Игра не найдена или неактивна");
        return;
      }
      
      const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
      
      // Проверяем, что текущий игрок - бот
      if (!currentPlayer.isBot) {
        console.log("[botTurn] Текущий игрок не бот, отмена хода бота");
        return;
      }
      
      console.log("[botTurn] Бот бросает кубики");
      
      // Бросок кубиков для бота
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;
      
      updatedGame.lastDiceRoll = {
        dice: [dice1, dice2],
        sum: diceSum,
        doubles: dice1 === dice2,
      };
      
      const oldPosition = currentPlayer.position;
      currentPlayer.position = (currentPlayer.position + diceSum) % 40;
      
      // Проверяем прохождение через СТАРТ
      if (currentPlayer.position < oldPosition) {
        currentPlayer.money += 200;
        updatedGame.chat.push({
          message: `Бот ${currentPlayer.botName || "Бот"} прошёл через СТАРТ и получил 200$`,
          timestamp: new Date(),
        });
      }
      
      updatedGame.chat.push({
        message: `Бот ${currentPlayer.botName || "Бот"} бросил кубики и выбросил ${dice1} и ${dice2}`,
        timestamp: new Date(),
      });
      
      // Обработка поля, на которое попал бот
      const landedProperty = updatedGame.properties.find(p => p.id === currentPlayer.position);
      
      // Обрабатываем приземление на поле
      await processPropertyLanding(updatedGame, currentPlayer, landedProperty);
      
      // Простая логика для покупки свойств
      if (landedProperty && 
          (landedProperty.type === 'property' || landedProperty.type === 'railroad' || landedProperty.type === 'utility') && 
          !landedProperty.owner &&
          currentPlayer.money >= landedProperty.price) {
        
        // Бот покупает свойство с вероятностью 70%
        if (Math.random() < 0.7) {
          landedProperty.owner = currentPlayer.user._id || currentPlayer.user;
          currentPlayer.money -= landedProperty.price;
          currentPlayer.properties.push(landedProperty.id);
          
          updatedGame.chat.push({
            message: `Бот ${currentPlayer.botName || "Бот"} купил ${landedProperty.name} за ${landedProperty.price}$`,
            timestamp: new Date(),
          });
        } else {
          updatedGame.chat.push({
            message: `Бот ${currentPlayer.botName || "Бот"} решил не покупать ${landedProperty.name}`,
            timestamp: new Date(),
          });
        }
      }
      
      // Сбрасываем бросок кубиков
      updatedGame.lastDiceRoll = null;
      updatedGame.markModified('lastDiceRoll');
      
      // Переходим к следующему игроку
      updatedGame.currentPlayerIndex = (updatedGame.currentPlayerIndex + 1) % updatedGame.players.length;
      
      // Добавляем сообщение о переходе хода
      const nextPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
      const nextPlayerName = nextPlayer.isBot 
        ? (nextPlayer.botName || "Бот") 
        : (nextPlayer.user?.username || "Неизвестный игрок");
      
      updatedGame.chat.push({
        message: `Ход перешёл к ${nextPlayerName}`,
        timestamp: new Date(),
      });
      
      // Сохраняем игру
      await updatedGame.save();
      console.log("[botTurn] Ход бота завершен, переход к игроку:", nextPlayerName);
      
      // Если следующий игрок тоже бот, запускаем его ход через процесс
      if (nextPlayer.isBot) {
        console.log("[botTurn] Следующий игрок тоже бот, запускаем его ход");
        
        // Используем process.nextTick без "self" - теперь можно напрямую использовать "this"
        process.nextTick(() => {
          this.botTurn(updatedGame).catch(err => {
            console.error("[botTurn] Ошибка запуска хода следующего бота:", err);
          });
        });
      }
      
    } catch (error) {
      console.error("[botTurn] Ошибка в ходе бота:", error);
      
      // Обработка ошибки - все равно переходим к следующему игроку
      try {
        const game = await Game.findById(game._id)
          .populate("creator", "username")
          .populate("players.user", "username");
          
        if (game && game.status === 'active') {
          game.lastDiceRoll = null;
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
          
          game.chat.push({
            message: `Произошла ошибка в ходе бота. Ход переходит к следующему игроку.`,
            timestamp: new Date(),
          });
          
          await game.save();
          console.log("[botTurn] Восстановление после ошибки - ход передан следующему игроку");
        }
      } catch (recoverError) {
        console.error("[botTurn] Ошибка восстановления:", recoverError);
      }
    }
  }

  async getAllGames(req, res) {
    try {
      const games = await Game.find({ status: { $ne: "completed" } })
        .populate("creator", "username")
        .populate("players.user", "username");
      res.json(games);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка получения списка игр" });
    }
  }

  async getGameById(req, res) {
    try {
      const game = await Game.findById(req.params.id)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка получения игры" });
    }
  }

  async joinGame(req, res) {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;

    // Получаем данные пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const game = await Game.findById(gameId)
      .populate("creator", "username")
      .populate("players.user", "username");

    if (!game) {
      return res.status(404).json({ message: "Игра не найдена" });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({ message: "Игра уже началась" });
    }

    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: "Игра заполнена" });
    }

    const playerExists = game.players.some(
      (player) => String(player.user._id) === String(userId)
    );
    if (playerExists) {
      return res.status(400).json({ message: "Вы уже в этой игре" });
    }

    game.players.push({
      user: userId,
      position: 0,
      money: 1500,
      properties: [],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    });
    
    // Добавляем сообщение в чат
    game.chat.push({
      message: `${user.username} присоединился к игре`,
      timestamp: new Date()
    });

    // Проверяем, достигнуто ли максимальное количество игроков
    if (game.players.length >= game.maxPlayers) {
      game.status = "active";
      game.currentPlayerIndex = 0;
      
      const firstPlayer = game.players[0];
      const firstPlayerName = firstPlayer.isBot 
        ? firstPlayer.botName || "Бот" 
        : firstPlayer.user.username;
      
      game.chat.push({
        message: `Комната заполнена. Игра автоматически началась! Первый ход: ${firstPlayerName}`,
        timestamp: new Date()
      });
    }

    await game.save();
    
    // Получаем обновленную игру с заполненными данными пользователей
    const updatedGame = await Game.findById(gameId)
      .populate("creator", "username")
      .populate("players.user", "username");
    
    if (updatedGame.status === "active" && updatedGame.players[0].isBot) {
      setTimeout(() => {
        this.botTurn(updatedGame);
      }, 1000);
    }
    
    res.json(updatedGame);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Ошибка присоединения к игре" });
  }
}

  async leaveGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status === "active") {
        return res
          .status(400)
          .json({ message: "Нельзя выйти из активной игры" });
      }

      const playerIndex = game.players.findIndex(
        (player) => String(player.user._id) === String(userId)
      );
      if (playerIndex === -1) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const playerName = game.players[playerIndex].user.username;
      game.players.splice(playerIndex, 1);
      
      game.chat.push({
        message: `${playerName} покинул игру`,
        timestamp: new Date()
      });

      if (game.players.length === 0) {
        await Game.findByIdAndDelete(gameId);
        return res.json({ message: "Игра удалена, так как все игроки вышли" });
      }

      if (String(game.creator._id) === String(userId)) {
        game.creator = game.players[0].user._id;
      }

      await game.save();
      res.json({ message: "Вы успешно вышли из игры", game });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка выхода из игры" });
    }
  }

  async rollDice(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      console.log(`[СЕРВЕР] Запрос на бросок кубиков от userId=${userId}, gameId=${gameId}`);

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        console.log("[СЕРВЕР] Игра не найдена");
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        console.log("[СЕРВЕР] Игра не активна");
        return res.status(400).json({ message: "Игра еще не началась" });
      }

      const currentPlayer = game.players[game.currentPlayerIndex];

      console.log("[СЕРВЕР] Данные текущего игрока:", {
        currentPlayerUserId: String(currentPlayer.user._id),
        requestUserId: String(userId),
        gameLastDiceRoll: game.lastDiceRoll
      });

      if (String(currentPlayer.user._id) !== String(userId)) {
        console.log("[СЕРВЕР] Не ваш ход");
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      if (game.lastDiceRoll && 
          game.lastDiceRoll.dice && 
          game.lastDiceRoll.dice.length > 0) {
        console.log("[СЕРВЕР] Кубики уже брошены");
        return res.status(400).json({ message: "Вы уже бросали кубики в этот ход" });
      }

      // Бросок кубиков...
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;

      console.log(`[СЕРВЕР] Новый бросок кубиков: ${dice1}, ${dice2}`);

      // Устанавливаем lastDiceRoll
      game.lastDiceRoll = {
        dice: [dice1, dice2],
        sum: diceSum,
        doubles: dice1 === dice2,
      };

      const oldPosition = currentPlayer.position;

      currentPlayer.position = (currentPlayer.position + diceSum) % 40;

      if (currentPlayer.position < oldPosition) {
        currentPlayer.money += 200;
        game.chat.push({
          message: `${currentPlayer.user.username} прошёл через СТАРТ и получил 200$`,
          timestamp: new Date(),
        });
      }

      game.chat.push({
        message: `${currentPlayer.user.username} бросил кубики и выбросил ${dice1} и ${dice2}`,
        timestamp: new Date(),
      });

      const landedProperty = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      // Обрабатываем приземление на поле
      // Переделываем вызов метода на вызов функции
      await processPropertyLanding(game, currentPlayer, landedProperty);

      await game.save();
      console.log("[СЕРВЕР] Игра сохранена с новым броском кубиков");

      // Проверим, что lastDiceRoll действительно сохранился
      const checkGame = await Game.findById(gameId);
      console.log("[СЕРВЕР] Проверка lastDiceRoll после сохранения:", checkGame.lastDiceRoll);

      res.json({
        game,
        dice: [dice1, dice2],
        position: currentPlayer.position,
      });
    } catch (error) {
      console.log("[СЕРВЕР] Ошибка броска кубиков:", error);
      res.status(500).json({ message: "Ошибка броска кубиков" });
    }
  }

  async buyProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const playerIndex = game.players.findIndex(
        (player) => String(player.user._id) === String(userId)
      );

      if (playerIndex === -1) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const currentPlayer = game.players[playerIndex];

      if (game.currentPlayerIndex !== playerIndex) {
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      const property = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      if (!property) {
        return res.status(400).json({ message: "Свойство не найдено" });
      }

      if (property.type !== "property" && property.type !== "railroad" && property.type !== "utility") {
        return res.status(400).json({ message: "Это поле нельзя купить" });
      }

      if (property.owner) {
        return res
          .status(400)
          .json({ message: "Это свойство уже принадлежит кому-то" });
      }

      if (currentPlayer.money < property.price) {
        return res.status(400).json({ message: "У вас недостаточно денег" });
      }

      // Покупка свойства
      property.owner = currentPlayer.user._id;
      currentPlayer.money -= property.price;
      currentPlayer.properties.push(property.id);

      // Добавить сообщение в чат
      game.chat.push({
        message: `${currentPlayer.user.username} купил ${property.name} за ${property.price}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка покупки собственности" });
    }
  }
  
  async endTurn(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      // Новая, более безопасная проверка
      const currentPlayer = game.players[game.currentPlayerIndex];
      
      // Проверяем, является ли текущий игрок ботом или имеет другой ID
      if (currentPlayer.isBot || 
          !currentPlayer.user || 
          String(currentPlayer.user._id) !== String(userId)) {
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      // Проверить, есть ли ожидающий платеж
      if (game.paymentPending) {
        // Сначала проверим, что paymentPending.from существует
        const fromUserId = game.paymentPending.from;
        if (fromUserId && String(fromUserId) === String(userId)) {
          return res
            .status(400)
            .json({ message: "Вы должны сначала заплатить аренду" });
        }
      }
      
      game.lastDiceRoll = null;
      game.markModified('lastDiceRoll'); // Явно указываем Mongoose, что поле изменилось
      
      game.paymentPending = null;

      // Переход к следующему игроку
      game.currentPlayerIndex = 
        (game.currentPlayerIndex + 1) % game.players.length;

      // Безопасное сообщение в чат, учитывающее ботов
      const nextPlayer = game.players[game.currentPlayerIndex];
      const nextPlayerName = nextPlayer.isBot 
        ? nextPlayer.botName 
        : nextPlayer.user.username;
        
      game.chat.push({
        message: `Ход перешёл к ${nextPlayerName}`,
        timestamp: new Date(),
      });

      await game.save();

      if (nextPlayer.isBot) {
        // Запускаем ход бота в следующем тике
        process.nextTick(() => {
          this.botTurn(game).catch(err => {
            console.error("Ошибка запуска хода бота:", err);
          });
        });
      }
      
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка завершения хода" });
    }
  }

  async payRent(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      // Проверка, есть ли ожидающий платеж для данного пользователя
      if (
        !game.paymentPending ||
        String(game.paymentPending.from) !== String(userId)
      ) {
        return res
          .status(400)
          .json({ message: "У вас нет ожидающих платежей" });
      }

      const { from, to, amount, propertyId } = game.paymentPending;

      const payingPlayer = game.players.find(
        (p) => String(p.user._id) === String(from)
      );
      const receivingPlayer = game.players.find(
        (p) => String(p.user._id) === String(to)
      );

      if (!payingPlayer || !receivingPlayer) {
        return res.status(400).json({ message: "Не найден один из участников платежа" });
      }

      // Проверить, достаточно ли денег
      if (payingPlayer.money < amount) {
        // Игрок не может заплатить, обработка банкротства
        // Здесь будет реализация объявления банкротства
        return res.status(400).json({
          message:
            "У вас недостаточно денег. Вы должны заложить собственность или объявить банкротство",
        });
      }

      payingPlayer.money -= amount;
      receivingPlayer.money += amount;

      game.paymentPending = null;

      game.chat.push({
        message: `${payingPlayer.user.username} заплатил ${amount}$ игроку ${receivingPlayer.user.username} за аренду`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка оплаты аренды" });
    }
  }

  async mortgageProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность уже заложена" });
      }

      if (property.houses > 0) {
        return res
          .status(400)
          .json({ message: "Сначала нужно продать все дома" });
      }

      property.mortgaged = true;
      player.money += Math.floor(property.price / 2);

      game.chat.push({
        message: `${player.user.username} заложил ${
          property.name
        } и получил ${Math.floor(property.price / 2)}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка залога собственности" });
    }
  }

  async unmortgageProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (!property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность не заложена" });
      }

      // Рассчитать сумму для выкупа (цена + 10%)
      const unmortgageAmount = Math.floor((property.price / 2) * 1.1);

      if (player.money < unmortgageAmount) {
        return res
          .status(400)
          .json({ message: "У вас недостаточно денег для выкупа" });
      }

      property.mortgaged = false;
      player.money -= unmortgageAmount;

      game.chat.push({
        message: `${player.user.username} выкупил ${property.name} за ${unmortgageAmount}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка выкупа собственности" });
    }
  }

  async buildHouse(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность заложена, нельзя строить" });
      }

      if (property.houses >= 5) {
        return res.status(400).json({
          message:
            "На этой собственности уже максимальное количество домов/отель",
        });
      }

      const propertiesInGroup = game.properties.filter(
        (p) => p.group === property.group
      );
      const ownsAllInGroup = propertiesInGroup.every(
        (p) => p.owner && String(p.owner) === String(userId)
      );

      if (!ownsAllInGroup) {
        return res
          .status(400)
          .json({ message: "Вы должны владеть всей группой собственностей" });
      }

      // Проверить равномерное развитие (нельзя строить больше домов на одной собственности, если другие имеют на 2+ дома меньше)
      const minHousesInGroup = Math.min(
        ...propertiesInGroup.map((p) => p.houses)
      );
      if (property.houses > minHousesInGroup) {
        return res.status(400).json({
          message:
            "Сначала постройте дома на других собственностях этой группы",
        });
      }

      // Стоимость дома зависит от группы собственности
      let houseCost;
      switch (property.group) {
        case "brown":
        case "light-blue":
          houseCost = 50;
          break;
        case "pink":
        case "orange":
          houseCost = 100;
          break;
        case "red":
        case "yellow":
          houseCost = 150;
          break;
        case "green":
        case "blue":
          houseCost = 200;
          break;
        default:
          return res
            .status(400)
            .json({ message: "На этой собственности нельзя строить" });
      }

      if (player.money < houseCost) {
        return res.status(400).json({ message: "У вас недостаточно денег" });
      }

      property.houses += 1;
      player.money -= houseCost;

      const buildingType = property.houses === 5 ? "отель" : "дом";
      game.chat.push({
        message: `${player.user.username} построил ${buildingType} на ${property.name} за ${houseCost}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка постройки дома" });
    }
  }

  async proposeTrade(req, res) {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    const {
      toPlayerId,
      offerProperties,
      requestProperties,
      offerMoney,
      requestMoney,
      isToBot,
      botIndex,
      botName
    } = req.body;

    const game = await Game.findById(gameId)
      .populate("creator", "username")
      .populate("players.user", "username");

    if (!game) {
      return res.status(404).json({ message: "Игра не найдена" });
    }

    if (game.status !== "active") {
      return res.status(400).json({ message: "Игра ещё не началась" });
    }

    // Найдем игрока, предлагающего обмен
    const fromPlayer = game.players.find((p) => String(p.user._id) === String(userId));
    
    // Найдем игрока, которому предлагают обмен
    let toPlayer;
    
    if (isToBot) {
      // Для бота используем индекс в массиве или ищем по имени бота
      if (botIndex !== null && botIndex >= 0 && botIndex < game.players.length) {
        toPlayer = game.players[botIndex];
      } else if (botName) {
        toPlayer = game.players.find(p => p.isBot && p.botName === botName);
      } else {
        // Если нет индекса и имени, ищем бота по ID пользователя
        toPlayer = game.players.find(
          (p) => p.isBot && String(p.user._id) === String(toPlayerId)
        );
      }
    } else {
      // Для обычного игрока ищем по ID пользователя
      toPlayer = game.players.find(
        (p) => !p.isBot && String(p.user._id) === String(toPlayerId)
      );
    }

    if (!fromPlayer || !toPlayer) {
      return res.status(400).json({ message: "Один из игроков не найден" });
    }

    // Проверить, что у предлагающего есть все offered properties
    if (offerProperties && offerProperties.length > 0) {
      for (const propId of offerProperties) {
        const property = game.properties.find(
          (p) => p.id === parseInt(propId)
        );

        if (!property || String(property.owner) !== String(userId)) {
          return res.status(400).json({
            message: "Вы не владеете всеми предлагаемыми собственностями",
          });
        }

        if (property.houses > 0) {
          return res.status(400).json({
            message:
              "Нельзя торговать собственностями с домами. Сначала продайте дома",
          });
        }
      }
    }

    // Проверить, что у получателя есть все requested properties
    if (requestProperties && requestProperties.length > 0) {
      for (const propId of requestProperties) {
        const property = game.properties.find(
          (p) => p.id === parseInt(propId)
        );

        if (!property || String(property.owner) !== String(toPlayer.user._id)) {
          return res.status(400).json({
            message:
              "Другой игрок не владеет всеми запрашиваемыми собственностями",
          });
        }

        if (property.houses > 0) {
          return res
            .status(400)
            .json({ message: "Нельзя торговать собственностями с домами" });
        }
      }
    }

    if (offerMoney && fromPlayer.money < offerMoney) {
      return res
        .status(400)
        .json({ message: "У вас недостаточно денег для этой сделки" });
    }

    if (!game.trades) {
      game.trades = [];
    }

    const newTrade = {
      id: Date.now().toString(),
      from: userId,
      to: toPlayer.user._id,
      offerProperties: offerProperties || [],
      requestProperties: requestProperties || [],
      offerMoney: offerMoney || 0,
      requestMoney: requestMoney || 0,
      status: "pending",
      createdAt: new Date(),
    };

    // Для бота реализуем автоматическое принятие/отклонение предложения
    if (isToBot) {
      // Простая логика: бот принимает предложение случайным образом с вероятностью 70%
      const botAccepts = Math.random() < 0.7;
      
      if (botAccepts) {
        // Бот принимает предложение
        newTrade.status = "accepted";
        newTrade.completedAt = new Date();
        
        // Выполняем обмен деньгами
        if (offerMoney > 0) {
          fromPlayer.money -= offerMoney;
          toPlayer.money += offerMoney;
        }
        
        if (requestMoney > 0) {
          toPlayer.money -= requestMoney;
          fromPlayer.money += requestMoney;
        }
        
        // Выполняем обмен собственностями
        for (const propId of offerProperties) {
          const property = game.properties.find((p) => p.id === parseInt(propId));
          if (property) {
            property.owner = toPlayer.user._id;
            
            // Обновляем списки собственности игроков
            fromPlayer.properties = fromPlayer.properties.filter(id => id !== parseInt(propId));
            if (!toPlayer.properties.includes(parseInt(propId))) {
              toPlayer.properties.push(parseInt(propId));
            }
          }
        }
        
        for (const propId of requestProperties) {
          const property = game.properties.find((p) => p.id === parseInt(propId));
          if (property) {
            property.owner = fromPlayer.user._id;
            
            // Обновляем списки собственности игроков
            toPlayer.properties = toPlayer.properties.filter(id => id !== parseInt(propId));
            if (!fromPlayer.properties.includes(parseInt(propId))) {
              fromPlayer.properties.push(parseInt(propId));
            }
          }
        }
        
        game.chat.push({
          message: `${fromPlayer.user.username} предложил обмен боту ${toPlayer.botName || "Бот"}. Бот принял предложение.`,
          timestamp: new Date(),
        });
        
        game.trades.push(newTrade);
        await game.save();
        
        return res.json({ 
          game, 
          trade: newTrade,
          botAccepted: true 
        });
      } else {
        // Бот отклоняет предложение
        newTrade.status = "rejected";
        newTrade.completedAt = new Date();
        
        game.chat.push({
          message: `${fromPlayer.user.username} предложил обмен боту ${toPlayer.botName || "Бот"}. Бот отклонил предложение.`,
          timestamp: new Date(),
        });
        
        game.trades.push(newTrade);
        await game.save();
        
        return res.json({ 
          game, 
          trade: newTrade,
          botRejected: true,
          rejectionReason: "Предложение невыгодно" 
        });
      }
    }

    // Для обычного игрока добавляем предложение в список
    game.trades.push(newTrade);

    game.chat.push({
      message: `${fromPlayer.user.username} предложил обмен игроку ${
        toPlayer.isBot ? (toPlayer.botName || "Бот") : toPlayer.user.username
      }`,
      timestamp: new Date(),
    });

    await game.save();
    res.json({ game, trade: newTrade });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Ошибка предложения обмена" });
  }
}

  async acceptTrade(req, res) {
    try {
      const gameId = req.params.id;
      const tradeId = req.params.tradeId;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const tradeIndex = game.trades.findIndex((t) => t.id === tradeId);

      if (tradeIndex === -1) {
        return res
          .status(404)
          .json({ message: "Предложение обмена не найдено" });
      }

      const trade = game.trades[tradeIndex];

      if (String(trade.to) !== String(userId)) {
        return res
          .status(403)
          .json({ message: "Это предложение обмена не для вас" });
      }

      if (trade.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Это предложение уже обработано" });
      }

      const fromPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.from)
      );
      const toPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.to)
      );

      if (!fromPlayer || !toPlayer) {
        return res.status(400).json({ message: "Один из участников обмена не найден" });
      }

      if (trade.requestMoney > 0 && toPlayer.money < trade.requestMoney) {
        return res
          .status(400)
          .json({ message: "У вас недостаточно денег для этой сделки" });
      }

      // Выполнить обмен

      // 1. Обмен деньгами
      if (trade.offerMoney > 0) {
        fromPlayer.money -= trade.offerMoney;
        toPlayer.money += trade.offerMoney;
      }

      if (trade.requestMoney > 0) {
        toPlayer.money -= trade.requestMoney;
        fromPlayer.money += trade.requestMoney;
      }

      // 2. Обмен собственностью
      for (const propId of trade.offerProperties) {
        const property = game.properties.find((p) => p.id === parseInt(propId));
        property.owner = toPlayer.user._id;

        // Обновить списки собственности игроков
        fromPlayer.properties = fromPlayer.properties.filter(
          (id) => id !== parseInt(propId)
        );
        toPlayer.properties.push(parseInt(propId));
      }

      for (const propId of trade.requestProperties) {
        const property = game.properties.find((p) => p.id === parseInt(propId));
        property.owner = fromPlayer.user._id;

        // Обновить списки собственности игроков
        toPlayer.properties = toPlayer.properties.filter(
          (id) => id !== parseInt(propId)
        );
        fromPlayer.properties.push(parseInt(propId));
      }

      // Обновить статус предложения
      trade.status = "accepted";
      trade.completedAt = new Date();

      game.chat.push({
        message: `${toPlayer.user.username} принял предложение обмена от ${fromPlayer.user.username}`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка принятия обмена" });
    }
  }

  async rejectTrade(req, res) {
    try {
      const gameId = req.params.id;
      const tradeId = req.params.tradeId;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      // Найти предложение обмена
      const tradeIndex = game.trades.findIndex((t) => t.id === tradeId);

      if (tradeIndex === -1) {
        return res
          .status(404)
          .json({ message: "Предложение обмена не найдено" });
      }

      const trade = game.trades[tradeIndex];

      // Проверить, что текущий пользователь может отклонить предложение
      // (либо он получатель, либо отправитель)
      if (String(trade.to) !== String(userId) && String(trade.from) !== String(userId)) {
        return res
          .status(403)
          .json({ message: "Вы не можете отклонить это предложение" });
      }

      if (trade.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Это предложение уже обработано" });
      }

      // Обновить статус предложения
      trade.status = "rejected";
      trade.completedAt = new Date();

      // Найти игроков
      const fromPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.from)
      );
      const toPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.to)
      );

      if (String(trade.to) === String(userId)) {
        game.chat.push({
          message: `${toPlayer.user.username} отклонил предложение обмена от ${fromPlayer.user.username}`,
          timestamp: new Date(),
        });
      } else {
        game.chat.push({
          message: `${fromPlayer.user.username} отозвал своё предложение обмена`,
          timestamp: new Date(),
        });
      }

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка отклонения обмена" });
    }
  }

  async sendChatMessage(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { message } = req.body;

      if (!message || message.trim() === "") {
        return res
          .status(400)
          .json({ message: "Сообщение не может быть пустым" });
      }

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(403)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      game.chat.push({
        user: userId,
        message: `${player.user.username}: ${message}`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка отправки сообщения" });
    }
  }
}


export default new GameController();