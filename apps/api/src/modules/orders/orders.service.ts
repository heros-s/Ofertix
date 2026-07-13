import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AsaasService } from '../asaas/asaas.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  groupItemsByVendor,
  buildAsaasSplit,
  ProductSnapshot,
} from './orders.util';

// ADR-0001: orders só cuida de agregar carrinho + calcular split + persistir
// Pedido/SubPedido/ItensPedido. A chamada à Asaas é síncrona e só persiste em caso de sucesso.
// Ver: docs/decisions/0001-implementar-orders-payments-split-asaas.md
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly asaasService: AsaasService,
  ) {}

  async create(consumerId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('O carrinho não pode estar vazio.');
    }

    const supabase = this.supabaseService.getClient();

    const { data: consumer, error: consumerError } = await supabase
      .from('users')
      .select('id, name, email, phone, cpf')
      .eq('id', consumerId)
      .single();

    if (consumerError || !consumer) {
      throw new BadRequestException(
        'Não foi possível localizar seus dados de cadastro.',
      );
    }
    if (!consumer.cpf) {
      throw new BadRequestException(
        'Complete seu cadastro com CPF antes de finalizar a compra.',
      );
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, vendor_id, price, stock, vendors (asaas_wallet_id, status)')
      .in('id', productIds);

    if (productsError) {
      this.logger.error(
        `Erro ao buscar produtos do pedido: ${productsError.message}`,
      );
      throw new BadRequestException('Erro ao validar os produtos do carrinho.');
    }
    if (!products || products.length !== productIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos do carrinho não foram encontrados.',
      );
    }

    const productMap = new Map<string, ProductSnapshot>(
      products.map((p: any) => [
        p.id,
        {
          id: p.id,
          vendorId: p.vendor_id,
          walletId: p.vendors?.asaas_wallet_id ?? null,
          vendorStatus: p.vendors?.status ?? 'PENDING',
          price: Number(p.price),
          stock: p.stock,
        },
      ]),
    );

    let vendorGroups;
    try {
      vendorGroups = groupItemsByVendor(dto.items, productMap);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    const grossTotal = vendorGroups.reduce((acc, g) => acc + g.grossValue, 0);
    const shippingValue = dto.shippingValue ?? 0;
    const totalValue = Math.round((grossTotal + shippingValue) * 100) / 100;

    let split;
    try {
      split = buildAsaasSplit(vendorGroups, totalValue);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    const { customerId } = await this.asaasService.findOrCreateCustomer({
      name: consumer.name,
      email: consumer.email,
      cpfCnpj: consumer.cpf,
      phone: consumer.phone,
    });

    const dueDate = new Date().toISOString().slice(0, 10);
    const payment = await this.asaasService.createPaymentWithSplit({
      customer: customerId,
      billingType: dto.paymentMethod,
      value: totalValue,
      dueDate,
      description: 'Pedido Ofertix',
      split,
    });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumerId,
        status: 'PENDING',
        total_value: totalValue,
        shipping_address: dto.shippingAddress,
        shipping_value: shippingValue,
        asaas_payment_id: payment.id,
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error(
        `Cobrança Asaas ${payment.id} foi criada, mas falhou ao persistir o pedido: ${orderError.message}`,
      );
      throw new BadRequestException(
        'Erro ao registrar o pedido. Entre em contato com o suporte informando o horário desta tentativa.',
      );
    }

    for (const group of vendorGroups) {
      const { data: subOrder, error: subOrderError } = await supabase
        .from('sub_orders')
        .insert({
          order_id: order.id,
          vendor_id: group.vendorId,
          status: 'PENDING',
          gross_value: group.grossValue,
          commission_value: group.commissionValue,
          net_value: group.netValue,
        })
        .select()
        .single();

      if (subOrderError) {
        this.logger.error(
          `Erro ao criar sub-pedido para vendedor ${group.vendorId}: ${subOrderError.message}`,
        );
        throw new BadRequestException('Erro ao registrar os itens do pedido.');
      }

      const orderItemsPayload = group.items.map((item) => ({
        sub_order_id: subOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);
      if (itemsError) {
        this.logger.error(
          `Erro ao inserir itens do sub-pedido ${subOrder.id}: ${itemsError.message}`,
        );
        throw new BadRequestException('Erro ao registrar os itens do pedido.');
      }
    }

    return {
      orderId: order.id,
      asaasPaymentId: payment.id,
      invoiceUrl: payment.invoiceUrl,
      status: order.status,
      totalValue,
    };
  }

  async findOneForConsumer(orderId: string, consumerId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, sub_orders (*, vendors (store_name))')
      .eq('id', orderId)
      .eq('consumer_id', consumerId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Erro ao buscar pedido: ${error.message}`);
    }
    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    return order;
  }

  /**
   * Aplica a transição de status de um pedido e seus sub-pedidos a partir de um
   * evento de webhook da Asaas já validado como idempotente pelo PaymentsService.
   */
  async updateStatusByAsaasPaymentId(
    asaasPaymentId: string,
    orderStatus: string,
    subOrderStatus: string,
  ) {
    const supabase = this.supabaseService.getClient();

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id')
      .eq('asaas_payment_id', asaasPaymentId)
      .maybeSingle();

    if (findError) {
      this.logger.error(
        `Erro ao localizar pedido pelo asaas_payment_id ${asaasPaymentId}: ${findError.message}`,
      );
      return;
    }
    if (!order) {
      this.logger.warn(
        `Webhook recebido para asaas_payment_id ${asaasPaymentId} sem pedido correspondente.`,
      );
      return;
    }

    await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', order.id);
    await supabase
      .from('sub_orders')
      .update({ status: subOrderStatus })
      .eq('order_id', order.id);
  }
}
