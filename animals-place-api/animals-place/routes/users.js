import express from "express";
// hacahge de mot de passe
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import User from "../models/user.js";
import { authenticate, authorize } from "./auth.js";
import { idValidation } from "../utils.js";
import { broadcastMessage } from "../ws.js";

const router = express.Router();

// REVOIR
router.get("/", function (req, res, next) {
  User.find()
    .sort("name")
    .exec()
    .then((users) => {
      res.send(users);
    })
    .catch((err) => {
      next(err);
    });
});

// on peut chercher tous les utilisateurs uniquement si on est admin
router.get("/all", authenticate, authorize("admin"), function (req, res, next) {
  User.find()
    .sort("name")
    .exec()
    .then((users) => {
      res.send(users);
    });
});

router.get("/:userID", authenticate, idValidation, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userID);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.send(user);
  } catch (err) {
    next(err);
  }
});

// Créer un utilisateur
router.post("/", async (req, res, next) => {
  try {
    const plainPassword = req.body.password;
    const costFactor = 10;

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(plainPassword, costFactor);

    // Recherche de l'utilisateur par email
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      // L'utilisateur existe déjà
      const error = new Error("La ressource existe déjà");
      error.status = 406;
      throw error;
    } else {
      // Création d'un nouvel utilisateur
      const newUser = new User(req.body);
      newUser.password = hashedPassword;
      const savedUser = await newUser.save();

      res.status(201).json(savedUser); // Réponse 201 pour la création réussie -> revoir le broadcast
      broadcastMessage({
        message: "Il y a un nouvel utilisateur sur cinemate !",
      });
    }
  } catch (err) {
    next(err);
  }
});

// Modifier un utilisateur
router.post(
  "/:userID",
  [idValidation, authenticate, authorize("admin")],
  async (req, res, next) => {
    try {
      const userId = req.params.userID;
      const updates = req.body; // Les données de mise à jour de l'utilisateur

      // Vérifiez si l'utilisateur avec l'ID spécifié existe
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Mettez à jour les informations de l'utilisateur
      // Par exemple, vous pouvez utiliser la méthode `Object.assign` pour fusionner les données mises à jour avec les données existantes de l'utilisateur.
      Object.assign(user, updates);

      // Enregistrez les modifications dans la base de données
      const updatedUser = await user.save();

      res.status(200).json(updatedUser); // Réponse avec l'utilisateur mis à jour
    } catch (error) {
      next(error);
    }
  }
);

//supprimer l'utilisateur
router.delete(
  "/:userID",
  [idValidation, authenticate, authorize("admin")],
  async (req, res) => {
    try {
      const deletedUser = await User.deleteOne({ _id: req.params.userID });

      if (deletedUser.deletedCount === 1) {
        res.status(200).json({ message: "User deleted" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      // Gérer les erreurs ici
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// export default router;
export default router;
