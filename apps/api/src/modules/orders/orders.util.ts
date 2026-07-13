/**
 * ADR-0001: cálculo puro de comissão/split, isolado de I/O (Supabase/Asaas) para
 * permitir teste unitário direto — ver docs/decisions/0001-implementar-orders-payments-split-asaas.md
 */

export const OFERTIX_COMMISSION_RATE = 0.05;

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface ProductSnapshot {
  id: string;
  vendorId: string;
  walletId: string | null;
  vendorStatus: string;
  price: number;
  stock: number;
}

export interface OrderItemLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface VendorGroup {
  vendorId: string;
  walletId: string;
  grossValue: number;
  commissionValue: number;
  netValue: number;
  items: OrderItemLine[];
}

export interface AsaasSplitEntry {
  walletId: string;
  percentualValue: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Agrupa os itens do carrinho por vendedor, validando estoque e pré-requisito de
 * onboarding (asaas_wallet_id + status ACTIVE) antes de calcular valores.
 */
export function groupItemsByVendor(
  items: OrderItemInput[],
  products: Map<string, ProductSnapshot>,
): VendorGroup[] {
  const groups = new Map<string, VendorGroup>();

  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) {
      throw new Error(`Produto ${item.productId} não encontrado.`);
    }
    if (!product.walletId || product.vendorStatus !== 'ACTIVE') {
      throw new Error(
        `O vendedor do produto "${product.id}" ainda não concluiu o onboarding financeiro e não pode receber pagamentos.`,
      );
    }
    if (item.quantity <= 0) {
      throw new Error(`Quantidade inválida para o produto ${item.productId}.`);
    }
    if (item.quantity > product.stock) {
      throw new Error(`Estoque insuficiente para o produto ${item.productId}.`);
    }

    const lineTotal = round2(product.price * item.quantity);
    const existing = groups.get(product.vendorId);
    if (existing) {
      existing.grossValue = round2(existing.grossValue + lineTotal);
      existing.items.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    } else {
      groups.set(product.vendorId, {
        vendorId: product.vendorId,
        walletId: product.walletId,
        grossValue: lineTotal,
        commissionValue: 0,
        netValue: 0,
        items: [
          {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
          },
        ],
      });
    }
  }

  const result = Array.from(groups.values());
  for (const group of result) {
    group.commissionValue = round2(group.grossValue * OFERTIX_COMMISSION_RATE);
    group.netValue = round2(group.grossValue - group.commissionValue);
  }
  return result;
}

/**
 * Monta o array `split[]` da Asaas: percentualValue de cada vendedor sobre o valor
 * total cobrado (frete + comissão não entram no split, ficando implicitamente com a
 * conta Ofertix). Percentuais com até 4 casas decimais, conforme regra da Asaas.
 */
export function buildAsaasSplit(
  vendorGroups: VendorGroup[],
  totalValue: number,
): AsaasSplitEntry[] {
  if (totalValue <= 0) {
    throw new Error(
      'Valor total do pedido deve ser maior que zero para calcular o split.',
    );
  }

  return vendorGroups.map((group) => ({
    walletId: group.walletId,
    percentualValue: round4((group.netValue / totalValue) * 100),
  }));
}
