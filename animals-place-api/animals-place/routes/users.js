import express from "express";
// hacahge de mot de passe
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import User from "../models/user.js";
import { authenticate, authorize } from "./auth.js";
import { idValidation } from "../utils.js";
import { broadcastMessage } from "../ws.js";
import Meeting from "../models/meeting.js";
import Animal from "../models/animal.js";

const router = express.Router();

// liste paginée on peut voir 5 utilisateurs par page uniquement si on est admin, on n'a pas le droit de voir les profils de tout le monde
router.get(
  "/",
  authenticate,
  authorize("admin"),
  async function (req, res, next) {
    let page = parseInt(req.query.page) || 1; // Récupère le numéro de page ou la page 1 par défaut
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let pageSize = parseInt(req.query.pageSize, 10); // Nombre d'utilisateurs par page
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      pageSize = 5; // Par défaut, 5 utilisateurs par page
    }

    try {
      const totalUsers = await User.countDocuments();
      const totalPages = Math.ceil(totalUsers / pageSize);

      const users = await User.find()
        .collation({ locale: "en", strength: 2 }) // Utilisé pour ignorer les majuscules
        .sort({ name: 1 })
        .skip((page - 1) * pageSize) // Ignorer les résultats des pages précédentes
        .limit(pageSize) // Limiter le nombre de résultats par page
        .exec();

      res.send({
        users,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/who", authenticate, async function (req, res, next) {
  try {
    const authenticatedUserId = req.currentUserId;
    const user = await User.findById(authenticatedUserId);
    res.send(user);
  } catch (err) {
    next(err);
  }
});

// afficher les utilisateurs avec qui ont a matché ❤️
router.get("/matchedUsers", authenticate, async function (req, res, next) {
  try {
    const authenticatedUserId = req.currentUserId;

    // récupérer les animaux 🐒 du user connecté
    const animals = await Animal.find({ owner: authenticatedUserId });
    console.log("animals ! 🐒 ", animals);
    // récupérer les matchs de chacun de nos animaux
    let owners_of_matched_animals = new Set();

    await Promise.all(
      animals.map(async (animal) => {
        const matches = animal.matches;
        await Promise.all(
          matches.map(async (match) => {
            // récupérer l'animal qui a matché avec notre animal
            let our_lover = await Animal.findById(match);
            // récupérer le propriétaire de l'animal qui a matché avec notre animal
            let owner_of_our_lover = await User.findById(our_lover.owner);
            owners_of_matched_animals.add(owner_of_our_lover);
          })
        );
      })
    );

    // récupérer les utilisateurs qui ont matché avec nos animaux
    const matched_users = await User.find({
      _id: { $in: Array.from(owners_of_matched_animals) },
    });

    // Récupérer les détails des utilisateurs rencontrés
    res.send(matched_users);
  } catch (err) {
    next(err);
  }
});

// les administrateurs peuvent voir des utilisateurs spécifiques, un utilisateur peut uniquement voir son profil
router.get("/:userID", authenticate, async (req, res, next) => {
  try {
    const authenticatedUserId = req.currentUserId;
    const requestedUserId = req.params.userID;

    const user = await User.findById(requestedUserId);
    const userLog = await User.findById(authenticatedUserId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isAdmin = userLog.role === "admin";

    // Vérifier si l'utilisateur actuel est l'utilisateur dont on affiche le profil
    const isRequestedUser = authenticatedUserId === requestedUserId;

    if (isAdmin || isRequestedUser) {
      res.send(user);
    } else {
      res.status(403).json({ message: "Forbidden" });
    }
  } catch (err) {
    next(err);
  }
});

// lorsqu'on est un utilisateur on peut uniquement voir

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
        message: "Il y a un nouvel utilisateur sur Animals Place !",
      });
    }
  } catch (err) {
    next(err);
  }
});

// Modifier un utilisateur on peut tous les modifier si on est Admin ou étant un utilisateur on peut uniquement se modifier nous-même
router.post(
  "/:userID",
  [idValidation, authenticate],
  async (req, res, next) => {
    try {
      const authenticatedUserID = req.currentUserId;
      const requestedUserID = req.params.userID;
      const updates = req.body; // Les données de mise à jour de l'utilisateur

      console.log(authenticatedUserID);
      console.log(requestedUserID);

      // Vérifiez si l'utilisateur avec l'ID spécifié existe
      const userToUpdate = await User.findById(requestedUserID);
      const userLog = await User.findById(authenticatedUserID);

      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }

      if (userLog.role === "admin") {
        Object.assign(userToUpdate, updates);
        const updatedUser = await userToUpdate.save();
        return res.status(200).json(updatedUser);
      } else if (authenticatedUserID === requestedUserID) {
        const allowedUpdates = [
          "firstName",
          "lastName",
          "email",
          "password",
          "address",
        ]; // champs que le user à le droit de modifier lui-même
        Object.keys(updates).forEach((update) => {
          if (allowedUpdates.includes(update)) {
            userToUpdate[update] = updates[update];
          }
        });
        const updatedUser = await userToUpdate.save();
        return res.status(200).json(updatedUser);
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
    } catch (error) {
      next(error);
    }
  }
);

//supprimer un utilisateur si admin tout le monde et sinon si c'est l'utilisateur connecté
router.delete("/:userID", [idValidation, authenticate], async (req, res) => {
  const authenticatedUserID = req.currentUserId;
  const requestedUserID = req.params.userID;

  const user = await User.findById(authenticatedUserID);

  try {
    const userToDelete = await User.findById(requestedUserID);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }
    // vérification si l'utilisateur connecté est un administrateur
    if (user.role === "admin") {
      await User.deleteOne({ _id: requestedUserID });
      return res.status(200).json({ message: "User deleted" });
    } else if (authenticatedUserID === requestedUserID) {
      // Si l'utilisateur connecté est celui demandant la suppression
      await User.deleteOne({ _id: requestedUserID });
      return res.status(200).json({ message: "User deleted" });
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// export default router;
export default router;
