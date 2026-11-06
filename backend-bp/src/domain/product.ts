export interface Product {
  id: string;
  name: string;
  description: string;
  logo: string;
  date_release: string;
  date_revision: string;
}
export type ProductInput = Omit<Product, "id">;
export interface ProductRepository {
  all(): Product[];
  find(id: string): Product | undefined;
  save(product: Product): void;
  remove(id: string): void;
}
export class ApplicationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string>,
  ) {
    super(message);
    this.name = status === 404 ? "NotFoundError" : "BadRequestError";
  }
}
