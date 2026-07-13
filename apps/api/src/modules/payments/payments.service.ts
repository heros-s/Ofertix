import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';
import { AsaasWebhookDto } from './dto/asaas-webhook.dto';

const CONFIRMATION_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const REFUND_EVENTS = ['PAYMENT_REFUNDED'];

// ADR-0001: idempotência via tabela payment_webhook_events (constraint única em
// asaas_payment_id + event) — grava o evento antes de processar; se já existir, ignora.
// Ver: docs/decisions/0001-implementar-orders-payments-split-asaas.md
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly ordersService: OrdersService,
  ) {}

  async handleWebhook(dto: AsaasWebhookDto, rawPayload: unknown) {
    const supabase = this.supabaseService.getClient();
    const asaasPaymentId = dto.payment?.id;

    if (!asaasPaymentId || !dto.event) {
      this.logger.warn(
        `Webhook Asaas recebido com payload inesperado: ${JSON.stringify(rawPayload)}`,
      );
      return { received: true };
    }

    const { error: insertError } = await supabase
      .from('payment_webhook_events')
      .insert({
        asaas_payment_id: asaasPaymentId,
        event: dto.event,
        payload: rawPayload,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        this.logger.log(
          `Evento ${dto.event} para o pagamento ${asaasPaymentId} já foi processado. Ignorando.`,
        );
        return { received: true };
      }
      this.logger.error(
        `Erro ao registrar evento de webhook: ${insertError.message}`,
      );
      return { received: true };
    }

    if (CONFIRMATION_EVENTS.includes(dto.event)) {
      await this.ordersService.updateStatusByAsaasPaymentId(
        asaasPaymentId,
        'PAID',
        'PAID',
      );
    } else if (REFUND_EVENTS.includes(dto.event)) {
      // sub_order_status não possui valor REFUNDED — CANCELLED é o estado terminal mais
      // próximo para os sub-pedidos quando a cobrança "pai" é totalmente estornada.
      await this.ordersService.updateStatusByAsaasPaymentId(
        asaasPaymentId,
        'REFUNDED',
        'CANCELLED',
      );
    } else {
      this.logger.log(
        `Evento ${dto.event} recebido para ${asaasPaymentId}, sem transição de status configurada.`,
      );
    }

    await supabase
      .from('payment_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('asaas_payment_id', asaasPaymentId)
      .eq('event', dto.event);

    return { received: true };
  }
}
