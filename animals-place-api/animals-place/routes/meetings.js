import express from "express";
import User from "../models/user.js";
import Animal from "../models/animal.js";
import Meeting from "../models/meeting.js";
import { authenticate } from "./auth.js";

const router = express.Router();

router.post("/like/:animalID", authenticate, async (req, res, next) => {
  const animalID = req.params.animalID;
  const userID = req.params.userID;

  try {
    const animal = await Animal.findById(animalID);

    if (!animal) {
      res.status(404).json({ message: "Animal not found" });
      return;
    }

    const likeIndex = animal.likes.findIndex((like) =>
      like.user.equals(userID)
    );

    if (likeIndex === -1) {
      // L'utilisateur n'a pas encore aimé cet animal, ajouter un like
      animal.likes.push({ user: userID, date: new Date() });
      await animal.save();

      // Vérifier si cet animal a également aimé l'utilisateur, si oui, créer une rencontre
      const userLikes = await User.findById(userID);
      if (userLikes && userLikes.animals) {
        const userLikedBack = userLikes.animals.find(
          (userAnimal) =>
            userAnimal.likes &&
            userAnimal.likes.some((like) => like.user.equals(animalID))
        );

        if (userLikedBack) {
          // Créez la rencontre ici en utilisant le modèle Meeting
          const newMeeting = new Meeting({
            owner: userID,
            animal1: animalID,
            animal2: userLikedBack._id,
            date: new Date(),
            location: "Lieu de la rencontre",
            description: "Description de la rencontre",
          });

          const savedMeeting = await newMeeting.save();
        }
      }

      res.status(200).json({ message: "Liked" });
    } else {
      // L'utilisateur a déjà aimé cet animal, retirer le like
      animal.likes.splice(likeIndex, 1);
      await animal.save();

      res.status(200).json({ message: "Unliked" });
    }
  } catch (error) {
    next(error);
  }
});

// affiche la liste des rencontres
router.get("/", authenticate, async (req, res, next) => {
  const userID = req.params.userID;

  try {
    const meetings = await Meeting.find({ owner: userID }).populate(
      "animal1 animal2"
    );

    res.status(200).json(meetings);
  } catch (error) {
    next(error);
  }
});

export default router;
