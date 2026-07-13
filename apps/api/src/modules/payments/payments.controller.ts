import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AsaasWebhookDto } from './dto/asaas-webhook.dto';
import { AsaasWebhookGuard } from './guards/asaas-webhook.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @UseGuards(AsaasWebhookGuard)
  async handleWebhook(@Body() dto: AsaasWebhookDto) {
    return this.paymentsService.handleWebhook(dto, dto);
  }
}
