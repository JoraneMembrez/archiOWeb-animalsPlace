import express from "express";
import createError from "http-errors";
import logger from "morgan";
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import animalsRouter from "./routes/animals.js";
import authRouter from "./routes/auth.js";
import meetingsRouter from "./routes/meetings.js";
import mongoose from "mongoose";
import * as config from "./config.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs";
import yaml from "js-yaml";
import bodyParser from "body-parser";

//server.listen(config.port);

mongoose.connect(config.databaseUrl);

const app = express();

const openApiDocument = yaml.load(fs.readFileSync("./openapi.yml"));

// const swaggerSpec = swaggerJsdoc(options);
//const openapiSpecification = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use(bodyParser.urlencoded({ extended: true }));
// définit sur quel port celui-ci va être lancé

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/animals", animalsRouter);
app.use("/auth", authRouter);
app.use("/meetings", meetingsRouter);

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
