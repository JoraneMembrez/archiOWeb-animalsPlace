import express from "express";
import User from "../models/user.js";
import { authenticate } from "./auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.currentUserId;
    const new_longitude = req.query.longitude;
    const new_latitude = req.query.latitude;
    console.log("Longitude:", new_longitude, "Latitude:", new_latitude);

    console.log("user : ", userId);

    let user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found COBBBARD" });
      return;
    }

    if (new_longitude) user.geolocation_lon = new_longitude;
    if (new_latitude) user.geolocation_lat = new_latitude;

    // Enregistrez les modifications dans la base de données
    const updatedUser = await user.save();

    // Répondez avec l'utilisateur mis à jour
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user location:", error);
    next(error);
  }
});

// export default router;
export default router;
