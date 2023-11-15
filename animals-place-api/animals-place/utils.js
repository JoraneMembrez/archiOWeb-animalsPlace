import { ObjectId } from "mongodb";

export function idValidation(req, res, next) {
  for (const key of Object.keys(req.params)) {
    console.log("key ", key);
    if (key.toLowerCase().includes("id")) {
      if (!ObjectId.isValid(req.params[key])) {
        return res.status(400).send(`param "${key}" is invalid`);
      }
    }
  }
  next();
}
