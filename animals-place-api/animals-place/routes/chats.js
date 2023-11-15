import express from "express";
import Message from "../models/message.js";
import User from "../models/user.js";
import Chat from "../models/chat.js";
import Animal from "../models/animal.js";
import { authenticate } from "./auth.js";
import * as config from "../config.js";
import { Socket } from "socket.io";

const router = express.Router();

// Créer un message
router.get("/", authenticate, async (req, res, next) => {
  try {
    // Récupérez l'ID de l'utilisateur connecté à partir des données d'authentification ou de la session
    const userID = req.currentUserId;

    // Requête de recherche pour récupérer tous les chats où l'utilisateur est membre (user1 ou user2)
    const chats = await Chat.find({
      $or: [{ user1: userID }, { user2: userID }],
    })
      .populate("animal1")
      .populate("animal2")
      .exec();

    res.send(chats);
  } catch (err) {
    next(err);
  }
});

export default router;
