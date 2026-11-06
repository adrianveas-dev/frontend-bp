import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ProductForm } from './product-form';
import { ProductRepository } from '../domain/product.repository';
import { Product } from '../domain/product';

const product: Product = {
  id: 'abc',
  name: 'Tarjeta',
  description: 'Compras para cada día',
  logo: 'logo.png',
  date_release: '2096-02-29',
  date_revision: '2097-02-28',
};
describe('Product form', () => {
  let fixture: ComponentFixture<ProductForm>;
  let component: ProductForm;
  let repository: Record<string, jest.Mock>;
  let navigate: jest.SpyInstance;
  function setup(id: string | null = null, getError = false) {
    repository = {
      get: jest.fn(() =>
        getError ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(product),
      ),
      exists: jest.fn(() => of(false)),
      create: jest.fn(() => of({})),
      update: jest.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideRouter([]),
        { provide: ProductRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ProductForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  afterEach(() => jest.useRealTimers());
  function fill() {
    component.form.setValue(product);
    jest.advanceTimersByTime(350);
  }
  it('validates, computes leap-day revision and submits creation', () => {
    jest.useFakeTimers();
    setup();
    component.submit();
    expect(repository['create']).not.toHaveBeenCalled();
    expect(component.fieldError('id')).toContain('requerido');
    fill();
    expect(component.form.controls.date_revision.value).toBe('2097-02-28');
    expect(component.form.controls.date_revision.disabled).toBe(true);
    component.submit();
    expect(repository['create']).toHaveBeenCalledWith(product);
    expect(navigate).toHaveBeenCalled();
    component.reset();
    expect(component.form.controls.name.value).toBe('');
    expect(component.form.pristine).toBe(true);
    component.load();
  });
  it('covers boundaries and actionable field errors', () => {
    jest.useFakeTimers();
    setup();
    const control = component.form.controls.name;
    expect(component.fieldError('name')).toBe('');
    control.markAsTouched();
    control.setValue('abcd');
    expect(component.fieldError('name')).toContain('Mínimo 5');
    control.setValue('a'.repeat(101));
    expect(component.fieldError('name')).toContain('Máximo 100');
    for (const length of [5, 100]) {
      control.setValue('a'.repeat(length));
      expect(control.valid).toBe(true);
    }
    component.form.controls.description.setValue('a'.repeat(9));
    expect(component.form.controls.description.invalid).toBe(true);
    component.form.controls.description.setValue('a'.repeat(201));
    expect(component.form.controls.description.invalid).toBe(true);
    for (const length of [10, 200]) {
      component.form.controls.description.setValue('a'.repeat(length));
      expect(component.form.controls.description.valid).toBe(true);
    }
    for (const length of [2, 11]) {
      component.form.controls.id.setValue('a'.repeat(length));
      expect(component.form.controls.id.invalid).toBe(true);
    }
    for (const length of [3, 10]) {
      component.form.controls.id.setValue('a'.repeat(length));
      jest.advanceTimersByTime(350);
      expect(component.form.controls.id.valid).toBe(true);
    }
    control.setValue('     ');
    expect(component.fieldError('name')).toContain('requerido');
    const errors = [
      ['duplicate', 'ya existe'],
      ['verificationFailed', 'verificar'],
      ['releaseDate', 'posterior'],
      ['server', 'Error remoto'],
      ['other', 'no válido'],
    ];
    for (const [key, text] of errors) {
      control.setErrors({ [key]: key === 'server' ? text : true });
      expect(component.fieldError('name')).toContain(text);
    }
  });
  it('blocks pending and failed ID checks, then allows a retry', () => {
    jest.useFakeTimers();
    setup();
    const pending = new Subject<boolean>();
    repository['exists'].mockReturnValue(pending);
    component.form.setValue(product);
    jest.advanceTimersByTime(350);
    expect(component.form.pending).toBe(true);
    component.submit();
    expect(repository['create']).not.toHaveBeenCalled();
    pending.error(new Error());
    expect(component.form.controls.id.hasError('verificationFailed')).toBe(true);
    component.submit();
    expect(repository['create']).not.toHaveBeenCalled();
    repository['exists'].mockReturnValue(of(true));
    component.retryVerification();
    jest.advanceTimersByTime(350);
    expect(component.form.controls.id.hasError('duplicate')).toBe(true);
    repository['exists'].mockReturnValue(of(false));
    component.retryVerification();
    jest.advanceTimersByTime(350);
    expect(component.form.valid).toBe(true);
  });
  it('loads editing with disabled ID, restores values and omits ID in PUT', () => {
    setup('abc');
    expect(component.form.controls.id.disabled).toBe(true);
    component.form.controls.name.setValue('Cambiado');
    component.reset();
    expect(component.form.getRawValue()).toEqual(product);
    component.form.controls.name.setValue('Nueva tarjeta');
    component.submit();
    expect(repository['update']).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ name: 'Nueva tarjeta' }),
    );
    expect(repository['update'].mock.calls[0][1].id).toBeUndefined();
    expect(navigate).toHaveBeenCalled();
  });
  it('shows loading and errors when an edit target is missing', () => {
    setup('abc', true);
    expect(component.error()).toContain('no existe');
    component.submit();
    expect(repository['update']).not.toHaveBeenCalled();
    const pending = new Subject<Product>();
    repository['get'].mockReturnValue(pending);
    component.load();
    expect(component.loading()).toBe(true);
    pending.next(product);
    pending.complete();
    expect(component.loading()).toBe(false);
  });
  it('displays server field errors, blocks repeated submit and reset while saving', () => {
    jest.useFakeTimers();
    setup();
    fill();
    const pending = new Subject();
    repository['create'].mockReturnValue(pending);
    component.submit();
    component.submit();
    component.reset();
    expect(repository['create']).toHaveBeenCalledTimes(1);
    expect(component.form.controls.name.value).toBe(product.name);
    pending.error(
      new HttpErrorResponse({
        status: 400,
        error: { errors: { name: 'Error remoto', unknown: 'ignored', logo: 42 } },
      }),
    );
    expect(component.saving()).toBe(false);
    expect(component.fieldError('name')).toBe('Error remoto');
    expect(component.error()).toContain('datos');
    component.form.controls.name.setValue('Otra tarjeta');
    repository['create'].mockReturnValue(throwError(() => new Error()));
    component.submit();
    expect(component.error()).toContain('inesperado');
  });
});
