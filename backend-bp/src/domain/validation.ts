import { ApplicationError, Product, ProductInput } from "./product";

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function nextYear(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateProduct(
  body: unknown,
  currentDay: string,
  id?: string,
): Product {
  const input =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const errors: Record<string, string> = {};
  const lengths: Record<string, [number, number]> = {
    name: [5, 100],
    description: [10, 200],
    logo: [1, Infinity],
    ...(id === undefined ? { id: [3, 10] as [number, number] } : {}),
  };
  for (const [field, [min, max]] of Object.entries(lengths)) {
    const value = input[field];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length < min ||
      value.length > max
    ) {
      errors[field] =
        max === Infinity
          ? "Este campo es requerido."
          : `Debe contener entre ${min} y ${max} caracteres y no estar vacío.`;
    }
  }
  if (id !== undefined && "id" in input)
    errors.id = "El ID no se puede modificar.";
  if (!validDate(input.date_release) || input.date_release < currentDay) {
    errors.date_release = "La fecha debe ser válida e igual o posterior a hoy.";
  }
  if (
    !validDate(input.date_revision) ||
    !validDate(input.date_release) ||
    input.date_revision !== nextYear(input.date_release)
  ) {
    errors.date_revision =
      "Debe ser exactamente un año posterior a la liberación.";
  }
  if (Object.keys(errors).length) {
    throw new ApplicationError(
      400,
      "Invalid body, check 'errors' property for more info.",
      errors,
    );
  }
  const fields: ProductInput = {
    name: input.name as string,
    description: input.description as string,
    logo: input.logo as string,
    date_release: input.date_release as string,
    date_revision: input.date_revision as string,
  };
  return { id: id ?? (input.id as string), ...fields };
}
