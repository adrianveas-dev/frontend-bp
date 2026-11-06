import supertest from "supertest";
import { createApp } from "../src/app";
import { ProductService } from "../src/application/product.service";
import { MemoryProductRepository } from "../src/infrastructure/memory-product.repository";
import { nextYear, today, validateProduct } from "../src/domain/validation";

const TEST_KEY = "test-only-shared-key-at-least-32-characters";
function request(app: ReturnType<typeof createApp>) {
  const client = supertest(app);
  return {
    get: (url: string) => client.get(url).set("X-BP-API-Key", TEST_KEY),
    post: (url: string) => client.post(url).set("X-BP-API-Key", TEST_KEY),
    put: (url: string) => client.put(url).set("X-BP-API-Key", TEST_KEY),
    delete: (url: string) => client.delete(url).set("X-BP-API-Key", TEST_KEY),
  };
}
const product = {
  id: "uno",
  name: "Tarjeta de crédito",
  description: "Una tarjeta para tus compras",
  logo: "https://example.com/logo.png",
  date_release: "2028-02-29",
  date_revision: "2029-02-28",
};
const input = () => {
  const { id, ...body } = product;
  return body;
};
describe("Product API", () => {
  let repository: MemoryProductRepository;
  let service: ProductService;
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    repository = new MemoryProductRepository();
    service = new ProductService(repository, () => "2026-11-05");
    app = createApp(service, TEST_KEY);
  });
  it("performs the complete documented lifecycle", async () => {
    expect((await request(app).get("/bp/products")).body).toEqual({ data: [] });
    expect((await request(app).get("/bp/products/verification/uno")).body).toBe(
      false,
    );
    const created = await request(app).post("/bp/products").send(product);
    expect(created.status).toBe(200);
    expect(created.body).toEqual({
      message: "Product added successfully",
      data: product,
    });
    expect((await request(app).get("/bp/products/verification/uno")).body).toBe(
      true,
    );
    expect((await request(app).get("/bp/products/uno")).body).toEqual(product);
    expect((await request(app).get("/bp/products")).body.data).toEqual([
      product,
    ]);
    const changed = await request(app)
      .put("/bp/products/uno")
      .send({ ...input(), name: "Nueva tarjeta" });
    expect(changed.status).toBe(200);
    expect(changed.body.data).toEqual({ ...input(), name: "Nueva tarjeta" });
    expect((await request(app).get("/bp/products/uno")).body.id).toBe("uno");
    expect((await request(app).delete("/bp/products/uno")).body).toEqual({
      message: "Product removed successfully",
    });
    expect(repository.all()).toEqual([]);
  });
  it("rejects duplicates, invalid bodies and ID updates", async () => {
    await request(app).post("/bp/products").send(product);
    const duplicate = await request(app).post("/bp/products").send(product);
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.errors.id).toBeTruthy();
    const invalid = await request(app).post("/bp/products").send({});
    expect(invalid.status).toBe(400);
    expect(Object.keys(invalid.body.errors)).toHaveLength(6);
    expect(
      (await request(app).put("/bp/products/uno").send(product)).status,
    ).toBe(400);
  });
  it.each(["get", "put", "delete"] as const)(
    "returns 404 for missing product on %s",
    async (method) => {
      const response = await request(app)
        [method]("/bp/products/missing")
        .send(input());
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        name: "NotFoundError",
        message: "Not product found with that identifier",
      });
      expect(response.body.stack).toBeUndefined();
    },
  );
  it("handles malformed JSON, unknown routes and unexpected errors safely", async () => {
    expect(
      (
        await request(app)
          .post("/bp/products")
          .set("Content-Type", "application/json")
          .send("{")
      ).status,
    ).toBe(400);
    expect((await request(app).get("/missing")).status).toBe(404);
    jest.spyOn(service, "all").mockImplementation(() => {
      throw new Error("secret");
    });
    const log = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await request(app).get("/bp/products");
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("secret");
    log.mockRestore();
  });
  it("isolates stored values from caller mutation", () => {
    repository.save(product);
    const found = repository.find(product.id)!;
    found.name = "mutated";
    repository.all()[0].name = "also mutated";
    expect(repository.find(product.id)?.name).toBe(product.name);
    expect(repository.find("absent")).toBeUndefined();
  });
});
describe("Product validation", () => {
  it("uses Ecuador date and handles leap day and year rollover", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T02:00:00Z"));
    expect(today()).toBe("2025-12-31");
    jest.useRealTimers();
    expect(nextYear("2028-02-29")).toBe("2029-02-28");
    expect(nextYear("2026-12-31")).toBe("2027-12-31");
    expect(validateProduct(product, "2028-02-29")).toEqual(product);
    expect(new ProductService(new MemoryProductRepository()).all()).toEqual([]);
    expect(createApp(undefined, TEST_KEY)).toBeTruthy();
  });
  it.each([
    ["id", "ab"],
    ["id", "a".repeat(11)],
    ["id", "   "],
    ["name", "abcd"],
    ["name", "a".repeat(101)],
    ["name", "     "],
    ["description", "a".repeat(9)],
    ["description", "a".repeat(201)],
    ["logo", " "],
    ["date_release", "2020-01-01"],
    ["date_release", "2028-02-30"],
    ["date_release", "invalid"],
    ["date_revision", "2029-03-01"],
    ["date_revision", "not-a-date"],
  ])("rejects %s = %s", (field, value) => {
    expect(() =>
      validateProduct({ ...product, [field]: value }, "2026-11-05"),
    ).toThrow();
  });
  it.each([null, [], 42])("rejects non-object payload %s", (body) => {
    expect(() => validateProduct(body, "2026-11-05")).toThrow();
  });
  it.each([
    ["id", 3],
    ["id", 10],
    ["name", 5],
    ["name", 100],
    ["description", 10],
    ["description", 200],
  ])("accepts %s boundary %s", (field, count) => {
    expect(
      validateProduct(
        { ...product, [field]: "a".repeat(Number(count)) },
        "2026-11-05",
      ),
    ).toBeTruthy();
  });
});

describe("Server-to-server authentication", () => {
  it("requires a configured secret and refuses missing or incorrect credentials", async () => {
    expect(() => createApp(undefined, "")).toThrow("BP_API_KEY");
    expect(() => createApp(undefined, "short")).toThrow("BP_API_KEY");
    expect(() =>
      createApp(undefined, "replace_with_a_key_at_least_32_characters"),
    ).toThrow("BP_API_KEY");
    const app = createApp(undefined, TEST_KEY);
    expect((await supertest(app).get("/bp/products")).status).toBe(401);
    for (const secret of ["", "incorrect-client-key"]) {
      const response = await supertest(app)
        .get("/bp/products")
        .set("X-BP-API-Key", secret);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        name: "UnauthorizedError",
        message: "Unauthorized",
      });
      expect(JSON.stringify(response.body)).not.toContain(TEST_KEY);
    }
    expect((await request(app).get("/bp/products")).status).toBe(200);
  });
});
