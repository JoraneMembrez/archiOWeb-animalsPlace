import express from "express";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import { authenticate } from "./auth.js";

const router = express.Router();

router.get("/", async function (req, res, next) {
  try {
    const animals = await Animal.find()
      .populate("name") // Remplacez "genres" par les références appropriées de votre modèle
      .populate("owner") // Remplacez "moviePeople" par les références appropriées de votre modèle
      .exec();

    res.send(animals);
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    // Recherche de l'utilisateur par ID
    const user = await User.findById(req.currentUserId);

    if (!user) {
      // L'utilisateur n'existe pas, renvoyez une erreur
      const error = new Error("L'utilisateur n'existe pas");
      error.status = 404;
      throw error;
    }

    // Création d'un nouvel animal et association à l'utilisateur
    const newAnimal = new Animal(req.body);
    newAnimal.owner = user._id; // Associer l'animal à l'utilisateur
    const savedAnimal = await newAnimal.save();

    // Ajouter l'animal à la liste d'animaux de l'utilisateur
    user.animals.push(savedAnimal._id);
    await user.save();

    res.status(201).json(savedAnimal); // Réponse 201 pour la création réussie
    broadcastMessage({
      message:
        "Il y a un nouvel animal sur Animals Place, venez faire sa rencontre !",
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:animalId", authenticate, async (req, res, next) => {
  try {
    // Recherche de l'animal par ID
    const animal = await Animal.findById(req.params.animalId);

    if (!animal) {
      // L'animal n'existe pas, renvoyez une erreur
      const error = new Error("L'animal n'existe pas");
      error.status = 404;
      throw error;
    }

    // Vérifiez si l'utilisateur connecté est le propriétaire de l'animal
    if (animal.owner.toString() !== req.currentUserId) {
      // L'utilisateur n'est pas autorisé à supprimer cet animal
      const error = new Error(
        "Vous n'êtes pas autorisé à supprimer cet animal"
      );
      error.status = 403;
      throw error;
    }

    // Supprimer l'animal de la base de données
    await animal.remove();

    // Retirez également l'animal de la liste d'animaux de l'utilisateur
    const user = await User.findById(req.currentUserId);
    user.animals.pull(animal._id);
    await user.save();

    res.status(204).send(); // Réponse 204 pour la suppression réussie
  } catch (err) {
    next(err);
  }
});

export default router;
