const { seedDemo } = require('./seed-demo.cjs');
const ok = (data) => ({ ok: true, json: async () => data });

describe('Demo products', () => {
  it('preserves existing products and fills the catalog to 25 without duplicate identifiers', async () => {
    const existing = [{ id: 'user-1' }, { id: 'bp-demo-01' }, { id: 'user-2' }];
    const request = jest
      .fn()
      .mockResolvedValue(ok({}))
      .mockResolvedValueOnce(ok({ data: existing }));
    const result = await seedDemo({
      origin: 'http://localhost',
      now: new Date('2026-11-06T18:00:00Z'),
      request,
    });
    expect(result).toEqual({ total: 25, added: 22 });
    const created = request.mock.calls.slice(1).map(([, options]) => JSON.parse(options.body));
    expect(created).toHaveLength(22);
    expect(new Set(created.map((product) => product.id)).size).toBe(22);
    expect(created.some((product) => product.id === 'bp-demo-01')).toBe(false);
    expect(
      created.every((product) => product.id.length <= 10 && product.logo.endsWith('.svg')),
    ).toBe(true);
  });
  it('does not add or remove products when the catalog already has at least 25', async () => {
    for (const total of [25, 30]) {
      const request = jest
        .fn()
        .mockResolvedValue(
          ok({ data: Array.from({ length: total }, (_, i) => ({ id: String(i) })) }),
        );
      expect(await seedDemo({ origin: 'http://localhost', request })).toEqual({ total, added: 0 });
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
  it('generates valid dates including leap-day revision', async () => {
    const request = jest
      .fn()
      .mockResolvedValue(ok({}))
      .mockResolvedValueOnce(
        ok({ data: Array.from({ length: 24 }, (_, i) => ({ id: String(i) })) }),
      );
    await seedDemo({ origin: 'http://localhost', now: new Date('2028-02-28T18:00:00Z'), request });
    const product = JSON.parse(request.mock.calls[1][1].body);
    expect(product.date_release).toBe('2028-02-29');
    expect(product.date_revision).toBe('2029-02-28');
  });
  it('reports API and list errors without continuing to create products', async () => {
    await expect(
      seedDemo({
        origin: 'http://localhost',
        request: jest.fn().mockResolvedValue({ ok: false, status: 502 }),
      }),
    ).rejects.toThrow('HTTP 502');
    await expect(
      seedDemo({
        origin: 'http://localhost',
        request: jest.fn().mockResolvedValue(ok({ data: null })),
      }),
    ).rejects.toThrow('listado');
  });
});
