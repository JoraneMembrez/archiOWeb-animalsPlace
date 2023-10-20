import mongoose from "mongoose";
const Schema = mongoose.Schema;
// Define the schema for users
const userSchema = new Schema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now(),
  },
  address: {
    type: String,
  },
  animals: [
    {
      type: Schema.Types.ObjectId,
      ref: "Animal",
    },
  ],
});

userSchema.set("toJSON", {
  transform: transformJsonUser,
});
// permet de supprimer le mot de passe dans le json renvoyé
function transformJsonUser(doc, json, options) {
  delete json.password;
  return json;
}

// Create the model from the schema and export it
export default mongoose.model("User", userSchema);
