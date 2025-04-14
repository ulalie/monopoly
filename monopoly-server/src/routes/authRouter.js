import Router from "express";
const router = new Router();
import authController from "../controllers/authController.js";
const { getUsers, login, registration, getCurrUser } = authController;
import { check } from "express-validator";
//import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

router.post(
  "/registration",
  [
    check("username", "Имя пользователя не может быть пустым").notEmpty(),
    check("password", "Пароль должен быть от 6 до 10 символов").isLength({
      min: 6,
      max: 10,
    }),
  ],
  registration
);
router.post("/login", login);
router.get("/users", roleMiddleware(["ADMIN"]), getUsers);
router.get("/profile", roleMiddleware([]), getCurrUser);

export default router;
