import Router from "express";
const router = new Router();
import authController from "../controllers/authController.js";
import { check } from "express-validator";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { upload } from "../middleware/fileUpload.js";

router.post(
  "/registration",
  [
    check("username", "Имя пользователя не может быть пустым").notEmpty(),
    check("password", "Пароль должен быть от 6 до 10 символов").isLength({
      min: 6,
      max: 10,
    }),
  ],
  authController.registration
);

router.post("/login", authController.login);
router.get("/users", roleMiddleware(["ADMIN"]), authController.getUsers);
router.get("/profile", roleMiddleware([]), authController.getCurrUser);

router.put('/avatar', roleMiddleware([]), authController.updateAvatar);
router.post('/upload-avatar', roleMiddleware([]), upload.single('avatar'), authController.uploadAndUpdateAvatar);
router.get('/test-avatar', roleMiddleware([]), authController.testAvatar);

export default router;