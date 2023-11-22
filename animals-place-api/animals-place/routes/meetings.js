import express from "express";
import User from "../models/user.js";
import Animal from "../models/animal.js";
import Meeting from "../models/meeting.js";
import { authenticate, authorize } from "./auth.js";
import animal from "../models/animal.js";
import mongoose from "mongoose";
import { broadcastMessage, sendMessageToConnectedClient } from "../ws.js";

const router = express.Router();

router.post("/like/:animalID", authenticate, async (req, res, next) => {
  const animalID_liked = req.params.animalID; // ID de l'animal aimé
  const userID = req.body.userID; // ID de l'utilisateur
  const animalID_liking = req.body.animalUserID; // ID de l'animal qui like

  if (
    !mongoose.Types.ObjectId.isValid(animalID_liked) ||
    !mongoose.Types.ObjectId.isValid(userID) ||
    !mongoose.Types.ObjectId.isValid(animalID_liking)
  ) {
    res.status(400).json({ message: "Invalid ID format" });
    return;
  }

  try {
    const animal_liked = await Animal.findById(animalID_liked);
    const animal_liking = await Animal.findById(animalID_liking);

    if (!animal_liked) {
      res.status(404).json({ message: "Animal not found" });
      return;
    }

    if (!animal_liking) {
      res.status(404).json({ message: "Animal user not found" });
      return;
    }

    // Vérifier si l'utilisateur a déjà aimé cet animal, si non, ajouter un like
    const likeIndex = animal_liking.animals_liked.findIndex((like) =>
      like.animal.equals(animalID_liked)
    );

    if (likeIndex === -1) {
      // L'utilisateur n'a pas encore aimé cet animal, ajouter un like

      animal_liking.animals_liked.push({
        animal: animal_liked,
        date: new Date(),
      });

      await animal_liking.save();

      // Vérifier si cet animal a également aimé l'utilisateur, si oui, créer une rencontre

      const likebackIndex = animal_liked.animals_liked.findIndex(
        (like_of_other_animal) =>
          like_of_other_animal.animal.equals(animal_liking._id)
      );

      if (likebackIndex !== -1) {
        // Créez la rencontre ici en utilisant le modèle Meeting
        const newMeeting = new Meeting({
          owner: userID,
          animal1: animalID_liked,
          animal2: animalID_liking,
          date: new Date(),
          location: "Lieu de la rencontre",
          description: "Description de la rencontre",
        });
        const client1 = animal_liking.owner._id.toString();
        const client2 = animal_liked.owner._id.toString();
        // ajouter dans les deux animaux sous matches l'id de l'autre animal
        animal_liking.matches.push(animal_liked);
        animal_liked.matches.push(animal_liking);

        await animal_liking.save();
        await animal_liked.save();

        const targetMessage = "Un nouveau Match !";
        // il faut pousser dnas le tableau des matched de l'animal en question        // envoie un message aux 2 personnes ayant matché

        sendMessageToConnectedClient(client1, targetMessage);
        sendMessageToConnectedClient(client2, targetMessage);
        const savedMeeting = await newMeeting.save();
        res.status(200).json({ message: "Matched" });
      } else {
        const targetClient = animal_liked.owner._id.toString();
        const targetMessage = "Un nouveau like !";
        // envoie un message a la personne qui a été liké
        sendMessageToConnectedClient(targetClient, targetMessage);
        console.log("on passe au like ???");
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
router.get("/", [authenticate, authorize("admin")], async (req, res, next) => {
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
