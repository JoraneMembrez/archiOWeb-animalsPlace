import mongoose from "mongoose";
const Schema = mongoose.Schema;
// Define the schema for users
const userSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    validate: function (value) {
      const nameRegex = /^[a-zA-Z\-']{2,50}$/;
      return nameRegex.test(value);
    },
  },
  lastName: {
    type: String,
    validate: function (value) {
      const nameRegex = /^[a-zA-Z\-']{2,50}$/;
      return nameRegex.test(value);
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: function (value) {
      const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
      return emailRegex.test(value);
    },
  },
  password: {
    type: String,
    required: true,
    validate: function (value) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
      return passwordRegex.test(value);
    },
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
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  // utiliser geojson
  location: {
    type: {
      type: String,
      required: true,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: validateGeoJsonCoordinates,
        message:
          "{VALUE} is not a valid longitude/latitude(/altitude) coordinates array",
      },
      default: [6.647778558579233, 46.78060279685718], // par défaut les coordonées de l'HEIG :)
    },
  },
});

// Create a geospatial index on the location property.
userSchema.index({ location: "2dsphere" });

// Validate a GeoJSON coordinates array (longitude, latitude and optional altitude).
function validateGeoJsonCoordinates(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 3 &&
    isLongitude(value[0]) &&
    isLatitude(value[1])
  );
}

function isLatitude(value) {
  return value >= -90 && value <= 90;
}

function isLongitude(value) {
  return value >= -180 && value <= 180;
}

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
