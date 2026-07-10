'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signup } from '../actions';
import { ShoppingBag, ArrowRight, User, Store, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signup, { error: null, success: false });
  const [accountType, setAccountType] = useState<'CONSUMER' | 'VENDOR'>('CONSUMER');

  if (state?.success) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-100 via-indigo-50/30 to-slate-100">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-6 border border-slate-200 shadow-2xl sm:rounded-2xl sm:px-10 text-center space-y-6">
            <div className="inline-flex p-3 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Conta criada com sucesso!
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Obrigado por se cadastrar na Ofertix. Caso seu projeto Supabase exija confirmação de e-mail, verifique sua caixa de entrada antes de fazer login.
            </p>
            <div>
              <Link
                href="/login"
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 transition-all duration-200"
              >
                Ir para o Login <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-100 via-indigo-50/30 to-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
          <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <ShoppingBag className="h-8 w-8 text-indigo-600" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-slate-950">
            Ofertix
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          Crie sua conta na plataforma
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Ou{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            acesse uma conta já existente
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl sm:rounded-2xl sm:px-10">
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg text-center font-medium">
                {state.error}
              </div>
            )}

            {/* Input Oculto para Enviar o Tipo de Conta Selecionado */}
            <input type="hidden" name="type" value={accountType} />

            {/* Seletor de Tipo de Conta */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Qual o seu objetivo?
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Opção Consumidor */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setAccountType('CONSUMER')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all duration-200 ${
                    accountType === 'CONSUMER'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-600/5'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <User className="h-6 w-6" />
                  <div className="font-semibold text-sm">Quero Comprar</div>
                </button>

                {/* Opção Vendedor */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setAccountType('VENDOR')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all duration-200 ${
                    accountType === 'VENDOR'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-600/5'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <Store className="h-6 w-6" />
                  <div className="font-semibold text-sm">Quero Vender</div>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-700"
              >
                {accountType === 'VENDOR' ? 'Nome da Loja' : 'Nome Completo'}
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  disabled={isPending}
                  className="block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200"
                  placeholder={accountType === 'VENDOR' ? 'Ofertix Eletrônicos Ltda.' : 'João da Silva'}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700"
              >
                Endereço de e-mail
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200"
                  placeholder="exemplo@ofertix.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                Senha
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isPending}
                  className="block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {isPending ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Cadastrar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
