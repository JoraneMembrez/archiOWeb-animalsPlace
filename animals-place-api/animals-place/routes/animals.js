import express from "express";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import Meeting from "../models/meeting.js";
import { authenticate } from "./auth.js";
import { broadcastMessage } from "../ws.js";
import swaggerJSDoc from "swagger-jsdoc";

const router = express.Router();

// on peut voir tous les animaux sauf les notres
router.get("/", authenticate, async function (req, res, next) {
  try {
    const species_filter = req.query.species;
    //  console.log(species_filter);
    let animals_db = Animal;

    if (species_filter) {
      animals_db = animals_db.find({ species: species_filter });
    }
    // Récupérez l'ID de l'utilisateur connecté à partir des données d'authentification ou de la session
    const userID = req.currentUserId;

    // requête de recherche pour récupérer tous les animaux dont le propriétaire n'est pas l'utilisateur connecté 🙋
    const animals = await animals_db
      .find({
        owner: { $ne: userID },
      })
      .populate("name")
      .populate("owner")
      .exec();

    res.send(animals);
  } catch (err) {
    res.status(401).json();
  }
});

// on peut voir tous ses animaux 🐒
router.get("/myAnimals", authenticate, async function (req, res, next) {
  try {
    const userID = req.currentUserId;

    // Requête pour récupérer tous les animaux dont le propriétaire est l'utilisateur actuel, triés par ordre alphabétique du nom
    const animals = await Animal.find({ owner: userID })
      .collation({ locale: "en", strength: 2 }) // Utiliser pour ignorer les majuscules
      .sort({ name: 1 })
      .exec();

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

// création d'un nouvel animal 🐒
router.post("/", authenticate, async (req, res, next) => {
  try {
    // Recherche de l'utilisateur par ID
    const user = await User.findById(req.currentUserId);
    const newPictures = req.body.picturesURL;

    if (!user) {
      // L'utilisateur n'existe pas, renvoyez une erreur
      const error = new Error(`L'utilisateur avec l'ID ${user} n'existe pas`);
      error.status = 404;
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
    const deletedAnimal = await Animal.findOneAndDelete({
      _id: animalId,
      owner: req.currentUserId, // Assurez-vous que seul le propriétaire peut supprimer
    });

    if (!deletedAnimal) {
      const error = new Error(`L'animal avec l'ID ${animalId} n'existe pas`);
      error.status = 404;
      throw error;
    }

    // Supprimez l'animal de la liste d'animaux de l'utilisateur
    const user = await User.findById(req.currentUserId);
    user.animals.pull(deletedAnimal._id);
    // trouver si l'animal avait des Meeting et les supprimer
    const meetings = await Meeting.find({
      $or: [{ animal1: deletedAnimal._id }, { animal2: deletedAnimal._id }],
    });
    meetings.forEach(async (meeting) => {
      await Meeting.findByIdAndDelete(meeting._id);
    });

    await user.save();

    return res.status(204).json({
      message: `L'animal avec l'ID ${animalId} a été supprimé avec succès`,
    });
  } catch (err) {
    return next(err);
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

    const disallowedUpdates = Object.keys(updates).filter(
      (key) => !allowUpdates[key]
    );

    if (disallowedUpdates.length > 0) {
      res.status(400).json({
        message: `Modification non autorisée des champs : ${disallowedUpdates.join(
          ", "
        )}`,
      });
      return;
    }

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
router.patch("/addImg/:animalId", authenticate, async (req, res, next) => {
  try {
    const fieldName = "picturesURL"; // pour que recoive bien le bon champ
    const newPicturesURL = req.body[fieldName];
    const animalId = req.params.animalId;
    const animal = await Animal.findById(animalId);
    if (!animal) {
      res
        .status(404)
        .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
      return;
    }
    if (!newPicturesURL) {
      res.status(400).json({ message: `Le champ ${fieldName} est requis` });
      return;
    }

    if (animal.owner.toString() !== req.currentUserId.toString()) {
      res.status(403).json({
        message: "Vous n'avez pas la permission de modifier cet animal",
      });
      return;
    }

    if (newPicturesURL) {
      // Assurez-vous que newPicturesURL est toujours un tableau
      const newPicturesArray = Array.isArray(newPicturesURL)
        ? newPicturesURL
        : [newPicturesURL];
      // Ajouter les nouveaux URL à la liste des URL de l'animal un par un
      newPicturesArray.forEach((newPicture) => {
        animal.picturesURL.push(newPicture);
      });
      await animal.save(); // Enregistrez les modifications dans la base de données
    }

    res.status(200).json({ message: "Images ajoutées avec succès" }); // Répond avec un succès
  } catch (error) {
    next(error);
  }
});

// supprimer une image dans le tableau des images des animaux
router.post("/deleteImg/:animalId", authenticate, async (req, res, next) => {
  try {
    const fieldName = "picturesURL"; // pour que recoive bien le bon champ
    const deletedPictureURL = req.body[fieldName];
    const animalId = req.params.animalId;
    const animal = await Animal.findById(animalId);
    const picturesURL = animal.picturesURL;

    if (!animal) {
      res
        .status(404)
        .json({ message: `Animal avec l'ID ${animalId} n'existe pas` });
      return;
    }

    if (!deletedPictureURL) {
      res.status(400).json({ message: `Le champ ${fieldName} est requis` });
      return;
    }

    if (animal.owner.toString() !== req.currentUserId.toString()) {
      res.status(403).json({
        message: "Vous n'avez pas la permission de modifier cet animal",
      });
      return;
    }

    if (deletedPictureURL) {
      // Vérifie si l'image à supprimer est présente dans le tableau
      const isImagePresent = animal.picturesURL.includes(deletedPictureURL);
      console.log(picturesURL);
      if (!isImagePresent) {
        res.status(400).json({
          message: "L'image n'est pas présente dans le tableau des images",
        });
        return;
      }

      // Supprime le deletedPictureURL du tableau picturesURL
      animal.picturesURL = animal.picturesURL.filter(
        (url) => url !== deletedPictureURL
      );

      await animal.save(); // Enregistrez les modifications dans la base de données
    }

    res.status(200).json({ message: "Image supprimée avec succès" });
  } catch (error) {
    next(error);
  }
});

export default router;
