import express from "express";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import { authenticate } from "./auth.js";
import { broadcastMessage } from "../ws.js";

const router = express.Router();

router.get("/", authenticate, async function (req, res, next) {
  try {
    const species_filter = req.query.species;
    console.log(species_filter);
    let animals_db = Animal;

    if (species_filter) {
      animals_db = animals_db.find({ species: species_filter });
    }

    // Récupérez l'ID de l'utilisateur connecté à partir des données d'authentification ou de la session
    const userID = req.currentUserId;

    // requête de recherche pour récupérer tous les animaux dont le propriétaire n'est pas l'utilisateur actuel
    const animals = await animals_db
      .find({
        owner: { $ne: userID },
      })
      .populate("name")
      .populate("owner")
      .exec();

    res.send(animals);
  } catch (err) {
    next(err);
  }
});

router.get("/myAnimals", authenticate, async function (req, res, next) {
  try {
    // Récupérez l'ID de l'utilisateur connecté à partir des données d'authentification ou de la session
    const userID = req.currentUserId;

    // requête de recherche pour récupérer tous les animaux dont le propriétaire est l'utilisateur actuel
    const animals = await Animal.find({ owner: userID })
      .populate("name")
      .populate("owner")
      .exec();

    res.send(animals);
  } catch (err) {
    next(err);
  }
});

router.get("/count", authenticate, async function (req, res, next) {
  try {
    // Récupérez l'ID de l'utilisateur connecté à partir des données d'authentification ou de la session
    const userID = req.currentUserId;

    // On utilise la fonction d'aggregation de mongoDB
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

router.post("/", authenticate, async (req, res, next) => {
  try {
    // Recherche de l'utilisateur par ID
    const user = await User.findById(req.currentUserId);
    const newPictures = req.body.picturesURL;

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

router.post("/:animalId", authenticate, async (req, res, next) => {
  try {
    const animalId = req.params.animalId;
    const updates = req.body; // Les données de mise à jour de l'animal

    const animal = await Animal.findById(animalId);

    if (!animal) {
      res.status(404).json({ message: "Animal pas trouvé" });
      return;
    }

    if (animal.owner.toString() !== req.currentUserId.toString()) {
      res.status(403).json({
        message: "Vous n'avez pas la permission de modifier cet animal",
      });
      return;
    }

    // ce qu'on a le droit de modifier :
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
router.post("/addImg/:animalId", authenticate, async (req, res, next) => {
  try {
    const newPicturesURL = req.body.picturesURL;
    const animalId = req.params.animalId;
    const animal = await Animal.findById(animalId);

    if (!animal) {
      res.status(404).json({ message: "Animal pas trouvé" });
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
    const deletedPictureURL = req.body.picturesURL;
    const animalId = req.params.animalId;
    const animal = await Animal.findById(animalId);
    const picturesURL = animal.picturesURL;

    if (!animal) {
      res.status(404).json({ message: "Animal pas trouvé" });
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
