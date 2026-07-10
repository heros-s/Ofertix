'use client';

import { useState, useTransition } from 'react';
import { inactivateProduct, reactivateProduct, deleteProduct } from './actions';
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';

interface ProductActionsProps {
  productId: string;
  active: boolean;
}

export default function ProductActions({ productId, active }: ProductActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<'inactivate' | 'reactivate' | 'delete' | null>(null);

  const handleInactivate = () => {
    if (confirm('Deseja realmente inativar este produto? Ele deixará de aparecer na vitrine para os clientes.')) {
      setActionType('inactivate');
      startTransition(async () => {
        try {
          await inactivateProduct(productId);
        } catch (err: any) {
          alert(err.message || 'Erro ao inativar o produto.');
        } finally {
          setActionType(null);
        }
      });
    }
  };

  const handleReactivate = () => {
    setActionType('reactivate');
    startTransition(async () => {
      try {
        await reactivateProduct(productId);
      } catch (err: any) {
        alert(err.message || 'Erro ao reativar o produto.');
      } finally {
        setActionType(null);
      }
    });
  };

  const handleDelete = () => {
    if (confirm('Deseja realmente EXCLUIR este produto permanentemente? Esta ação não pode ser desfeita.')) {
      setActionType('delete');
      startTransition(async () => {
        try {
          await deleteProduct(productId);
        } catch (err: any) {
          alert(err.message || 'Erro ao excluir o produto.');
        } finally {
          setActionType(null);
        }
      });
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {active ? (
        <button
          type="button"
          onClick={handleInactivate}
          disabled={isPending}
          className="inline-flex items-center gap-1 p-2 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50"
          title="Inativar produto (Ocultar da vitrine)"
        >
          {isPending && actionType === 'inactivate' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReactivate}
          disabled={isPending}
          className="inline-flex items-center gap-1 p-2 border border-slate-200 hover:border-emerald-350 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50"
          title="Reativar produto (Exibir na vitrine)"
        >
          {isPending && actionType === 'reactivate' ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 p-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50"
        title="Excluir produto permanentemente"
      >
        {isPending && actionType === 'delete' ? (
          <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
