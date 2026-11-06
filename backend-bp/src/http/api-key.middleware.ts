import { createHash, timingSafeEqual } from "node:crypto";
import { RequestHandler } from "express";

export function apiKeyMiddleware(apiKey: string | undefined): RequestHandler {
  if (!apiKey || apiKey.length < 32 || apiKey.startsWith("replace_")) {
    throw new Error(
      "Configura BP_API_KEY con una clave privada de al menos 32 caracteres.",
    );
  }
  const expected = createHash("sha256").update(apiKey).digest();
  return (req, res, next) => {
    const supplied = req.get("X-BP-API-Key") ?? "";
    const actual = createHash("sha256").update(supplied).digest();
    if (!timingSafeEqual(expected, actual)) {
      res
        .status(401)
        .json({ name: "UnauthorizedError", message: "Unauthorized" });
      return;
    }
    next();
  };
}
