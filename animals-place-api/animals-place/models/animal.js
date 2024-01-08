import mongoose from "mongoose";
const Schema = mongoose.Schema;

const animalSchema = new Schema({
  name: {
    type: String,
    required: true,
    validate: function (value) {
      const nameRegex = /^[a-zA-Z\-']{2,50}$/;
      return nameRegex.test(value);
    },
  },
  species: {
    type: String,
    required: true,
    enum: ["chien", "chat", "lapin", "cheval"],
    // envoyer un message d'erreur si l'enum n'est pas respecté
  },
  age: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  profilePictureURL: {
    type: String,
  },
  description: {
    type: String,
  },
  race: {
    type: String,
  },

  picturesURL: {
    type: [String],
    createdDate: {
      type: Date,
      default: Date.now,
    },
  },

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
  animals_liked: [
    {
      animal: {
        type: Schema.Types.ObjectId,
        ref: "Animal",
      },
      date: {
        type: Date,
      },
    },
  ],
});

export default mongoose.model("Animal", animalSchema);
