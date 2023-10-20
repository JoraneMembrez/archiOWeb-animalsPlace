import express from "express";
// hacahge de mot de passe
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import User from "../models/user.js";

const router = express.Router();

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

      res.status(201).json(savedUser); // Réponse 201 pour la création réussie
      broadcastMessage({
        message: "Il y a un nouvel utilisateur sur Animals Place!",
      });
    }
  } catch (err) {
    next(err);
  }
});

/*
router.delete(
  "/:userID",
  idValidation,
  authenticate,
  authorize("admin"),
  function (req, res, next) {
    User.deleteOne({ _id: req.params.userID }, function (err, user) {
      if (err) {
        return next(err);
      }
      res.send("User deleted");
    });
  }
); */

// export default router;
export default router;
