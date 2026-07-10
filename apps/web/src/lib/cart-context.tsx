'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  vendorId: string;
  storeName: string;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;
  isMounted: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Carrega o carrinho do localStorage ao montar o componente
  useEffect(() => {
    const storedCart = localStorage.getItem('ofertix_cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error('Erro ao fazer parse do carrinho do localStorage:', e);
      }
    }
    setIsMounted(true);
  }, []);

  // Salva no localStorage sempre que o carrinho for modificado (apenas após montado)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('ofertix_cart', JSON.stringify(cart));
    }
  }, [cart, isMounted]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((i) => i.id === item.id);

      if (existingItemIndex > -1) {
        // Item já está no carrinho: atualiza a quantidade respeitando o estoque
        const newCart = [...prevCart];
        const existingItem = newCart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > item.stock) {
          alert(`Desculpe, estoque máximo atingido. Limite disponível: ${item.stock} unidades.`);
          existingItem.quantity = item.stock;
        } else {
          existingItem.quantity = newQuantity;
        }

        return newCart;
      } else {
        // Item novo no carrinho: adiciona
        if (quantity > item.stock) {
          alert(`Desculpe, quantidade solicitada excede o estoque. Limite disponível: ${item.stock} unidades.`);
          return [...prevCart, { ...item, quantity: item.stock }];
        }
        return [...prevCart, { ...item, quantity }];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          if (quantity > item.stock) {
            alert(`Quantidade limitada ao estoque disponível: ${item.stock} unidades.`);
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartItemsCount,
        isMounted,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
}
