const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRouter = require("./routes/authRouter.js");
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/auth", authRouter);
const start = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://qwerty:qwerty123@auth.o9jiq.mongodb.net/?retryWrites=true&w=majority&appName=auth"
    );
    app.listen(PORT, () => console.log(`server started on port ${PORT}`));
  } catch (error) {
    console.log(error);
  }
};

start();
