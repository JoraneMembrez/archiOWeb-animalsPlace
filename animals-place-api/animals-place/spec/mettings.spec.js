import supertest from "supertest";
import app from "../app.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import Animal from "../models/animal.js";
import { cleanUpDatabase, generateValidJwt } from "./utils.js";

describe("POST /users", function () {
  test.todo("should create a user");
});
