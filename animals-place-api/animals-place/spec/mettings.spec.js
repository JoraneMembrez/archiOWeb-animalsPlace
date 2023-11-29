import supertest from "supertest";
import app from "../app.js";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import { cleanUpDatabase, generateValidJwt } from "./utils.js";

let userOne;
let userTwo;
let animalOne;
let animalTwo;
let tokenOne;
let tokenTwo;

beforeEach(async function () {
  cleanUpDatabase();

  [userOne, userTwo] = await User.create([
    {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      password: "password1",
    },
    {
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@example.com",
      password: "password2",
    },
  ]);

  [animalOne, animalTwo] = await Animal.create([
    {
      name: "Fluffy",
      species: "chat",
      owner: userOne._id,
    },
    {
      name: "Buddy",
      species: "chien",
      owner: userTwo._id,
    },
  ]);

  tokenOne = await generateValidJwt(userOne);
  tokenTwo = await generateValidJwt(userTwo);
});
// test pour savoir si on like ça fonctionne
describe("POST /meetings/like/:animalID", function () {
  test("should create a like for an animal by a user", async function () {
    const resOne = await supertest(app)
      .post(`/meetings/like/${animalTwo._id}`)
      .set("Authorization", `Bearer ${tokenTwo}`)
      .send({ userID: userOne._id, animalUserID: animalOne._id })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(resOne.body.message).toBe("Vous avez aimé un animal");
  });

  test("should create a meeting when two animals like each other", async function () {
    // Créer un like réciproque pour simuler un "match"
    await supertest(app)
      .post(`/meetings/like/${animalOne._id}`)
      .set("Authorization", `Bearer ${tokenTwo}`)
      .send({ userID: userTwo._id, animalUserID: animalTwo._id })
      .expect(200)
      .expect("Content-Type", /json/);

    const resTwo = await supertest(app)
      .post(`/meetings/like/${animalTwo._id}`)
      .set("Authorization", `Bearer ${tokenOne}`)
      .send({ userID: userOne._id, animalUserID: animalOne._id })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(resTwo.body.message).toBe("Un nouveau match !");
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});
