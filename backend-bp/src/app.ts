import express, { ErrorRequestHandler } from "express";
import { ProductService } from "./application/product.service";
import { ApplicationError } from "./domain/product";
import { MemoryProductRepository } from "./infrastructure/memory-product.repository";
import { productController } from "./http/product.controller";
import { apiKeyMiddleware } from "./http/api-key.middleware";
export function createApp(
  service = new ProductService(new MemoryProductRepository()),
  apiKey = process.env.BP_API_KEY,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/bp/products", apiKeyMiddleware(apiKey));
  app.use(express.json({ limit: "100kb" }));
  app.use("/bp/products", productController(service));
  app.use((_req, _res, next) =>
    next(new ApplicationError(404, "Route not found")),
  );
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApplicationError) {
      res.status(error.status).json({
        name: error.name,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    } else if (error instanceof SyntaxError && "body" in error) {
      res
        .status(400)
        .json({ name: "BadRequestError", message: "Invalid JSON body" });
    } else {
      console.error(error);
      res.status(500).json({
        name: "InternalServerError",
        message: "Unexpected server error",
      });
    }
  };
  app.use(errorHandler);
  return app;
}
