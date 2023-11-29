import supertest from "supertest";
import app from "../app.js";
import Animal from "../models/animal.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import { cleanUpDatabase, generateValidJwt } from "./utils.js";
import WebSocket from "ws";

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
      _id: "655379f9f4da0d1eb4f841b8",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      password: "password1",
    },
    {
      _id: "65366a2c8876d46616e9c2f4",
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
      .send({ animalUserID: animalOne._id })
      .send({ userID: userOne._id })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(resOne.body.message).toBe("Vous avez aimé un animal");
  });

  test("should create a meeting when two animals like each other", async function () {
    const resTwo = await supertest(app)
      .post(`/meetings/like/${animalOne._id}`)
      .set("Authorization", `Bearer ${tokenTwo}`)
      .send({ animalUserID: animalTwo._id })
      .send({ userID: userOne._id })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(resTwo.body.message).toBe("Vous avez aimé un animal");

    const resThree = await supertest(app)
      .post(`/meetings/like/${animalTwo._id}`)
      .set("Authorization", `Bearer ${tokenOne}`)
      .send({ userID: userOne._id, animalUserID: animalOne._id })
      .expect(200)
      .expect("Content-Type", /json/);

    expect(resThree.body.message).toBe("Un nouveau match !");
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});
