import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AsaasSplitItem {
  walletId: string;
  percentualValue?: number;
  fixedValue?: number;
}

export interface CreateSubaccountPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  province: string;
  postalCode: string;
  incomeValue: number;
  companyType?: string;
  birthDate?: string;
}

export interface FindOrCreateCustomerPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

export interface CreatePaymentWithSplitPayload {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description?: string;
  split: AsaasSplitItem[];
}

export interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  status: string;
}

/**
 * ADR-0001: cliente único para a API da Asaas, compartilhado entre vendors (onboarding)
 * e orders/payments (cobrança com split), garantindo que ambos respeitem exatamente
 * a mesma semântica de sandbox (SIMULATE_ASAAS) e o mesmo tratamento de erro.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly simulate: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('ASAAS_BASE_URL') ||
      'https://api-sandbox.asaas.com/v3';
    this.simulate = this.configService.get<string>('SIMULATE_ASAAS') === 'true';
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      this.logger.error(
        `Resposta da Asaas não é um JSON válido. Status: ${response.status}. Corpo: ${responseText.substring(0, 500)}`,
      );
      throw new BadRequestException(
        `Falha de comunicação com o gateway de pagamentos (status ${response.status}).`,
      );
    }

    if (!response.ok) {
      this.logger.error(
        `Erro na chamada Asaas ${method} ${path}: ${JSON.stringify(responseData)}`,
      );
      const errorMsg =
        responseData.errors?.[0]?.description ||
        'Erro desconhecido na integração com Asaas';
      throw new BadRequestException(
        `Falha na comunicação com a Asaas: ${errorMsg}`,
      );
    }

    return responseData as T;
  }

  async createSubaccount(
    payload: CreateSubaccountPayload,
  ): Promise<{ walletId: string }> {
    if (this.simulate) {
      const mockWalletId = `wallet_mock_${Math.random().toString(36).substring(2, 11)}`;
      this.logger.log(
        `[MOCK] Simulando criação de subconta Asaas. WalletID gerado: ${mockWalletId}`,
      );
      return { walletId: mockWalletId };
    }

    const responseData = await this.request<any>('POST', '/accounts', payload);
    if (!responseData.walletId) {
      throw new BadRequestException(
        'A API do Asaas não retornou um walletId válido.',
      );
    }
    return { walletId: responseData.walletId };
  }

  async findOrCreateCustomer(
    payload: FindOrCreateCustomerPayload,
  ): Promise<{ customerId: string }> {
    if (this.simulate) {
      const mockCustomerId = `cus_mock_${payload.cpfCnpj}`;
      this.logger.log(
        `[MOCK] Simulando cliente Asaas para CPF/CNPJ ${payload.cpfCnpj}: ${mockCustomerId}`,
      );
      return { customerId: mockCustomerId };
    }

    const existing = await this.request<any>(
      'GET',
      `/customers?cpfCnpj=${encodeURIComponent(payload.cpfCnpj)}`,
    );
    if (existing?.data?.length > 0) {
      return { customerId: existing.data[0].id };
    }

    const created = await this.request<any>('POST', '/customers', {
      name: payload.name,
      email: payload.email,
      cpfCnpj: payload.cpfCnpj,
      phone: payload.phone,
    });
    return { customerId: created.id };
  }

  async createPaymentWithSplit(
    payload: CreatePaymentWithSplitPayload,
  ): Promise<AsaasPayment> {
    if (this.simulate) {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
      this.logger.log(
        `[MOCK] Simulando cobrança Asaas com split. PaymentID gerado: ${mockPaymentId}`,
      );
      return {
        id: mockPaymentId,
        invoiceUrl: `https://sandbox.asaas.com/mock-invoice/${mockPaymentId}`,
        status: 'PENDING',
      };
    }

    const responseData = await this.request<any>('POST', '/payments', payload);
    return {
      id: responseData.id,
      invoiceUrl: responseData.invoiceUrl,
      status: responseData.status,
    };
  }

  async getPayment(paymentId: string): Promise<{ id: string; status: string }> {
    if (this.simulate) {
      return { id: paymentId, status: 'CONFIRMED' };
    }
    return this.request<any>('GET', `/payments/${paymentId}`);
  }
}
