import supertest from "supertest";
import app from "../app.js";
import Animal from "../models/animal.js";
import mongoose from "mongoose";
import User from "../models/user.js";
import { cleanUpDatabase, generateValidJwt } from "./utils.js";

beforeEach(cleanUpDatabase);

let johnDoe;
let janeDoe;
let johnsAnimal;
let janesAnimal;

beforeEach(async function () {
  [johnDoe, janeDoe] = await Promise.all([
    User.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@gmail.com",
      password: "123",
    }),
    User.create({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@gmail.com",
      password: "123",
    }),
  ]);

  johnsAnimal = await Animal.create({
    name: "Rex",
    species: "chien",
    owner: johnDoe._id,
  });

  janesAnimal = await Animal.create({
    name: "Perle",
    species: "chat",
    owner: janeDoe._id,
  });
});

describe("POST /animals", function () {
  // Tests pour la création d'animaux
  test("should create an animal for John Doe", async function () {
    const ownerJohn = await User.findOne({ email: "john@gmail.com" });
    const tokenJohn = await generateValidJwt(ownerJohn);

    const res = await supertest(app)
      .post("/animals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .send({
        // Inclure les détails de l'animal à créer
        name: "Buddy", // Nom de l'animal
        species: "chien", // Espèce de l'animal
        owner: ownerJohn._id, // ID du propriétaire
      })
      .expect(201) // Attendre un code 201 pour la création
      .expect("Content-Type", /json/); // Attendre une réponse JSON
  });

  test("should create an animal for Jane Doe", async function () {
    const ownerJane = await User.findOne({ email: "jane@gmail.com" });
    const tokenJane = await generateValidJwt(ownerJane);

    const res = await supertest(app)
      .post("/animals")
      .set("Authorization", `Bearer ${tokenJane}`)
      .send({
        // Inclure les détails de l'animal à créer
        name: "Mittens", // Nom de l'animal
        species: "chat", // Espèce de l'animal
        owner: ownerJane._id, // ID du propriétaire
      })
      .expect(201) // Attendre un code 201 pour la création
      .expect("Content-Type", /json/); // Attendre une réponse JSON
  });
});

describe("GET /animals", function () {
  // Test pour récupérer la liste des animaux
  test("should retrieve the list of animals for John Doe", async function () {
    const ownerJohn = await User.findOne({ email: "john@gmail.com" });
    const tokenJohn = await generateValidJwt(ownerJohn);

    const res = await supertest(app)
      .get("/animals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveLength(1); // Deux animaux pour les deux utilisateurs
    expect(res.body[0]).toBeObject();
    expect(res.body[0].name).toEqual("Perle");
    expect(res.body[0].species).toEqual("chat");
  });
});

describe("GET /animals/myAnimals", function () {
  // Test pour récupérer la liste des animaux pour un utilisateur spécifique
  test("should retrieve the list of animals for John Doe", async function () {
    const ownerJohn = await User.findOne({ email: "john@gmail.com" });
    const tokenJohn = await generateValidJwt(ownerJohn);

    const res = await supertest(app)
      .get("/animals/myAnimals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveLength(1); // Un seul animal pour John
    expect(res.body[0]).toBeObject();
    expect(res.body[0].name).toEqual("Rex");
    expect(res.body[0].species).toEqual("chien");
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});
