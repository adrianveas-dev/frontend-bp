import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductRepository } from '../domain/product.repository';
import { errorMessage } from '../data/product-api';
import { currentDay, nextYear, Product } from '../domain/product';
import { notBlank, releaseDate, uniqueIdentifier } from '../domain/product.validators';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly repository = inject(ProductRepository);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly minimumDate = currentDay();
  private original?: Product;
  readonly form = new FormGroup({
    id: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.minLength(3), Validators.maxLength(10)],
      asyncValidators: [uniqueIdentifier(this.repository)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.minLength(5), Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.minLength(10), Validators.maxLength(200)],
    }),
    logo: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    date_release: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, releaseDate],
    }),
    date_revision: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
  });
  constructor() {
    if (this.id) {
      this.form.controls.id.clearAsyncValidators();
      this.form.controls.id.disable();
      this.load();
    }
    this.form.controls.date_release.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.form.controls.date_revision.setValue(nextYear(value)));
  }
  load() {
    if (!this.id) return;
    this.loading.set(true);
    this.error.set('');
    this.repository
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.original = product;
          this.form.reset(product);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  reset() {
    if (this.saving()) return;
    this.error.set('');
    this.form.reset(
      this.original ?? {
        id: '',
        name: '',
        description: '',
        logo: '',
        date_release: '',
        date_revision: '',
      },
    );
  }
  fieldError(field: keyof typeof this.form.controls): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.hasError('required')) return 'Este campo es requerido.';
    if (control.hasError('minlength'))
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
    if (control.hasError('maxlength'))
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    if (control.hasError('duplicate')) return 'Este ID ya existe.';
    if (control.hasError('verificationFailed'))
      return 'No se pudo verificar el ID. Intenta nuevamente.';
    if (control.hasError('releaseDate'))
      return 'Debe ser una fecha válida, igual o posterior a hoy.';
    return control.errors['server'] ?? 'Valor no válido.';
  }
  retryVerification() {
    this.form.controls.id.updateValueAndValidity();
  }
  submit() {
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      this.form.pending ||
      this.saving() ||
      this.loading() ||
      (this.id && !this.original)
    )
      return;
    this.saving.set(true);
    this.error.set('');
    const product = this.form.getRawValue();
    const { id: _id, ...input } = product;
    const request = this.id
      ? this.repository.update(this.id, input)
      : this.repository.create(product);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/products'], {
          state: {
            notice: this.id
              ? 'Producto actualizado correctamente.'
              : 'Producto creado correctamente.',
          },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.errors) {
          for (const [field, message] of Object.entries(error.error.errors)) {
            const control = this.form.get(field);
            if (control && typeof message === 'string') {
              control.setErrors({ server: message });
              control.markAsTouched();
            }
          }
        }
      },
    });
  }
}
