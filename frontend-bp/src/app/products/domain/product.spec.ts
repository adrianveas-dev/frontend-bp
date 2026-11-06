import { FormControl } from '@angular/forms';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ProductRepository } from '../domain/product.repository';
import { currentDay, filterProducts, nextYear, validDate } from './product';
import { notBlank, releaseDate, uniqueIdentifier } from './product.validators';

describe('Product rules', () => {
  it('calculates dates without timezone shifts', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T02:00:00Z'));
    expect(currentDay()).toBe('2025-12-31');
    jest.useRealTimers();
    expect(nextYear('2028-02-29')).toBe('2029-02-28');
    expect(nextYear('2026-12-31')).toBe('2027-12-31');
    expect(nextYear('')).toBe('');
    expect(validDate('2026-02-30')).toBe(false);
    expect(validDate('invalid')).toBe(false);
  });
  it('filters by ID, name and description ignoring case and outer whitespace', () => {
    const products = [
      {
        id: 'ABC',
        name: 'Tarjeta',
        description: 'Compras diarias',
        logo: '',
        date_release: '2026-11-06',
        date_revision: '2027-11-06',
      },
    ];
    for (const query of ['abc', ' TARJETA ', 'diarias', ''])
      expect(filterProducts(products, query)).toHaveLength(1);
    expect(filterProducts(products, 'missing')).toEqual([]);
  });
  it.each([
    '2026',
    '2027',
    '06/11/2026',
    '06/11/2027',
    '2026-11-06',
    '2027-11-06',
    '06/11',
    '11/2027',
  ])('finds dates with query %s', (query) => {
    const products = [
      {
        id: 'ABC',
        name: 'Tarjeta',
        description: 'Compras diarias',
        logo: '',
        date_release: '2026-11-06',
        date_revision: '2027-11-06',
      },
      {
        id: 'DEF',
        name: 'Ahorros',
        description: 'Cuenta personal',
        logo: '',
        date_release: '2030-01-02',
        date_revision: '2031-01-02',
      },
    ];
    expect(filterProducts(products, query).map((product) => product.id)).toEqual(['ABC']);
  });
  it('rejects blanks and past dates', () => {
    expect(notBlank(new FormControl('  '))).toEqual({ required: true });
    expect(notBlank(new FormControl('a'))).toBeNull();
    expect(releaseDate(new FormControl('2000-01-01'))).toEqual({ releaseDate: true });
    expect(releaseDate(new FormControl(currentDay()))).toBeNull();
  });
  it.each([false, true, 'error'])('verifies identifiers for %s', async (result) => {
    const repository = {
      exists: jest.fn(() => (result === 'error' ? throwError(() => new Error()) : of(result))),
    } as unknown as ProductRepository;
    const validation = uniqueIdentifier(repository)(new FormControl('abc')) as any;
    expect(await firstValueFrom(validation)).toEqual(
      result === 'error' ? { verificationFailed: true } : result ? { duplicate: true } : null,
    );
  });
  it('cancels obsolete ID requests', () => {
    jest.useFakeTimers();
    const repository = { exists: jest.fn(() => of(false)) } as unknown as ProductRepository;
    const control = new FormControl('', { asyncValidators: uniqueIdentifier(repository) });
    control.setValue('old');
    jest.advanceTimersByTime(100);
    control.setValue('new');
    jest.advanceTimersByTime(350);
    expect(repository.exists).toHaveBeenCalledTimes(1);
    expect(repository.exists).toHaveBeenCalledWith('new');
    jest.useRealTimers();
  });
});
