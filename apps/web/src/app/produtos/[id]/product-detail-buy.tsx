'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { ShoppingCart, Store, Check, AlertTriangle, Plus, Minus } from 'lucide-react';

interface ProductDetailBuyProps {
  product: {
    id: string;
    name: string;
    price: string | number;
    stock: number;
    images: string[];
    vendor_id: string;
    vendors?: {
      store_name: string;
    };
  };
}

export default function ProductDetailBuy({ product }: ProductDetailBuyProps) {
  const { addToCart } = useCart();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const storeName = product.vendors?.store_name || 'Loja Parceira';
  const hasImages = product.images && product.images.length > 0;
  const imagesList = hasImages ? product.images : ['/placeholder-product.svg'];
  const isOutOfStock = product.stock <= 0;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: price,
        image: imagesList[0],
        vendorId: product.vendor_id,
        storeName: storeName,
        stock: product.stock,
      },
      quantity
    );

    setAddedToCartSuccess(true);
    setTimeout(() => setAddedToCartSuccess(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Imagens (Galeria) */}
      <div className="space-y-4">
        <div className="relative aspect-square w-full rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10 text-white font-bold text-lg tracking-wider">
              Produto Esgotado
            </div>
          )}
          <img
            src={imagesList[selectedImageIdx]}
            alt={product.name}
            className="w-full h-full object-cover transition-all duration-350"
          />
        </div>

        {/* Miniaturas */}
        {imagesList.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {imagesList.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIdx(idx)}
                className={`relative w-20 aspect-square rounded-xl overflow-hidden bg-white border-2 flex-shrink-0 transition-all ${
                  selectedImageIdx === idx ? 'border-indigo-650 shadow-sm scale-95' : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <img src={url} alt={`Visualização ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detalhes da Compra */}
      <div className="flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Loja parceira */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
            <Store className="h-4 w-4" /> Vendedor: {storeName}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {product.name}
            </h1>
            <p className="text-3xl font-black text-slate-900">
              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Estado de estoque */}
          <div>
            {isOutOfStock ? (
              <div className="inline-flex items-center gap-1 text-rose-600 font-semibold text-sm">
                <AlertTriangle className="h-4.5 w-4.5" /> Produto indisponível no estoque
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                Estoque disponível:{' '}
                <span className="text-indigo-600 font-bold">{product.stock} unidades</span>
              </p>
            )}
          </div>
        </div>

        {/* Quantidade e Botão Adicionar */}
        {!isOutOfStock && (
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-650">Quantidade:</span>
              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="p-3 hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-bold text-slate-900 select-none min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock}
                  className="p-3 hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className={`flex-1 inline-flex justify-center items-center gap-2 rounded-xl py-4 px-6 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                  addedToCartSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 active:scale-98'
                }`}
              >
                {addedToCartSuccess ? (
                  <>
                    <Check className="h-5 w-5" /> Adicionado com sucesso!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
