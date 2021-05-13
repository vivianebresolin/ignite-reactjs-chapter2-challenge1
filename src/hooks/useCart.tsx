import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart];

      const productInCart = currentCart.find(product => product.id === productId);
      const amountInCart = productInCart ? productInCart.amount : 0;

      const productInStock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = productInStock.data.amount;

      const updatedAmount = amountInCart + 1;

      if (updatedAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productInCart) {
        productInCart.amount = updatedAmount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        currentCart.push(newProduct);
      }

      setCart(currentCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];

      const isProductInCart = currentCart.find(product => product.id === productId);

      if (isProductInCart) {
        const updatedCart = currentCart.filter(product => product.id !== productId);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productInStock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = productInStock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const currentCart = [...cart];
      const productInCart = currentCart.find(product => product.id === productId);

      if (productInCart) {
        const updatedCart = currentCart.map(product => product.id === productId ? {
          ...product,
          amount: amount
        } : product);

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
