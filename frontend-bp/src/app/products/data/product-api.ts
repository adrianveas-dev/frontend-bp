import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { Product, ProductInput } from '../domain/product';
import { ProductRepository } from '../domain/product.repository';

@Injectable()
export class ProductApi extends ProductRepository {
  private readonly http = inject(HttpClient);
  private readonly base = '/bp/products';
  all() {
    return this.http.get<{ data: Product[] }>(this.base).pipe(map((response) => response.data));
  }
  get(id: string) {
    return this.http.get<Product>(`${this.base}/${encodeURIComponent(id)}`);
  }
  exists(id: string) {
    return this.http.get<boolean>(`${this.base}/verification/${encodeURIComponent(id)}`);
  }
  create(product: Product) {
    return this.http.post(this.base, product);
  }
  update(id: string, product: ProductInput) {
    return this.http.put(`${this.base}/${encodeURIComponent(id)}`, product);
  }
  remove(id: string) {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    if (error.status === 404)
      return 'El producto ya no existe. Vuelve al listado para actualizar la información.';
    if (error.status === 400) return 'Revisa los datos del formulario e inténtalo de nuevo.';
    if (error.status === 502 || error.status === 503)
      return 'El servicio de productos no está disponible. Inténtalo de nuevo en unos momentos.';
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
