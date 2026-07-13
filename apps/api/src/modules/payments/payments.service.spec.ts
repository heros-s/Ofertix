import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

function buildSupabaseMock(insertResult: { error: any }) {
  const eq = jest.fn().mockReturnThis();
  const update = jest.fn().mockReturnValue({ eq });
  const insert = jest.fn().mockResolvedValue(insertResult);

  const from = jest.fn().mockReturnValue({ insert, update, eq });

  return { getClient: () => ({ from }) } as unknown as SupabaseService;
}

describe('PaymentsService — idempotência do webhook (ADR-0001)', () => {
  let ordersService: { updateStatusByAsaasPaymentId: jest.Mock };

  beforeEach(() => {
    ordersService = { updateStatusByAsaasPaymentId: jest.fn() };
  });

  async function createService(supabaseService: SupabaseService) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    return module.get<PaymentsService>(PaymentsService);
  }

  it('processa e atualiza status na primeira chegada do evento', async () => {
    const supabaseService = buildSupabaseMock({ error: null });
    const service = await createService(supabaseService);

    const dto = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_123', status: 'CONFIRMED' },
    };
    const result = await service.handleWebhook(dto, dto);

    expect(result).toEqual({ received: true });
    expect(ordersService.updateStatusByAsaasPaymentId).toHaveBeenCalledWith(
      'pay_123',
      'PAID',
      'PAID',
    );
  });

  it('ignora reentrega do mesmo evento sem reprocessar (violação de unicidade 23505)', async () => {
    const supabaseService = buildSupabaseMock({
      error: { code: '23505', message: 'duplicate key' },
    });
    const service = await createService(supabaseService);

    const dto = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_123', status: 'CONFIRMED' },
    };
    const result = await service.handleWebhook(dto, dto);

    expect(result).toEqual({ received: true });
    expect(ordersService.updateStatusByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('mapeia PAYMENT_REFUNDED para order REFUNDED e sub_order CANCELLED', async () => {
    const supabaseService = buildSupabaseMock({ error: null });
    const service = await createService(supabaseService);

    const dto = {
      event: 'PAYMENT_REFUNDED',
      payment: { id: 'pay_456', status: 'REFUNDED' },
    };
    await service.handleWebhook(dto, dto);

    expect(ordersService.updateStatusByAsaasPaymentId).toHaveBeenCalledWith(
      'pay_456',
      'REFUNDED',
      'CANCELLED',
    );
  });

  it('ignora payload sem payment.id sem lançar erro', async () => {
    const supabaseService = buildSupabaseMock({ error: null });
    const service = await createService(supabaseService);

    const result = await service.handleWebhook(
      { event: 'PAYMENT_CONFIRMED', payment: undefined as any },
      {},
    );

    expect(result).toEqual({ received: true });
    expect(ordersService.updateStatusByAsaasPaymentId).not.toHaveBeenCalled();
  });
});
