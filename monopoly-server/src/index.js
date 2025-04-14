import express, { json } from "express";
import cors from "cors";
import { connect } from "mongoose";
import authRouter from "./routes/authRouter.js";
import gameRouter from "./routes/gameRouter.js";
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(json());
app.use("/auth", authRouter);
app.use("/game", gameRouter);
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
