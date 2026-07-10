import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../modules/supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException('Cabeçalho de autorização não enviado');
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Formato do token inválido. Use "Bearer <JWT>"');
    }

    const token = parts[1];
    const supabase = this.supabaseService.getClient();

    // 1. Valida o token JWT diretamente na API do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    // 2. Recupera o perfil público e o tipo de usuário (CONSUMER/VENDOR) no banco de dados
    const { data: profile, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      throw new UnauthorizedException('Perfil do usuário não encontrado na base de dados');
    }

    // 3. Vincula os dados normalizados ao objeto da requisição
    request.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      type: profile.type,
      avatarUrl: profile.avatar_url,
      createdAt: profile.created_at,
    };

    return true;
  }
}
