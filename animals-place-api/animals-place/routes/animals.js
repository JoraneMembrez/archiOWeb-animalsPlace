import express from "express";
import Animal from "../models/animal.js";

const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    const animals = await Animal.find()
      .populate("genres") // Remplacez "genres" par les références appropriées de votre modèle
      .populate("moviePeople") // Remplacez "moviePeople" par les références appropriées de votre modèle
      .exec();

    res.send(animals);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    // Recherche de l'utilisateur par email
    const existingAnimal = await Animal.findOne({ _id: req.body.id });

    if (existingAnimal) {
      // L'animal existe déjà
      const error = new Error("L'animal est déjà créé");
      error.status = 406;
      throw error;
    } else {
      // Création d'un nouvel animal
      const newAnimal = new Animal(req.body);
      const savedAnimal = await newAnimal.save();

      res.status(201).json(savedAnimal); // Réponse 201 pour la création réussie
      broadcastMessage({
        message: "Il y a un nouvel utilisateur sur Animals Place!",
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
