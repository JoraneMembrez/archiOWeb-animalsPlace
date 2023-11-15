import express from "express";
import createError from "http-errors";
import logger from "morgan";
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import animalsRouter from "./routes/animals.js";
import authRouter from "./routes/auth.js";
import meetingsRouter from "./routes/meetings.js";
import chatsRouter from "./routes/chats.js";
import localisationRouter from "./routes/localisation.js";
//import chatsRouter2 from "./routes/chats2.js";
import mongoose from "mongoose";
import debug from "debug";
import * as config from "./config.js";

//server.listen(config.port);
mongoose.connect(config.databaseUrl);

const app = express();

// définit sur quel port celui-ci va être lancé

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/animals", animalsRouter);
app.use("/auth", authRouter);
app.use("/meetings", meetingsRouter);
app.use("/chats", chatsRouter);
app.use("/localisation", localisationRouter);
//app.use("/chats2", chatsRouter2);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.warn(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Send the error status
  res.status(err.status || 500);
  res.send(err.message);
});

export default app;
