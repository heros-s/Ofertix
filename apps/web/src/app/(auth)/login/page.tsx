'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '../actions';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, { error: null });

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-100 via-indigo-50/30 to-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
          <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <ShoppingBag className="h-8 w-8 text-indigo-600" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-slate-950 font-sans">
            Ofertix
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          Acesse sua conta
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Ou{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            crie uma nova conta grátis
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
                  placeholder="exemplo@ofertix.com.br"
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
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="block w-full rounded-xl border-0 py-3 px-4 bg-white text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200"
                  placeholder="••••••••"
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
                    Entrar <ArrowRight className="h-4 w-4" />
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
