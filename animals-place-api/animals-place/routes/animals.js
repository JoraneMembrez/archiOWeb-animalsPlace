import express from "express";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import Meeting from "../models/meeting.js";
import { authenticate } from "./auth.js";
import { broadcastMessage } from "../ws.js";
import Image from "../models/image.js";
import fs from "fs";
import path from "path";
import multer from "multer";
import mongoose from "mongoose";

const router = express.Router();

// on peut voir tous les animaux sauf les notres ou ceux des autres utilisateurs
router.get("/", authenticate, async function (req, res, next) {
  try {
    const species_filter = req.query.species;
    const mesAnimaux_filter = req.query.owner;
    let animals_db = Animal;

    if (species_filter) {
      animals_db = animals_db.find({ species: species_filter });
    }

    const userID = req.currentUserId;

    if (mesAnimaux_filter === "true") {
      animals_db = animals_db.find({ owner: userID });
    } else {
      animals_db = animals_db.find({ owner: { $ne: userID } });
    }

    if (mesAnimaux_filter === "true" && species_filter) {
      animals_db = animals_db.find({ owner: userID, species: species_filter });
      animals_db = animals_db.find({ owner: userID });
    }
    // requête de recherche pour récupérer tous les animaux dont le propriétaire n'est pas l'utilisateur connecté 🙋
    const animals = await animals_db.populate("name").populate("owner").exec();

    res.send(animals);
  } catch (err) {
    next(err);
  }
});

// compte le nombre d'animal de chaque espèces qu'il y a sur la plateforme 🔢
router.get("/count", authenticate, async function (req, res, next) {
  try {
    const userID = req.currentUserId;
    const count = await Animal.aggregate([
      {
        $match: {
          owner: { $ne: userID },
        },
      },
      {
        $group: {
          _id: "$species",
          count: { $sum: 1 },
        },
      },
    ]);

    res.send(count);
  } catch (err) {
    next(err);
  }
});

const nameRegex = /^[a-zA-Z\-']{2,50}$/;
// création d'un nouvel animal 🐒
router.post("/", authenticate, async (req, res, next) => {
  try {
    // Recherche de l'utilisateur par ID
    const user = await User.findById(req.currentUserId);
    // const newPictures = req.body.picturesURL;
    const species = req.body.species;
    const name = req.body.name;

    if (!user) {
      // L'utilisateur n'existe pas, renvoyez une erreur
      const error = new Error(`L'utilisateur avec l'ID ${user} n'existe pas`);
      error.status = 404;
      throw error;
    }

    if (!species) {
      const error = new Error("Le champ species (espèce) est requis");
      error.status = 400;
      throw error;
    }

    if (
      species !== "chien" &&
      species !== "chat" &&
      species !== "lapin" &&
      species !== "cheval"
    ) {
      const error = new Error(
        "Le champ species (espèce) doit être une des suivantes : chien, chat, lapin, cheval"
      );
      error.status = 400;
      throw error;
    }

    if (!name) {
      const error = new Error("Le champ name est requis");
      error.status = 400;
      throw error;
    }

    // Vérifier que le nom de l'animal est valide
    const isValidName = nameRegex.test(name);
    if (!isValidName) {
      const error = new Error(
        "Le nom de l'animal doit contenir entre 2 et 50 lettres alphabétiques, tirets et apostrophes autorisés"
      );
      error.status = 400;
      throw error;
    }

    // vérifier que le nom de l'animal n'est pas déjà utilisé dans ses autres animaux
    const animals = await Animal.find({ owner: req.currentUserId });
    const animalName = req.body.name;
    const animalNameAlreadyUsed = animals.find(
      (animal) => animal.name === animalName
    );
    if (animalNameAlreadyUsed) {
      const error = new Error(
        `Vous avez déjà un animal avec le nom ${animalName}, veuillez en choisir un autre`
      );
      error.status = 409;
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

// supprimer un animal 🐒
router.delete("/:animalId", authenticate, async (req, res, next) => {
  try {
    const animalId = req.params.animalId;

    //vérifier que l'ID est valide
    const validId = mongoose.Types.ObjectId.isValid(animalId);
    if (!validId) {
      const error = new Error(`L'ID ${animalId} n'est pas valide`);
      error.status = 400;
      throw error;
    }

    const deletedAnimal = await Animal.findById(animalId);

    if (!deletedAnimal) {
      const error = new Error(`L'animal avec l'ID ${animalId} n'existe pas`);
      error.status = 404;
      throw error;
    }

    // Vérifier si l'utilisateur est le propriétaire de l'animal
    if (deletedAnimal.owner.toString() !== req.currentUserId) {
      const error = new Error(
        `Vous n'êtes pas autorisé à supprimer cet animal`
      );
      error.status = 403;
      throw error;
    }

    // Supprimer l'animal de la liste d'animaux de l'utilisateur
    const user = await User.findById(req.currentUserId);
    user.animals.pull(deletedAnimal._id);
    // Trouver si l'animal avait des meetings et les supprimer
    const meetings = await Meeting.find({
      $or: [{ animal1: deletedAnimal._id }, { animal2: deletedAnimal._id }],
    });
    meetings.forEach(async (meeting) => {
      await Meeting.findByIdAndDelete(meeting._id);
    });

    await deletedAnimal.deleteOne(); // Supprimer l'animal de la base de données
    await user.save();
    return res.status(204).json();
  } catch (error) {
    next(error);
  }
});

router.patch("/:animalId", authenticate, async (req, res, next) => {
  try {
    const animalId = req.params.animalId;
    const updates = req.body; // Les données de mise à jour de l'animal

    const animal = await Animal.findById(animalId);

    if (!animal) {
      res
        .status(404)
        .json({ message: `Animal avec l'ID ${animalId} pas trouvé` });
      return;
    }

    if (animal.owner.toString() !== req.currentUserId.toString()) {
      res.status(403).json({
        message: "Vous n'avez pas la permission de modifier cet animal",
      });
      return;
    }

    // ce qu'on a le droit de modifier 🚫 :
    const allowUpdates = {
      name: updates.name,
      profilePictureURL: updates.profilePictureURL,
      favoriteActivities: updates.favoriteActivities,
      location: updates.location,
    };

    if (!allowUpdates.name) {
      allowUpdates.name = animal.name;
    }

    const disallowedUpdates = Object.keys(updates).filter(
      (key) => !allowUpdates[key]
    );

    console.log(disallowedUpdates);

    Object.assign(animal, allowUpdates);

    console.log("animal", animal);
    const updatedAnimal = await animal.save();

    console.log("updatedAnimal", updatedAnimal);
    res.status(200).json(updatedAnimal); // Réponse avec l'animal mis à jour
  } catch (error) {
    next(error);
  }
});

// ajouter une image dans le tableau des images des animaux
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); // Répertoire de stockage des images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Nom du fichier
  },
});

const upload = multer({ storage: storage });

router.post(
  "/:animalId/images",
  authenticate,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const animalId = req.params.animalId;
      const animal = await Animal.findById(animalId);

      if (!animal) {
        res
          .status(404)
          .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
        return;
      }

      if (animal.owner.toString() !== req.currentUserId.toString()) {
        res.status(403).json({
          message: "Vous n'avez pas la permission de modifier cet animal",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: `Veuillez télécharger une image` });
        return;
      }

      const imageBuffer = fs.readFileSync(req.file.path);

      const newImage = new Image({
        owner: animalId,
        image: {
          data: imageBuffer,
          contentType: req.file.mimetype,
        },
      });

      await newImage.save(); // Enregistrement de l'image

      // Ajout de l'URL de l'image à l'animal
      animal.picturesURL.push(req.file.path); // Vous pouvez ajuster cela en fonction de la logique que vous souhaitez

      await animal.save(); // Enregistrement des modifications de l'animal

      res.status(201).json({ message: `Image ajoutée avec succès` }); // Répond avec succès
    } catch (error) {
      next(error);
    }
  }
);
// supprimer une image dans le tableau des images des animaux
router.delete(
  "/:animalId/:imageId/images",
  authenticate,
  async (req, res, next) => {
    try {
      const animalId = req.params.animalId;
      const imageId = req.params.imageId;

      const animal = await Animal.findById(animalId);
      if (!animal) {
        res
          .status(404)
          .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
        return;
      }

      if (animal.owner.toString() !== req.currentUserId.toString()) {
        res.status(403).json({
          message: "Vous n'avez pas la permission de modifier cet animal",
        });
        return;
      }

      const image = await Image.findById(imageId);

      if (!image) {
        res
          .status(404)
          .json({ message: `Image avec l'ID ${imageId} n'existe pas` });
        return;
      }

      const imageIndex = animal.picturesURL.indexOf(image.imageURL);

      if (imageIndex > -1) {
        animal.picturesURL.splice(imageIndex, 1);
      }

      image.deleteOne(); // Supprimer l'image de la base de données

      await animal.save(); // Enregistrer les modifications de l'animal

      res.status(204);
    } catch (error) {
      next(error);
    }
  }
);

// récupérer une image dans le tableau des images des animaux
router.get("/:animalId/images", authenticate, async (req, res, next) => {
  try {
    const animalId = req.params.animalId;
    const animal = await Animal.findById(animalId);

    if (!animal) {
      res
        .status(404)
        .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
      return;
    }

    if (animal.owner.toString() !== req.currentUserId.toString()) {
      res.status(403).json({
        message: "Vous n'avez pas la permission de modifier cet animal",
      });
      return;
    }

    const images = await Image.find({ owner: animalId });

    res.status(200).json(images);
  } catch (error) {
    next(error);
  }
});

// clic sur une personne pour voir son profil
router.get("/:animalId/:meetingID", authenticate, async (req, res, next) => {
  try {
    const animalId = req.params.animalId;
    const meetingID = req.params.meetingID;
    const animal = await Animal.findById(animalId);

    if (!animal) {
      res
        .status(404)
        .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
      return;
    }

    // recoit l'id du meeting
    const meetingId = req.query.meetingId;
    // si l'id du meeting est présent dans l'url

    broadcastMessage({
      message: "Heyy, j'aime beaucoup ton animal, et si on se rencontrait ?",
    });

    res.status(201).json(animal);
  } catch (error) {
    next(error);
  }
});

export default router;
