import express from "express";
import User from "../models/user.js";
import Animal from "../models/animal.js";
import Meeting from "../models/meeting.js";
import { authenticate } from "./auth.js";
import animal from "../models/animal.js";
import mongoose from "mongoose";
import { broadcastMessage, sendMessageToConnectedClient } from "../ws.js";

const router = express.Router();

router.post("/like/:animalID", authenticate, async (req, res, next) => {
  const animalID = req.params.animalID; // ID de l'animal aimé
  const userID = req.body.userID; // ID de l'utilisateur
  const animalUserID = req.body.animalUserID; // ID de l'utilisateur de l'animal aimé

  if (
    !mongoose.Types.ObjectId.isValid(animalID) ||
    !mongoose.Types.ObjectId.isValid(userID) ||
    !mongoose.Types.ObjectId.isValid(animalUserID)
  ) {
    res.status(400).json({ message: "Invalid ID format" });
    return;
  }

  try {
    const animal_liked = await Animal.findById(animalID);
    const animal_user = await Animal.findById(animalUserID);

    if (!animal_liked) {
      res.status(404).json({ message: "Animal not found" });
      return;
    }

    if (!animal_user) {
      res.status(404).json({ message: "Animal user not found" });
      return;
    }

    // Vérifier si l'utilisateur a déjà aimé cet animal, si non, ajouter un like
    const likeIndex = animal_user.animals_liked.findIndex((like) =>
      like.animal.equals(animalID)
    );

    if (likeIndex === -1) {
      // L'utilisateur n'a pas encore aimé cet animal, ajouter un like

      animal_user.animals_liked.push({
        animal: animal_liked,
        date: new Date(),
      });

      await animal_user.save();

      // Vérifier si cet animal a également aimé l'utilisateur, si oui, créer une rencontre

      const likebackIndex = animal_liked.animals_liked.findIndex(
        (like_of_other_animal) =>
          like_of_other_animal.animal.equals(animal_user._id)
      );

      if (likebackIndex !== -1) {
        // Créez la rencontre ici en utilisant le modèle Meeting
        const newMeeting = new Meeting({
          owner: userID,
          animal1: animalID,
          animal2: animal_user._id,
          date: new Date(),
          location: "Lieu de la rencontre",
          description: "Description de la rencontre",
        });

        const savedMeeting = await newMeeting.save();
        res.status(200).json({ message: "Matched" });
        broadcastMessage({ message: "Un nouveau match sur Animal Place !" });
      } else {
        const targetClient = animal_user;
        const targetMessage = "Un nouveau like !";
        // envoie un message a la personne qui a été liké
        sendMessageToConnectedClient(targetClient, targetMessage);
        res.status(200).json({ message: "Liked" });
      }
    } else {
      res.status(200).json({ message: "Already liked" });
    }
  } catch (error) {
    next(error);
  }
});

// affiche la liste des rencontres
router.get("/", authenticate, async (req, res, next) => {
  const userID = req.currentUserId;

  try {
    const meetings = await Meeting.find({ owner: userID }).populate(
      "animal1 animal2"
    );

    res.status(200).json(meetings);
  } catch (error) {
    next(error);
  }
});

// afficher le nombre de rencontre d'un utilisateur
// A VERIFIER
router.get("/count", authenticate, async (req, res, next) => {
  const userID = req.currentUserId;

  try {
    let total = await Meeting.aggregate([
      {
        $match: {
          owner: userID,
        },
      },
      {
        $count: "total",
      },
    ]);
    console.log(total);
    res.status(200).json(total);
  } catch (error) {
    next(error);
  }
});

// supprimer une rencontre
router.delete("/:meetingID", authenticate, async (req, res, next) => {
  const meetingID = req.params.meetingID;

  try {
    const deletedMeeting = await Meeting.deleteOne({ _id: meetingID });

    if (deletedMeeting.deletedCount === 1) {
      res.status(200).json({ message: "Meeting deleted" });
    } else {
      res.status(404).json({ message: "Meeting not found" });
    }
    console.log(deletedMeeting);
  } catch (error) {
    // Gérer les erreurs ici
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
