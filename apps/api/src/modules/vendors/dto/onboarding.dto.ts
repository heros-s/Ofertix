export class OnboardingDto {
  storeName: string;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  province: string;
  incomeValue?: number; // Faturamento estimado mensal (opcional)
  birthDate?: string; // Data de nascimento (obrigatório para CPF)
}

