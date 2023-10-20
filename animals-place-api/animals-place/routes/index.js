import express from "express";
const router = express.Router();

router.get("/", function (req, res, next) {
  res.send("Animals Place API");
});

export default router;
