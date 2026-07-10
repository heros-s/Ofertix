'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Envia os dados cadastrais do vendedor para o backend NestJS para realizar o onboarding financeiro no Asaas.
 */
export async function onboardSeller(prevState: any, formData: FormData) {
  const storeName = formData.get('storeName') as string;
  const cpfCnpj = formData.get('cpfCnpj') as string;
  const phone = formData.get('phone') as string;
  const birthDate = formData.get('birthDate') as string;
  const incomeValueStr = formData.get('incomeValue') as string;
  const postalCode = formData.get('postalCode') as string;
  const address = formData.get('address') as string;
  const addressNumber = formData.get('addressNumber') as string;
  const province = formData.get('province') as string;

  const isCpf = cpfCnpj?.replace(/\D/g, '').length === 11;

  if (
    !storeName ||
    !cpfCnpj ||
    !phone ||
    !postalCode ||
    !address ||
    !addressNumber ||
    !province ||
    !incomeValueStr ||
    (isCpf && !birthDate)
  ) {
    return { error: 'Todos os campos obrigatórios do formulário de onboarding devem ser preenchidos.' };
  }

  const incomeValue = incomeValueStr ? parseFloat(incomeValueStr) : undefined;

  const supabase = await createClient();

  // 1. Obtém a sessão ativa e o token JWT do usuário logado
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { error: 'Você precisa estar logado para realizar esta operação.' };
  }

  const jwtToken = session.access_token;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  try {
    // 2. Faz a chamada HTTP para o backend NestJS passando o JWT no header Authorization
    const response = await fetch(`${backendUrl}/vendors/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        storeName,
        cpfCnpj,
        phone,
        birthDate: birthDate || undefined,
        incomeValue,
        postalCode,
        address,
        addressNumber,
        province,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return { error: responseData.message || 'Falha ao processar onboarding com o Asaas.' };
    }

    // 3. Atualiza os dados da rota do dashboard para refletir o novo status do vendedor
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: `Erro de conexão com o servidor: ${err.message}` };
  }
}
