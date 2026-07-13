import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AsaasService } from '../asaas/asaas.service';
import { OnboardingDto } from './dto/onboarding.dto';

// ADR-0001: onboarding passa a usar o AsaasService compartilhado em vez de fetch() próprio.
// Ver: docs/decisions/0001-implementar-orders-payments-split-asaas.md
@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly asaasService: AsaasService,
  ) {}

  /**
   * Realiza o onboarding de um vendedor, registrando-o no Asaas e salvando o walletId no banco de dados.
   */
  async onboard(userId: string, email: string, dto: OnboardingDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Verifica se o usuário já possui cadastro na tabela 'vendors'
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('user_id, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVendor) {
      throw new BadRequestException(
        'Você já concluiu o onboarding de vendedor.',
      );
    }

    // 2. Prepara e limpa os campos para o payload do Asaas
    const cleanedCpfCnpj = dto.cpfCnpj.replace(/\D/g, '');
    const cleanedPhone = dto.phone.replace(/\D/g, '');
    const cleanedPostalCode = dto.postalCode.replace(/\D/g, '');

    const asaasPayload: any = {
      name: dto.storeName,
      email,
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
    } else if (dto.birthDate) {
      asaasPayload.birthDate = dto.birthDate;
    }

    this.logger.log(
      `Iniciando onboarding no Asaas para o vendedor: ${dto.storeName}`,
    );

    // 3. Cria a subconta na Asaas (respeitando SIMULATE_ASAAS internamente)
    const { walletId } = await this.asaasService.createSubaccount(asaasPayload);
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
      this.logger.error(
        `Erro ao persistir vendedor no banco: ${dbError.message}`,
      );
      throw new BadRequestException(
        `Erro ao salvar dados do vendedor: ${dbError.message}`,
      );
    }

    return newVendor;
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
      throw new BadRequestException(
        `Erro ao buscar perfil de vendedor: ${error.message}`,
      );
    }

    return vendor;
  }
}
