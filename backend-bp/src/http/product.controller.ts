import { Router } from "express";
import { ProductService } from "../application/product.service";
export function productController(service: ProductService): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json({ data: service.all() });
  });
  router.get("/verification/:id", (req, res) => {
    res.json(service.exists(req.params.id));
  });
  router.get("/:id", (req, res) => {
    res.json(service.get(req.params.id));
  });
  router.post("/", (req, res) => {
    res.json({
      message: "Product added successfully",
      data: service.create(req.body),
    });
  });
  router.put("/:id", (req, res) => {
    res.json({
      message: "Product updated successfully",
      data: service.update(req.params.id, req.body),
    });
  });
  router.delete("/:id", (req, res) => {
    service.remove(req.params.id);
    res.json({ message: "Product removed successfully" });
  });
  return router;
}
