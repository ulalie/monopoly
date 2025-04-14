import { Schema, model } from "mongoose";

const User = new Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  roles: [{ type: String, ref: "Role" }],
   isBot: { type: Boolean, default: false }
});

export default model("User", User);
