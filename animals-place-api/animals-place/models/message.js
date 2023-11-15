import mongoose from "mongoose";
const Schema = mongoose.Schema;

const Messagechema = new Schema({
  chat: {
    type: Schema.ObjectId,
    ref: "Chat",
  },
  user: {
    type: Schema.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    required: true,
  },
  date: Date,
});

export default mongoose.model("Message", Messagechema);
