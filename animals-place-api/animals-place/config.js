import * as dotenv from "dotenv";
dotenv.config();
//
export const databaseUrl =
  process.env.DATABASE_URL || "mongodb://127.0.0.1/animals-place-databse";
export const port = process.env.PORT || "8000";
export const jwtSecret = process.env.JWT_SECRET || "changeme";
