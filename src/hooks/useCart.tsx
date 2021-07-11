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
      if (cart.some(product => product.id === productId)) {
        throw new Error('The product is already in the cart.');
      }

      const { data: productData } = await api.get<Omit<Product, 'amount'>>(
        `products/${productId}`,
      );

      const newCartProduct: Product = {
        id: productData.id,
        price: productData.price,
        title: productData.title,
        image: productData.image,
        amount: 1,
      };

      const cartUpdated = [...cart, newCartProduct];

      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(product => product.id === productId)) {
        throw new Error("This product isn't in the cart.");
      }

      const cartUpdated = cart.filter(item => item.id !== productId);

      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!cart.some(product => product.id === productId)) {
        throw new Error("This product isn't in the cart.");
      }

      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > productStock.amount) {
        throw new Error('Maximum stock reached.');
      }

      if (amount <= 0) {
        throw new Error('Minimum amount reached.');
      }

      const cartUpdated = cart.map(product => {
        if (product.id === productId) return { ...product, amount };
        else return product;
      });

      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch (err) {
      toast.error(err.message);
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
