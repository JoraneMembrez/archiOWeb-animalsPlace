import supertest from "supertest";
import app from "../app.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import { cleanUpDatabase, generateValidJwt } from "./utils.js";

beforeEach(cleanUpDatabase);

describe("POST /users", function () {
  it("should create a user", async function () {
    const res = await supertest(app)
      .post("/users")
      .send({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@gmail.com",
        password: "password",
      })

      .expect(201)
      .expect("Content-Type", /json/);

    expect(res.body).toEqual(expect.any(Object));
    expect(res.body._id).toBeString();
    expect(res.body.firstName).toEqual("John");
    expect(res.body.lastName).toEqual("Doe");
    expect(res.body.email).toEqual("john.doe@gmail.com");
    expect(res.body.role).toEqual("user");
    expect(res.body.animals).toEqual([]);
    expect(res.body.registrationDate).toBeString();
  });
});

describe("GET /users", function () {
  let johnDoe;
  let janeDoe;
  beforeEach(async function () {
    // Create 2 users before retrieving the list.
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
  });

  test("should retrieve the list of users", async function () {
    const token = await generateValidJwt(johnDoe);
    const res = await supertest(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveLength(2);
    expect(res.body).toBeArray();
    expect(res.body[1]).toBeObject();
    expect(res.body[1]._id).toEqual(janeDoe.id);
    expect(res.body[1].firstName).toEqual("Jane");
    expect(res.body[1].lastName).toEqual("Doe");
    expect(res.body[1]).toContainAllKeys([
      "_id",
      "firstName",
      "lastName",
      "email",
      "registrationDate",
      "animals",
      "role",
      "location",
      "__v",
    ]);

    expect(res.body[0]).toBeObject();
    expect(res.body[0]._id).toEqual(johnDoe.id);
    expect(res.body[0].firstName).toEqual("John");
    expect(res.body[0].lastName).toEqual("Doe");
    expect(res.body[0]).toContainAllKeys([
      "_id",
      "firstName",
      "lastName",
      "email",
      "registrationDate",
      "animals",
      "role",
      "location",
      "__v",
    ]);
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});
