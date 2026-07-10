import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);
  private readonly asaasApiKey: string;
  private readonly asaasBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.asaasApiKey = this.configService.get<string>('ASAAS_API_KEY') || '';
    this.asaasBaseUrl = this.configService.get<string>('ASAAS_BASE_URL') || 'https://api-sandbox.asaas.com/v3';
  }

  /**
   * Realiza o onboarding de um vendedor, registrando-o no Asaas e salvando o walletId no banco de dados.
   */
  async onboard(userId: string, email: string, dto: OnboardingDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Verifica se o usuário já possui cadastro na tabela 'vendors'
    const { data: existingVendor, error: checkError } = await supabase
      .from('vendors')
      .select('user_id, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVendor) {
      throw new BadRequestException('Você já concluiu o onboarding de vendedor.');
    }

    // 2. Prepara e limpa os campos para o payload do Asaas
    const cleanedCpfCnpj = dto.cpfCnpj.replace(/\D/g, '');
    const cleanedPhone = dto.phone.replace(/\D/g, '');
    const cleanedPostalCode = dto.postalCode.replace(/\D/g, '');

    // Permite bypassar as chamadas reais ao Asaas em desenvolvimento local/sandbox sem conta PJ
    const simulateAsaas = this.configService.get<string>('SIMULATE_ASAAS') === 'true';
    if (simulateAsaas) {
      const mockWalletId = `wallet_mock_${Math.random().toString(36).substring(2, 11)}`;
      this.logger.log(`[MOCK] Simulando criação de subconta Asaas. WalletID gerado: ${mockWalletId}`);

      const { data: newVendor, error: dbError } = await supabase
        .from('vendors')
        .insert({
          user_id: userId,
          store_name: dto.storeName,
          cpf_cnpj: cleanedCpfCnpj,
          asaas_wallet_id: mockWalletId,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (dbError) {
        this.logger.error(`Erro ao persistir vendedor no banco: ${dbError.message}`);
        throw new BadRequestException(`Erro ao salvar dados do vendedor: ${dbError.message}`);
      }

      return newVendor;
    }

    const asaasPayload: any = {
      name: dto.storeName,
      email: email,
      cpfCnpj: cleanedCpfCnpj,
      phone: cleanedPhone,
      mobilePhone: cleanedPhone,
      address: dto.address,
      addressNumber: dto.addressNumber,
      province: dto.province,
      postalCode: cleanedPostalCode,
      incomeValue: dto.incomeValue ? Number(dto.incomeValue) : 5000,
    };

    if (cleanedCpfCnpj.length === 14) {
      asaasPayload.companyType = 'LIMITED';
    } else {
      if (dto.birthDate) {
        asaasPayload.birthDate = dto.birthDate;
      }
    }

    this.logger.log(`Iniciando onboarding no Asaas para o vendedor: ${dto.storeName}`);

    try {
      // 3. Faz a chamada HTTP para criar a subconta na API do Asaas
      const response = await fetch(`${this.asaasBaseUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.asaasApiKey,
        },
        body: JSON.stringify(asaasPayload),
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonErr) {
        this.logger.error(
          `Resposta da API do Asaas não é um JSON válido. Status: ${response.status}. Corpo: ${responseText.substring(0, 500)}`
        );
        throw new BadRequestException(
          `Falha de comunicação com o gateway de pagamentos (Status ${response.status}).`
        );
      }

      if (!response.ok) {
        this.logger.error(`Erro ao criar subconta no Asaas: ${JSON.stringify(responseData)}`);
        const errorMsg = responseData.errors?.[0]?.description || 'Erro desconhecido na integração com Asaas';
        throw new BadRequestException(`Falha no onboarding do Asaas: ${errorMsg}`);
      }

      // O Asaas retorna o identificador da subconta (walletId) na chave 'walletId'
      const walletId = responseData.walletId;
      if (!walletId) {
        throw new BadRequestException('A API do Asaas não retornou um walletId válido.');
      }

      this.logger.log(`Subconta Asaas criada com sucesso. WalletID: ${walletId}`);

      // 4. Salva o vendedor no nosso banco de dados do Supabase
      const { data: newVendor, error: dbError } = await supabase
        .from('vendors')
        .insert({
          user_id: userId,
          store_name: dto.storeName,
          cpf_cnpj: cleanedCpfCnpj,
          asaas_wallet_id: walletId,
          status: 'ACTIVE', // Definido direto como ACTIVE no MVP/Sandbox para facilitar testes
        })
        .select()
        .single();

      if (dbError) {
        this.logger.error(`Erro ao persistir vendedor no banco: ${dbError.message}`);
        throw new BadRequestException(`Erro ao salvar dados do vendedor: ${dbError.message}`);
      }

      return newVendor;
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`Erro inesperado no onboarding: ${err.message}`);
      throw new BadRequestException(`Erro interno no fluxo de onboarding: ${err.message}`);
    }
  }

  /**
   * Recupera o perfil do vendedor ativo pelo id do usuário.
   */
  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Erro ao buscar perfil de vendedor: ${error.message}`);
    }

    return vendor;
  }
}
