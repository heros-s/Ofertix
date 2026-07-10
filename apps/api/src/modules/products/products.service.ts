import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Cadastra um novo produto para o vendedor.
   * Valida se o vendedor concluiu o onboarding e está com status ACTIVE no banco.
   */
  async create(vendorId: string, dto: CreateProductDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Verifica se o vendedor concluiu o onboarding financeiro (status ACTIVE e asaas_wallet_id não nulo)
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('status, asaas_wallet_id')
      .eq('user_id', vendorId)
      .maybeSingle();

    if (vendorError || !vendor) {
      throw new ForbiddenException(
        'Onboarding incompleto. Você precisa configurar sua carteira Asaas antes de publicar produtos.'
      );
    }

    if (vendor.status !== 'ACTIVE' || !vendor.asaas_wallet_id) {
      throw new ForbiddenException(
        'Sua conta de vendedor no Asaas ainda não está ativa. Por favor, conclua o fluxo de onboarding.'
      );
    }

    // 2. Validações básicas do produto
    if (dto.price <= 0) {
      throw new BadRequestException('O preço do produto deve ser maior que zero.');
    }

    if (dto.stock < 0) {
      throw new BadRequestException('O estoque do produto não pode ser negativo.');
    }

    // 3. Insere o produto
    const { data: newProduct, error: dbError } = await supabase
      .from('products')
      .insert({
        vendor_id: vendorId,
        category_id: dto.categoryId || null,
        name: dto.name,
        description: dto.description || null,
        price: dto.price,
        stock: dto.stock,
        images: dto.images || [],
        active: dto.active !== undefined ? dto.active : true,
      })
      .select()
      .single();

    if (dbError) {
      this.logger.error(`Erro ao inserir produto no Supabase: ${dbError.message}`);
      throw new BadRequestException(`Erro ao cadastrar produto: ${dbError.message}`);
    }

    return newProduct;
  }

  /**
   * Busca produtos com base em filtros opcionais.
   */
  async findAll(filters: { categoryId?: string; vendorId?: string; activeOnly?: boolean; search?: string }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase.from('products').select(`
      *,
      categories (id, name, slug),
      vendors (user_id, store_name, status)
    `);

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.activeOnly !== false) {
      query = query.eq('active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Erro ao buscar produtos: ${error.message}`);
      throw new BadRequestException(`Erro ao buscar produtos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca um produto específico pelo ID.
   */
  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (id, name, slug),
        vendors (user_id, store_name, status)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Erro ao buscar produto ${id}: ${error.message}`);
      throw new BadRequestException(`Erro ao buscar produto: ${error.message}`);
    }

    if (!product) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }

    return product;
  }

  /**
   * Atualiza as informações de um produto.
   * Apenas o próprio vendedor dono do produto pode alterá-lo.
   */
  async update(id: string, vendorId: string, dto: Partial<CreateProductDto>) {
    const supabase = this.supabaseService.getClient();

    // 1. Verifica se o produto existe e pertence ao vendedor
    const product = await this.findOne(id);
    if (product.vendor_id !== vendorId) {
      throw new ForbiddenException('Acesso negado. Este produto pertence a outro vendedor.');
    }

    // 2. Atualiza os dados
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.categoryId !== undefined) updateData.category_id = dto.categoryId || null;
    if (dto.price !== undefined) {
      if (dto.price <= 0) throw new BadRequestException('O preço do produto deve ser maior que zero.');
      updateData.price = dto.price;
    }
    if (dto.stock !== undefined) {
      if (dto.stock < 0) throw new BadRequestException('O estoque do produto não pode ser negativo.');
      updateData.stock = dto.stock;
    }
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.active !== undefined) updateData.active = dto.active;

    const { data: updatedProduct, error: dbError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (dbError) {
      this.logger.error(`Erro ao atualizar produto ${id}: ${dbError.message}`);
      throw new BadRequestException(`Erro ao atualizar produto: ${dbError.message}`);
    }

    return updatedProduct;
  }

  /**
   * Exclui fisicamente um produto do banco de dados.
   * Lança erro caso o produto esteja vinculado a algum pedido existente (integridade referencial).
   */
  async deletePhysical(id: string, vendorId: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Verifica se o produto existe e pertence ao vendedor
    const product = await this.findOne(id);
    if (product.vendor_id !== vendorId) {
      throw new ForbiddenException('Acesso negado. Este produto pertence a outro vendedor.');
    }

    // 2. Tenta deletar fisicamente do banco
    const { error: dbError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (dbError) {
      this.logger.error(`Erro ao excluir fisicamente o produto ${id}: ${dbError.message}`);

      // Código 23503 do PostgreSQL indica violação de chave estrangeira
      if (dbError.code === '23503') {
        throw new BadRequestException(
          'Este produto não pode ser excluído definitivamente pois está associado a pedidos existentes. Você pode inativá-lo para ocultá-lo da loja.'
        );
      }

      throw new BadRequestException(`Erro ao excluir produto: ${dbError.message}`);
    }

    return { success: true };
  }
}
