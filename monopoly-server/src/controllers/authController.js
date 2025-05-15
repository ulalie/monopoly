import User from "../models/User.js";
import Role from "../models/Role.js";
import Game from "../models/Game.js";
import { hashSync, compareSync } from "bcrypt";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import { secret } from "../config/config.js";

const generateAccessToken = (id, roles) => {
  const payload = { id, roles };
  return sign(payload, secret, { expiresIn: "24h" });
};

class AuthController {
  async registration(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Ошибки при регистрации", errors });
      }

      const { username, password, roles } = req.body;
      const candidate = await User.findOne({ username });
      if (candidate) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким именем уже существует" });
      }

      const hashPassword = hashSync(password, 7);

      let userRoles = [];
      if (roles && roles.length > 0) {
        userRoles = await Role.find({ value: { $in: roles } });
      }

      if (userRoles.length === 0) {
        const defaultRole = await Role.findOne({ value: "USER" });
        userRoles = [defaultRole];
      }

      const user = new User({
        username,
        password: hashPassword,
        roles: userRoles.map((role) => role.value),
      });

      await user.save();
      return res.json({ message: "Пользователь был успешно зарегистрирован" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка регистрации" });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким именем не найден" });
      }

      const validPassword = compareSync(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Неверный пароль" });
      }

      const token = generateAccessToken(user._id, user.roles);
      return res.json({ token });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка входа" });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Ошибка получения пользователей" });
    }
  }

  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      console.log('Обновление аватара для пользователя:', userId);
      console.log('Новый аватар:', req.body.avatar);
      
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
      
      user.avatar = req.body.avatar;
      await user.save();
      
      // Проверка, что аватар сохранился
      const updatedUser = await User.findById(userId);
      console.log('Сохраненный аватар:', updatedUser.avatar);
      
      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          avatar: updatedUser.avatar
        }
      });
    } catch (e) {
      console.error('Ошибка обновления аватара:', e);
      res.status(500).json({ message: 'Ошибка обновления аватара' });
    }
  }

  async uploadAndUpdateAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Файл не загружен' });
      }
      
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      // Создаем полный URL для аватара
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const avatarPath = `/uploads/${req.file.filename}`;
      const fullAvatarUrl = `${baseUrl}${avatarPath}`;
      
      user.avatar = fullAvatarUrl; // Сохраняем полный URL
      await user.save();
      
      console.log('Аватар успешно обновлен:', fullAvatarUrl);
      
      res.json({
        success: true,
        avatar: fullAvatarUrl,
        user: {
          _id: user._id,
          username: user.username,
          avatar: fullAvatarUrl
        }
      });
    } catch (e) {
      console.error('Ошибка загрузки аватара:', e);
      res.status(500).json({ message: 'Ошибка загрузки аватара' });
    }
  }

  async getCurrUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("-password");

      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      console.log('Данные пользователя из БД:', {
        id: user._id,
        username: user.username,
        avatar: user.avatar
      });
      
      const stats = {
        gamesPlayed: 0,
        wins: 0,
      };

      try {
        const games = await Game.find({ "players.user": userId });
        stats.gamesPlayed = games.length;

        const wins = games.filter(
          (game) =>
            game.status === "completed" &&
            game.players.find(
              (p) => p.user.toString() === userId && !p.bankrupt
            )
        );
        stats.wins = wins.length;
      } catch (error) {
        console.log("Ошибка получения статистики игр:", error);
      }

      res.json({
        _id: user._id,
        username: user.username,
        roles: user.roles,
        avatar: user.avatar, // Важно! Теперь возвращаем аватар
        stats,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  }
  
  async testAvatar(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      console.log('Тест аватара пользователя:', {
        userId,
        hasAvatar: !!user.avatar,
        avatarValue: user.avatar
      });
      
      res.json({
        success: true,
        avatarExists: !!user.avatar,
        avatarValue: user.avatar,
        userId: userId
      });
    } catch (e) {
      console.error('Ошибка теста аватара:', e);
      res.status(500).json({ error: e.message });
    }
  }
}

export default new AuthController();