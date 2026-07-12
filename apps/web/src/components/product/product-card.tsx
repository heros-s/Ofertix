'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { ShoppingCart, Store, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: string | number;
    stock: number;
    images: string[];
    vendor_id: string;
    category_id: string;
    categories?: {
      name: string;
    };
    vendors?: {
      store_name: string;
    };
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const storeName = product.vendors?.store_name || 'Loja Parceira';
  const categoryName = product.categories?.name || 'Geral';
  const hasImages = product.images && product.images.length > 0;
  const imageUrl = hasImages ? product.images[0] : '/placeholder-product.svg';
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Impede a navegação do Link pai
    e.stopPropagation();

    addToCart({
      id: product.id,
      name: product.name,
      price: price,
      image: imageUrl,
      vendorId: product.vendor_id,
      storeName: storeName,
      stock: product.stock,
    });
  };

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-slate-300/80 transition-all duration-300 transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {/* Badge Esgotado */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10 text-white font-bold text-sm tracking-wide pointer-events-none">
            Produto Esgotado
          </div>
        )}

        {hasImages ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ShoppingCart className="h-12 w-12 stroke-[1.5]" />
          </div>
        )}

        <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
          {categoryName}
        </span>
      </div>

      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Loja responsável */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Store className="h-3.5 w-3.5 text-primary-500" />
            <Link
              href={`/loja/${product.vendor_id}`}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 truncate hover:text-primary-600 transition-colors"
            >
              {storeName}
            </Link>
          </div>

          <h3 className="font-bold text-slate-900 leading-snug group-hover:text-primary-700 transition-colors line-clamp-2">
            <Link href={`/produtos/${product.id}`} className="after:absolute after:inset-0 after:z-0">
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Preço</p>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`relative z-10 p-3 rounded-xl shadow-sm transition-all duration-200 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-500 to-primary-700 text-white hover:from-primary-600 hover:to-primary-800 hover:shadow-primary-600/20 hover:shadow-md active:scale-95'
            }`}
            title="Adicionar ao carrinho"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
