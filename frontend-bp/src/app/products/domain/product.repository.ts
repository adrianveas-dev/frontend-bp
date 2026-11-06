import { Observable } from 'rxjs';
import { Product, ProductInput } from './product';

export abstract class ProductRepository {
  abstract all(): Observable<Product[]>;
  abstract get(id: string): Observable<Product>;
  abstract exists(id: string): Observable<boolean>;
  abstract create(product: Product): Observable<unknown>;
  abstract update(id: string, product: ProductInput): Observable<unknown>;
  abstract remove(id: string): Observable<unknown>;
}
