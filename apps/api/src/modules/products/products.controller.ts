import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Endpoint de criação de produto. Apenas para usuários autenticados com perfil VENDOR.
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('VENDOR')
  async create(@Request() req: any, @Body() dto: CreateProductDto) {
    const vendorId = req.user.id;
    return await this.productsService.create(vendorId, dto);
  }

  /**
   * Endpoint de listagem de produtos com filtros (público).
   */
  @Get()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    const activeOnly = active !== 'false';
    return await this.productsService.findAll({ categoryId, vendorId, activeOnly, search });
  }

  /**
   * Endpoint de busca de produto por ID (público).
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }

  /**
   * Endpoint de atualização de produto. Apenas o vendedor dono do produto pode realizar.
   */
  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('VENDOR')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    const vendorId = req.user.id;
    return await this.productsService.update(id, vendorId, dto);
  }

  /**
   * Endpoint de exclusão física de produto. Apenas o vendedor dono do produto pode realizar.
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('VENDOR')
  async remove(@Param('id') id: string, @Request() req: any) {
    const vendorId = req.user.id;
    return await this.productsService.deletePhysical(id, vendorId);
  }
}
