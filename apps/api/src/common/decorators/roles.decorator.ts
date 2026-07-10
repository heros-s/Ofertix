import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator para definir permissões necessárias em uma rota (ex: @Roles('VENDOR')).
 */
export const Roles = (...roles: ('CONSUMER' | 'VENDOR')[]) => SetMetadata(ROLES_KEY, roles);
