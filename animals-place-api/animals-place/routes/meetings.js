import express from "express";
import User from "../models/user.js";
import Animal from "../models/animal.js";
import Meeting from "../models/meeting.js";
import { authenticate, authorize } from "./auth.js";
import mongoose from "mongoose";
import { sendMessageToConnectedClient } from "../ws.js";

const router = express.Router();

router.post("/like/:animalID", authenticate, async (req, res, next) => {
  const animalID_liked = req.params.animalID; // ID de l'animal aimé
  const userID = req.currentUserId; // ID de l'utilisateur
  const animalID_liking = req.body.animalUserID; // ID de l'animal qui like

  if (
    !mongoose.Types.ObjectId.isValid(animalID_liked) ||
    !mongoose.Types.ObjectId.isValid(userID) ||
    !mongoose.Types.ObjectId.isValid(animalID_liking)
  ) {
    res.status(400).json({ message: "ID non valide" });
    return;
  }

  try {
    const animal_liked = await Animal.findById(animalID_liked);
    const animal_liking = await Animal.findById(animalID_liking);

    const owner_animal_liked = await User.findById(animal_liked.owner);
    const owner_animal_liking = await User.findById(animal_liking.owner);

    if (
      owner_animal_liked._id.toString() === owner_animal_liking._id.toString()
    ) {
      res
        .status(400)
        .json({ message: "Vous ne pouvez pas liker votre propre animal" });
      return;
    }

    if (!animal_liked) {
      res.status(404).json({
        message: `L'animal avec l'ID ${animalID_liked} que vous souhaitez aimer n'existe pas`,
      });
      return;
    }

    if (!animal_liking) {
      res.status(404).json({
        message: `Votre animal avec l'ID ${animalID_liking} n'existe pas`,
      });
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
        res.status(201).json({ message: "Un nouveau match !" });
      } else {
        const targetClient = animal_liked.owner._id.toString();
        const targetMessage = "Un nouveau like !";
        // envoie un message a la personne qui a été liké
        sendMessageToConnectedClient(targetClient, targetMessage);
        res.status(201).json({ message: "Vous avez aimé un animal" });
      }
    } else {
      res.status(201).json({ message: "L'animal est déjà aimé" });
    }
  } catch (error) {
    next(error);
  }
});
/*
router.post("/unlike/:animalID", authenticate, async (req, res, next) => {
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
  } */

// affiche la liste des rencontres qu'uniquement un admin peut voir
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

// afficher le nombre de rencontre d'un utilisateur 🤝
router.get("/count", authenticate, async (req, res, next) => {
  try {
    const userID = req.currentUserId;

    // recherche les match dans le model des animaux du user
    const animals = await Animal.find({ owner: userID }).populate("matches");
    // console.log(animals);
    // compte le nombre de match obtenu
    let count = 0;
    animals.forEach((animal) => {
      count += animal.matches.length;
    });
    res.status(200).json(`Vous avez acutellement : ${count}  matchs`);
  } catch (error) {
    next(error);
  }
});

// afficher les rencontres d'un utilisateur 🤝
router.get("/users", authenticate, async (req, res, next) => {
  try {
    const userID = req.currentUserId;

    const meetings = await Meeting.find({ owner: userID }).populate(
      "animal1 animal2"
    );

    res.status(200).json(meetings);
  } catch (error) {
    next(error);
  }
});

//supprimer une rencontre
router.delete("/:meetingID", authenticate, async (req, res, next) => {
  try {
    const meetingID = req.params.meetingID;
    const userID = req.currentUserId;

    const deletedMeeting = await Meeting.findById(meetingID);
    if (!deletedMeeting) {
      res
        .status(404)
        .json({ message: `Le rencontre avec l'ID ${meetingID} n'existe pas` });
      return;
    }

    const animal1 = await Animal.findById(deletedMeeting.animal1);
    const animal2 = await Animal.findById(deletedMeeting.animal2);

    const user1 = animal1.owner.toString();
    const user2 = animal2.owner.toString();

    const isAdmin = req.currentUserRole === "admin";
    const isOwner = user1 === userID || user2 === userID;

    if (!(isAdmin || isOwner)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    await Meeting.deleteOne({ _id: deletedMeeting });

    const deletedMeetingId = new ObjectId(deletedMeeting._id);

    animal1.matches.pull(deletedMeetingId);
    animal2.matches.pull(deletedMeetingId);
    await animal1.save();
    await animal2.save();
    res.status(204).json();
  } catch (error) {
    next(error);
  }
});

export default router;
