import mongoose from "mongoose";
const Schema = mongoose.Schema;

const animalSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  species: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true,
  },
  profilePictureURL: {
    type: String,
  },

  interests: [
    {
      type: String,
    },
  ],
  location: {
    type: String,
  },
  favoriteActivities: [
    {
      type: String,
    },
  ],
  matches: [
    {
      type: Schema.Types.ObjectId,
      ref: "Animal",
    },
  ],
  createdDate: {
    type: Date,
    default: Date.now,
  },

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

export default mongoose.model("Animal", animalSchema);
