import { Schema, model } from "mongoose";

const GameSchema = new Schema({
  name: { type: String, required: true },
  creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
players: [
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    position: { type: Number, default: 0 },
    money: { type: Number, default: 1500 },
    properties: [{ type: Number }],
    jailStatus: { type: Boolean, default: false },
    color: { type: String },
    bankrupt: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    botName: { type: String }, 
  },
],
  maxPlayers: { type: Number, default: 4 },
  gameType: {
    type: String,
    enum: ["classic", "with-bots"],
    default: "classic",
  },
  status: {
    type: String,
    enum: ["waiting", "active", "completed"],
    default: "waiting",
  },
  currentPlayerIndex: { type: Number, default: 0 },
  properties: [
    {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
      price: Number,
      rent: [Number],
      owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
      houses: { type: Number, default: 0 },
      mortgaged: { type: Boolean, default: false },
      group: String,
      description: String, 
    pic: String  ,
    },
  ],
  lastDiceRoll: {
    dice: [Number],
    sum: Number,
    doubles: Boolean,
  },
  paymentPending: {
    from: { type: Schema.Types.ObjectId, ref: "User" },
    to: { type: Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    propertyId: Number,
  },
  trades: [
    {
      id: String,
      from: { type: Schema.Types.ObjectId, ref: "User" },
      to: { type: Schema.Types.ObjectId, ref: "User" },
      offerProperties: [Number],
      requestProperties: [Number],
      offerMoney: Number,
      requestMoney: Number,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
      createdAt: { type: Date, default: Date.now },
      completedAt: Date,
    },
  ],
 chat: [{
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  user: {
    username: { type: String }
    // Можно добавить _id, но не как ссылку, а как простую строку
    // _id: { type: String }
  }
}],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default model("Game", GameSchema);
