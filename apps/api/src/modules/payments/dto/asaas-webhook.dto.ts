export class AsaasWebhookPaymentDto {
  id: string;
  status: string;
}

export class AsaasWebhookDto {
  event: string;
  payment: AsaasWebhookPaymentDto;
}
