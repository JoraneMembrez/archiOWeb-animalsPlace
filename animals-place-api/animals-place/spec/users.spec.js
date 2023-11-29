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
        role: "admin",
      })
      .expect(201)
      .expect("Content-Type", /json/);

    expect(res.body).toEqual(expect.any(Object));
    expect(res.body._id).toBeString();
    expect(res.body.firstName).toEqual("John");
    expect(res.body.lastName).toEqual("Doe");
    expect(res.body.email).toEqual("john.doe@gmail.com");
    expect(res.body.role).toEqual("admin");
    expect(res.body.animals).toEqual([]);
    expect(res.body.registrationDate).toBeString();
  });
});

//----------------------------------------------

describe("GET /users", function () {
  let johnDoe;
  let janeDoe;
  beforeEach(async function () {
    [johnDoe, janeDoe] = await Promise.all([
      User.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "123",
        role: "admin",
      }),
      User.create({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@gmail.com",
        password: "123",
      }),
    ]);
  });

  test("should retrieve paginated list of users for an admin", async function () {
    const validAdminToken = await generateValidJwt(johnDoe);

    const res = await supertest(app)
      .get("/users")
      .query({ page: 1, pageSize: 5 })
      .set("Authorization", `Bearer ${validAdminToken}`)
      .expect(200)
      .expect("Content-Type", /json/);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body.users[0]).toHaveProperty("_id", johnDoe.id);
    expect(res.body.users[0].firstName).toEqual("John");
    expect(res.body.users[0].lastName).toEqual("Doe");

    expect(res.body.users[1]).toHaveProperty("_id", janeDoe.id);
    expect(res.body.users[1].firstName).toEqual("Jane");
    expect(res.body.users[1].lastName).toEqual("Doe");
  });
});
afterAll(async () => {
  await mongoose.disconnect();
});
