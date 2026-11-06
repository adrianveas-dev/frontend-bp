export interface Product {
  id: string;
  name: string;
  description: string;
  logo: string;
  date_release: string;
  date_revision: string;
}
export type ProductInput = Omit<Product, 'id'>;

export function currentDay(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function nextYear(value: string): string {
  if (!validDate(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
export function filterProducts(products: Product[], query: string): Product[] {
  const text = query.trim().toLocaleLowerCase();
  return products.filter((product) =>
    [
      product.id,
      product.name,
      product.description,
      product.date_release,
      product.date_revision,
      product.date_release.split('-').reverse().join('/'),
      product.date_revision.split('-').reverse().join('/'),
    ].some((value) => value.toLocaleLowerCase().includes(text)),
  );
}
