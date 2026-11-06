import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorMessage, ProductApi } from './product-api';

describe('ProductApi', () => {
  let api: ProductApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductApi],
    });
    api = TestBed.inject(ProductApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('unwraps the list and preserves boolean verification', () => {
    api.all().subscribe((data) => expect(data).toEqual([]));
    http.expectOne('/bp/products').flush({ data: [] });
    api.exists('a/b').subscribe((value) => expect(value).toBe(true));
    http.expectOne('/bp/products/verification/a%2Fb').flush(true);
  });
  it('uses the documented HTTP methods and URL encodes identifiers', () => {
    api.get('a/b').subscribe();
    http.expectOne('/bp/products/a%2Fb').flush({});
    api.create({ id: 'abc' } as any).subscribe();
    const post = http.expectOne('/bp/products');
    expect(post.request.method).toBe('POST');
    post.flush({});
    api.update('abc', { name: 'Nuevo' } as any).subscribe();
    const put = http.expectOne('/bp/products/abc');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.id).toBeUndefined();
    put.flush({});
    api.remove('abc').subscribe();
    const remove = http.expectOne('/bp/products/abc');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
  it('translates network, validation, missing and unknown errors', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('conectar');
    expect(errorMessage(new HttpErrorResponse({ status: 400 }))).toContain('datos');
    expect(errorMessage(new HttpErrorResponse({ status: 404 }))).toContain('no existe');
    expect(errorMessage(new HttpErrorResponse({ status: 500 }))).toContain('inesperado');
    expect(errorMessage(new HttpErrorResponse({ status: 502 }))).toContain('no está disponible');
    expect(errorMessage(new HttpErrorResponse({ status: 503 }))).toContain('no está disponible');
    expect(errorMessage(new Error())).toContain('inesperado');
  });
});
