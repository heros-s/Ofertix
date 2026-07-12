'use client';

import { useActionState, useState } from 'react';
import { onboardSeller } from '../actions';
import { ArrowRight } from 'lucide-react';

export default function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(onboardSeller, { error: null });
  const [cpfCnpjValue, setCpfCnpjValue] = useState('');

  const isCpf = cpfCnpjValue.replace(/\D/g, '').length === 11;

  const preventNonNumerical = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
  };

  const handleCpfCnpjInput = (e: React.FormEvent<HTMLInputElement>) => {
    preventNonNumerical(e);
    setCpfCnpjValue(e.currentTarget.value);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg text-center font-medium">
          {state.error}
        </div>
      )}

      {/* Grid de dados básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="storeName" className="block text-sm font-semibold text-slate-700">
            Nome da Loja
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            disabled={isPending}
            placeholder="Minha Loja Eletrônica"
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="cpfCnpj" className="block text-sm font-semibold text-slate-700">
            CPF ou CNPJ
          </label>
          <input
            id="cpfCnpj"
            name="cpfCnpj"
            type="text"
            required
            disabled={isPending}
            onInput={handleCpfCnpjInput}
            placeholder="Apenas números"
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
            Telefone / Celular
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            required
            onInput={preventNonNumerical}
            disabled={isPending}
            placeholder="Apenas números"
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="birthDate" className="block text-sm font-semibold text-slate-700">
            Data de Nascimento {isCpf && <span className="text-rose-500 font-normal text-xs">*</span>}
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            required={isCpf}
            disabled={isPending}
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="incomeValue" className="block text-sm font-semibold text-slate-700">
            Faturamento Mensal Estimado
          </label>
          <input
            id="incomeValue"
            name="incomeValue"
            type="text"
            required
            onInput={preventNonNumerical}
            disabled={isPending}
            placeholder="Ex: 5000"
            className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="border-t border-slate-200 pt-6 space-y-6">
        <h3 className="text-base font-semibold text-slate-900">Endereço da Loja</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label htmlFor="postalCode" className="block text-sm font-semibold text-slate-700">
              CEP
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              required
              onInput={preventNonNumerical}
              disabled={isPending}
              placeholder="00000000"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-semibold text-slate-700">
              Logradouro (Rua / Av)
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              disabled={isPending}
              placeholder="Rua das Palmeiras"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="addressNumber" className="block text-sm font-semibold text-slate-700">
              Número
            </label>
            <input
              id="addressNumber"
              name="addressNumber"
              type="text"
              required
              onInput={preventNonNumerical}
              disabled={isPending}
              placeholder="123"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-semibold text-slate-700">
              Bairro
            </label>
            <input
              id="province"
              name="province"
              type="text"
              required
              disabled={isPending}
              placeholder="Centro"
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 disabled:opacity-50 text-sm transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-primary-600/10 hover:from-primary-600 hover:to-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
        >
          {isPending ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Criar Subconta Asaas <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
