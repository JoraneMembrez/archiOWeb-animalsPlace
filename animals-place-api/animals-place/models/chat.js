import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  user1: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user2: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  animal1: {
    type: Schema.Types.ObjectId,
    ref: "Animal",
    required: true,
  },
  animal2: {
    type: Schema.Types.ObjectId,
    ref: "Animal",
    required: true,
  },
});

export default mongoose.model("Chat", ChatSchema);
