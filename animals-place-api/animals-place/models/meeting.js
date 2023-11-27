import mongoose from "mongoose";
const Schema = mongoose.Schema;

const meetingSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true, // L'utilisateur qui crée la rencontre
  },
  animal1: {
    type: Schema.Types.ObjectId,
    ref: "Animal",
    required: true, // Le premier animal participant
  },
  animal2: {
    type: Schema.Types.ObjectId,
    ref: "Animal",
    required: true, // Le deuxième animal participant
  },
  date: {
    type: Date,
    required: true, // La date de la rencontre
  },
  location: {
    type: String,
    required: true, // L'emplacement de la rencontre
  },
  description: {
    type: String, // Description facultative de la rencontre
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Meeting", meetingSchema);
