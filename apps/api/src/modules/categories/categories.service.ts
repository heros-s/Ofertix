import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async onModuleInit() {
    await this.seedCategories();
  }

  /**
   * Retorna a lista de todas as categorias cadastradas no banco de dados.
   */
  async findAll() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`Erro ao buscar categorias: ${error.message}`);
      throw new Error(`Erro ao buscar categorias: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Insere categorias básicas na tabela caso o banco de dados esteja vazio.
   */
  private async seedCategories() {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Verifica se já existem categorias cadastradas
      const { count, error: countError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.logger.warn(`Não foi possível verificar categorias para seed: ${countError.message}`);
        return;
      }

      if (count !== null && count > 0) {
        this.logger.log('Banco de dados já possui categorias. Ignorando seed.');
        return;
      }

      this.logger.log('Tabela de categorias está vazia. Iniciando seed de categorias...');

      const defaultCategories = [
        { name: 'Eletrônicos', slug: 'eletronicos' },
        { name: 'Moda e Acessórios', slug: 'moda-e-acessorios' },
        { name: 'Casa e Cozinha', slug: 'casa-e-cozinha' },
        { name: 'Esportes e Lazer', slug: 'esportes-e-lazer' },
        { name: 'Beleza e Saúde', slug: 'beleza-e-saude' },
        { name: 'Brinquedos e Jogos', slug: 'brinquedos-e-jogos' },
        { name: 'Livros e Papelaria', slug: 'livros-e-papelaria' },
      ];

      const { error: insertError } = await supabase
        .from('categories')
        .insert(defaultCategories);

      if (insertError) {
        this.logger.error(`Erro ao rodar seed de categorias: ${insertError.message}`);
      } else {
        this.logger.log('Seed de categorias inserido com sucesso!');
      }
    } catch (err: any) {
      this.logger.error(`Erro inesperado no seed de categorias: ${err.message}`);
    }
  }
}
