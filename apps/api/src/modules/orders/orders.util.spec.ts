import {
  groupItemsByVendor,
  buildAsaasSplit,
  ProductSnapshot,
} from './orders.util';

function makeProduct(
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot {
  return {
    id: 'prod-1',
    vendorId: 'vendor-1',
    walletId: 'wallet-1',
    vendorStatus: 'ACTIVE',
    price: 100,
    stock: 10,
    ...overrides,
  };
}

describe('orders.util — cálculo de comissão/split (ADR-0001)', () => {
  describe('groupItemsByVendor', () => {
    it('calcula comissão de 5% e valor líquido para um único vendedor', () => {
      const products = new Map([['prod-1', makeProduct()]]);
      const groups = groupItemsByVendor(
        [{ productId: 'prod-1', quantity: 2 }],
        products,
      );

      expect(groups).toHaveLength(1);
      expect(groups[0].grossValue).toBe(200);
      expect(groups[0].commissionValue).toBe(10);
      expect(groups[0].netValue).toBe(190);
    });

    it('agrupa itens de vendedores diferentes em grupos separados', () => {
      const products = new Map([
        [
          'prod-1',
          makeProduct({
            id: 'prod-1',
            vendorId: 'vendor-1',
            walletId: 'wallet-1',
            price: 100,
          }),
        ],
        [
          'prod-2',
          makeProduct({
            id: 'prod-2',
            vendorId: 'vendor-2',
            walletId: 'wallet-2',
            price: 50,
          }),
        ],
      ]);

      const groups = groupItemsByVendor(
        [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 2 },
        ],
        products,
      );

      expect(groups).toHaveLength(2);
      const vendor1 = groups.find((g) => g.vendorId === 'vendor-1');
      const vendor2 = groups.find((g) => g.vendorId === 'vendor-2');
      expect(vendor1?.grossValue).toBe(100);
      expect(vendor2?.grossValue).toBe(100);
    });

    it('soma múltiplos itens do mesmo vendedor no mesmo grupo', () => {
      const products = new Map([
        [
          'prod-1',
          makeProduct({ id: 'prod-1', vendorId: 'vendor-1', price: 30 }),
        ],
        [
          'prod-2',
          makeProduct({ id: 'prod-2', vendorId: 'vendor-1', price: 20 }),
        ],
      ]);

      const groups = groupItemsByVendor(
        [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 1 },
        ],
        products,
      );

      expect(groups).toHaveLength(1);
      expect(groups[0].grossValue).toBe(50);
      expect(groups[0].items).toHaveLength(2);
    });

    it('arredonda a comissão a 2 casas decimais mesmo com valores quebrados', () => {
      const products = new Map([['prod-1', makeProduct({ price: 33.33 })]]);
      const groups = groupItemsByVendor(
        [{ productId: 'prod-1', quantity: 3 }],
        products,
      );

      // grossValue = 99.99; commission = 5% = 4.9995 -> arredonda para 5.00
      expect(groups[0].grossValue).toBe(99.99);
      expect(groups[0].commissionValue).toBe(5);
      expect(groups[0].netValue).toBe(94.99);
    });

    it('rejeita produto de vendedor sem asaas_wallet_id', () => {
      const products = new Map([['prod-1', makeProduct({ walletId: null })]]);
      expect(() =>
        groupItemsByVendor([{ productId: 'prod-1', quantity: 1 }], products),
      ).toThrow();
    });

    it('rejeita produto de vendedor com status diferente de ACTIVE', () => {
      const products = new Map([
        ['prod-1', makeProduct({ vendorStatus: 'PENDING' })],
      ]);
      expect(() =>
        groupItemsByVendor([{ productId: 'prod-1', quantity: 1 }], products),
      ).toThrow();
    });

    it('rejeita quantidade maior que o estoque disponível', () => {
      const products = new Map([['prod-1', makeProduct({ stock: 1 })]]);
      expect(() =>
        groupItemsByVendor([{ productId: 'prod-1', quantity: 2 }], products),
      ).toThrow();
    });

    it('rejeita produto inexistente no mapa de produtos', () => {
      const products = new Map<string, ProductSnapshot>();
      expect(() =>
        groupItemsByVendor(
          [{ productId: 'prod-inexistente', quantity: 1 }],
          products,
        ),
      ).toThrow();
    });
  });

  describe('buildAsaasSplit', () => {
    it('calcula percentualValue com até 4 casas decimais sobre o valor total (frete incluso)', () => {
      const products = new Map([['prod-1', makeProduct({ price: 100 })]]);
      const groups = groupItemsByVendor(
        [{ productId: 'prod-1', quantity: 1 }],
        products,
      );
      // netValue = 95; totalValue = 100 (produto) + 15 (frete) = 115
      const split = buildAsaasSplit(groups, 115);

      expect(split).toHaveLength(1);
      expect(split[0].walletId).toBe('wallet-1');
      // 95 / 115 * 100 = 82.6087 (4 casas)
      expect(split[0].percentualValue).toBeCloseTo(82.6087, 4);
    });

    it('distribui percentuais proporcionais entre múltiplos vendedores', () => {
      const products = new Map([
        [
          'prod-1',
          makeProduct({
            id: 'prod-1',
            vendorId: 'vendor-1',
            walletId: 'wallet-1',
            price: 100,
          }),
        ],
        [
          'prod-2',
          makeProduct({
            id: 'prod-2',
            vendorId: 'vendor-2',
            walletId: 'wallet-2',
            price: 300,
          }),
        ],
      ]);
      const groups = groupItemsByVendor(
        [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 1 },
        ],
        products,
      );

      const split = buildAsaasSplit(groups, 400);
      const totalPercent = split.reduce((acc, s) => acc + s.percentualValue, 0);

      // Nenhum split deve superar o percentual líquido total (comissão + frete ficam com a Ofertix implicitamente)
      expect(totalPercent).toBeLessThan(100);
      expect(totalPercent).toBeGreaterThan(0);
    });

    it('lança erro se o valor total for zero ou negativo', () => {
      const products = new Map([['prod-1', makeProduct()]]);
      const groups = groupItemsByVendor(
        [{ productId: 'prod-1', quantity: 1 }],
        products,
      );
      expect(() => buildAsaasSplit(groups, 0)).toThrow();
    });
  });
});
