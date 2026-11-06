import { Product, ProductRepository } from "../domain/product";
export class MemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();
  all(): Product[] {
    return [...this.products.values()].map((product) => ({ ...product }));
  }
  find(id: string): Product | undefined {
    const product = this.products.get(id);
    return product ? { ...product } : undefined;
  }
  save(product: Product): void {
    this.products.set(product.id, { ...product });
  }
  remove(id: string): void {
    this.products.delete(id);
  }
}
