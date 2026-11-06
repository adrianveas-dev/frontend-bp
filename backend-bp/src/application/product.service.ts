import { ApplicationError, ProductRepository } from "../domain/product";
import { today, validateProduct } from "../domain/validation";
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly currentDay: () => string = today,
  ) {}
  all() {
    return this.repository.all();
  }
  exists(id: string) {
    return this.repository.find(id) !== undefined;
  }
  get(id: string) {
    const product = this.repository.find(id);
    if (!product)
      throw new ApplicationError(404, "Not product found with that identifier");
    return product;
  }
  create(body: unknown) {
    const product = validateProduct(body, this.currentDay());
    if (this.exists(product.id)) {
      throw new ApplicationError(
        400,
        "Duplicate identifier found in the database",
        { id: "Este ID ya existe." },
      );
    }
    this.repository.save(product);
    return product;
  }
  update(id: string, body: unknown) {
    this.get(id);
    const product = validateProduct(body, this.currentDay(), id);
    this.repository.save(product);
    const { id: _id, ...data } = product;
    return data;
  }
  remove(id: string) {
    this.get(id);
    this.repository.remove(id);
  }
}
