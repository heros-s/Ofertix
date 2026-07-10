import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getAll() {
    try {
      return await this.categoriesService.findAll();
    } catch (err: any) {
      throw new InternalServerErrorException(err.message || 'Erro ao carregar categorias.');
    }
  }
}
