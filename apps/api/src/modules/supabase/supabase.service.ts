import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.error('Supabase URL or Service Role Key is missing in environment variables.');
      throw new Error('Supabase configuration missing');
    }

    // Inicializa o cliente do Supabase utilizando a Service Role Key.
    // Isso permite ao backend rodar operações administrativas e bypassar o RLS
    // para fluxos como sincronização, webhook de pagamento e relatórios do vendedor.
    this.clientInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      // Node <22 has no native WebSocket global, then required by realtime-js.
      realtime: {
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    });
    this.logger.log('Supabase Service Role client initialized successfully.');
  }

  /**
   * Retorna a instância do cliente do Supabase de nível de sistema (Service Role)
   */
  getClient(): SupabaseClient {
    return this.clientInstance;
  }
}
