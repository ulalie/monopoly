import express, { json } from "express";
import cors from "cors";
import { connect } from "mongoose";
import authRouter from "./routes/authRouter.js";
import gameRouter from "./routes/gameRouter.js";
import uploadRouter from "./routes/uploadRouter.js"; // Если используете отдельный маршрутизатор
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/auth", authRouter);
app.use("/game", gameRouter);
app.use("/upload", uploadRouter); 

const start = async () => {
  try {
    await connect(
      "mongodb+srv://qwerty:qwerty123@auth.o9jiq.mongodb.net/?retryWrites=true&w=majority&appName=auth"
    );
    app.listen(PORT, () => console.log(`server started on port ${PORT}`));
  } catch (error) {
    console.log(error);
  }
};

start();