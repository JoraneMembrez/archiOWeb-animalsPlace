import express from "express";
import User from "../models/user.js";
import Animal from "../models/animal.js";
import Meeting from "../models/meeting.js";
import Chat from "../models/chat.js";
import { authenticate } from "./auth.js";
import animal from "../models/animal.js";

const router = express.Router();

router.post("/like/:animalID", authenticate, async (req, res, next) => {
  const animalID = req.params.animalID; // ID de l'animal aimé
  const userID = req.body.userID; // ID de l'utilisateur
  const animalUserID = req.body.animalUserID; // ID de l'utilisateur de l'animal aimé

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

        // création d'un nouveau chat
        console.log("userID", userID);
        console.log("animalUserID", animalUserID);
        console.log("animal_user", animal_user);
        console.log("animal_user", animal_user);

        const newChat = new Chat({
          user1: userID,
          user2: animalUserID,
          animal1: animalID,
          animal2: animal_user._id,
        });
        newChat
          .save()
          .then((chat) => {
            console.log("Nouveau chat créé :", chat);
          })
          .catch((error) => {
            console.error("Erreur lors de la création du chat :", error);
          });

        const savedMeeting = await newMeeting.save();
        res.status(200).json({ message: "Matched" });
      } else {
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
