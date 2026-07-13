import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AsaasService } from './asaas.service';

describe('AsaasService (modo SIMULATE_ASAAS)', () => {
  let service: AsaasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsaasService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'SIMULATE_ASAAS' ? 'true' : ''),
          },
        },
      ],
    }).compile();

    service = module.get<AsaasService>(AsaasService);
  });

  it('simula a criação de subconta sem chamar a API real', async () => {
    const result = await service.createSubaccount({
      name: 'Loja Teste',
      email: 'loja@teste.com',
      cpfCnpj: '12345678900',
      phone: '11999999999',
      mobilePhone: '11999999999',
      address: 'Rua Teste',
      addressNumber: '1',
      province: 'Centro',
      postalCode: '01000000',
      incomeValue: 5000,
    });

    expect(result.walletId).toMatch(/^wallet_mock_/);
  });

  it('simula a busca/criação de cliente de forma determinística pelo CPF/CNPJ', async () => {
    const first = await service.findOrCreateCustomer({
      name: 'Consumidor Teste',
      email: 'consumidor@teste.com',
      cpfCnpj: '98765432100',
    });
    const second = await service.findOrCreateCustomer({
      name: 'Consumidor Teste',
      email: 'consumidor@teste.com',
      cpfCnpj: '98765432100',
    });

    expect(first.customerId).toBe(second.customerId);
  });

  it('simula a criação de cobrança com split retornando invoiceUrl', async () => {
    const payment = await service.createPaymentWithSplit({
      customer: 'cus_mock_123',
      billingType: 'PIX',
      value: 100,
      dueDate: '2026-07-12',
      split: [{ walletId: 'wallet_mock_abc', percentualValue: 95 }],
    });

    expect(payment.id).toMatch(/^pay_mock_/);
    expect(payment.invoiceUrl).toContain(payment.id);
    expect(payment.status).toBe('PENDING');
  });
});
