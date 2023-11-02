import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { jwtSecret } from "../config.js";

const router = express.Router();

// Login de l'utilisateur
router.post("/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.sendStatus(401);
    }

    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) {
      return res.sendStatus(401);
    }

    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const payload = {
      sub: user._id.toString(),
      exp: exp,
      scope: user.role,
    };

    jwt.sign(payload, jwtSecret, (err, token) => {
      if (err) {
        return next(err);
      }
      res.send({ user: user, token: token });
    });
  } catch (err) {
    next(err);
  }
});

export default router;

export async function authenticate(req, res, next) {
  // Ensure the header is present.
  const authorization = req.get("Authorization");
  if (!authorization) {
    return res.status(401).send("Authorization header is missing");
  }
  // Check that the header has the correct format.
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).send("Authorization header is not a bearer token");
  }
  // Extract and verify the JWT.
  const token = match[1];

  try {
    const payload = await jwt.verify(token, jwtSecret);
    req.currentUserId = payload.sub;

    // Obtain the list of permissions from the "scope" claim.
    const scope = payload.scope;
    req.currentUserPermissions = scope ? scope.split(" ") : [];

    next(); // Pass the ID of the authenticated user to the next middleware.
  } catch (err) {
    return res.status(401).send("Your token is invalid or has expired");
  }
}

export function authorize(requiredPermission) {
  return function authorizationMiddleware(req, res, next) {
    if (!req.currentUserPermissions) {
      return res.sendStatus(403);
    }

    const authorized = req.currentUserPermissions.includes(requiredPermission);

    if (!authorized) {
      return res.sendStatus(403);
    }

    next();
  };
}

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.sendStatus(200);
});
