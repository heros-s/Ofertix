import { Controller, Post, Get, Body, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VendorsService } from './vendors.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * Endpoint para o vendedor logado realizar onboarding financeiro no Asaas.
   */
  @Post('onboarding')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('VENDOR')
  async onboard(
    @CurrentUser() user: any,
    @Body() dto: OnboardingDto,
  ) {
    return this.vendorsService.onboard(user.id, user.email, dto);
  }

  /**
   * Retorna os dados cadastrais do vendedor logado (como store_name, status e asaas_wallet_id).
   */
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('VENDOR')
  async getProfile(@CurrentUser() user: any) {
    return this.vendorsService.getProfile(user.id);
  }

  /**
   * Retorna as informações públicas de um vendedor específico (público).
   */
  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    const vendor = await this.vendorsService.getProfile(id);
    if (!vendor) {
      throw new NotFoundException('Vendedor não encontrado.');
    }
    // Retorna apenas dados públicos essenciais para o consumidor
    return {
      userId: vendor.user_id,
      storeName: vendor.store_name,
      status: vendor.status,
      createdAt: vendor.created_at,
    };
  }
}
