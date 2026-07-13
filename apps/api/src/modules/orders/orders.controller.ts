import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Fachada única de checkout: agrupa o carrinho por vendedor, calcula o split e
   * cria a cobrança na Asaas antes de persistir o Pedido (ADR-0001).
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONSUMER')
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CONSUMER')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOneForConsumer(id, user.id);
  }
}
