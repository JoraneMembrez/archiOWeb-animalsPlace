import express from "express";
import mongoose, { Schema } from "mongoose";
import User from "../models/user.js";
const router = express.Router();

router.get("/", function (req, res, next) {
  User.find()
    .sort("name")
    .exec()
    .then((users) => {
      res.send(users);
    })
    .catch((err) => {
      next(err);
    });
});

// export default router;
export default router;
