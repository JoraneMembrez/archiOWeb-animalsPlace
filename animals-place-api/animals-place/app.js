import express from "express";
import createError from "http-errors";
import logger from "morgan";
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import mongoose from "mongoose";
import debug from "debug";
import * as config from "./config.js";

//server.listen(config.port);
mongoose.connect(config.databaseUrl);

const app = express();
// définit sur quel port celui-ci va être lancé
const port = 8000;

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Send the error status
  res.status(err.status || 500);
  res.send(err.message);
});

// permet d'écouter sur le port 8000
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

export default app;
