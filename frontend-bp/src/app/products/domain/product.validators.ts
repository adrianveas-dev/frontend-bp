import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { catchError, map, of, switchMap, take, timer } from 'rxjs';
import { ProductRepository } from './product.repository';
import { currentDay, validDate } from './product';

export const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };
export const releaseDate: ValidatorFn = (control) =>
  validDate(control.value) && control.value >= currentDay() ? null : { releaseDate: true };
export function uniqueIdentifier(repository: ProductRepository): AsyncValidatorFn {
  return (control: AbstractControl) =>
    timer(350).pipe(
      switchMap(() => repository.exists(control.value)),
      map((exists): ValidationErrors | null => (exists ? { duplicate: true } : null)),
      catchError(() => of({ verificationFailed: true })),
      take(1),
    );
}
