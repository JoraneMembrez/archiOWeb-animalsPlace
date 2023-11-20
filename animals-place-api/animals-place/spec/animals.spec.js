import supertest from "supertest";
import app from "../app.js";
import Animal from "../models/animal.js"; // Modèle Animal
import mongoose from "mongoose";
import User from "../models/user.js";
import { cleanUpDatabase, generateValidJwt } from "./utils.js"; // Import des fonctions

beforeEach(cleanUpDatabase);

let johnDoe;
let janeDoe;
let johnsAnimal;
let janesAnimal;
beforeEach(async function () {
  // Création de 2 utilisateurs avant de récupérer la liste.
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
    name: "Perle",
    species: "Chat",
    owner: johnDoe._id,
  });

  janesAnimal = await Animal.create({
    name: "Whiskers",
    species: "Dog",
    owner: janeDoe._id,
  });
});

describe("POST /animals", function () {
  test("should create an animal for John Doe", async function () {
    const ownerJohn = await User.findOne({ email: "john@gmail.com" });
    const tokenJohn = await generateValidJwt(ownerJohn); // Générer le JWT pour John

    const res = await supertest(app)
      .post("/animals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .send({
        name: "Perle",
        species: "Chat",
        owner: ownerJohn._id,
      })
      .expect(201)
      .expect("Content-Type", /json/);
  });

  test("should create an animal for Jane Doe", async function () {
    const ownerJane = await User.findOne({ email: "jane@gmail.com" });
    const tokenJane = await generateValidJwt(ownerJane); // Générer le JWT pour Jane

    const res = await supertest(app)
      .post("/animals")
      .set("Authorization", `Bearer ${tokenJane}`)
      .send({
        name: "Whiskers",
        species: "Dog",
        owner: ownerJane._id,
      })
      .expect(201)
      .expect("Content-Type", /json/);
  });
});

describe("GET /animals", function () {
  test("should retrieve the list of animals for John Doe", async function () {
    const ownerJohn = await User.findOne({ email: "john@gmail.com" });
    const tokenJohn = await generateValidJwt(ownerJohn);

    const res = await supertest(app)
      .get("/animals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveLength(1);
    expect(res.body).toBeArray();
    expect(res.body[0]).toBeObject();
    expect(res.body[0].name).toEqual("Whiskers");
    expect(res.body[0].species).toEqual("Dog");
  });
});

describe("GET /animals/myAnimals", function () {
  test("should retrieve the list of animals for John Doe", async function () {
    const ownerJohn = await User.findOne({
      email: "john@gmail.com",
    });
    const tokenJohn = await generateValidJwt(ownerJohn);
    const res = await supertest(app)
      .get("/animals/myAnimals")
      .set("Authorization", `Bearer ${tokenJohn}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveLength(1);
    expect(res.body).toBeArray();
    expect(res.body[0]).toBeObject();
    expect(res.body[0].name).toEqual("Perle");
    expect(res.body[0].species).toEqual("Chat");
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});
