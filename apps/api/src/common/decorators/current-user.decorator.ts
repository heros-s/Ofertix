import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para injetar os dados do usuário autenticado no Controller.
 * O usuário é inserido na requisição pelo `AuthGuard`.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
