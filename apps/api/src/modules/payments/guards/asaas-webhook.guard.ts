import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ADR-0001: autentica o webhook da Asaas via token estático (header asaas-access-token),
 * configurado manualmente no painel da Asaas e comparado a ASAAS_WEBHOOK_TOKEN.
 */
@Injectable()
export class AsaasWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['asaas-access-token'];
    const expected = this.configService.get<string>('ASAAS_WEBHOOK_TOKEN');

    if (!expected || token !== expected) {
      throw new UnauthorizedException('Token do webhook inválido.');
    }

    return true;
  }
}
