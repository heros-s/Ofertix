import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800">
      <h2 className="text-3xl font-bold">Página não encontrada</h2>
      <p className="mt-2 text-slate-500">A página que você está procurando não existe.</p>
      <Link href="/" className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
        Voltar para a Home
      </Link>
    </div>
  );
}
