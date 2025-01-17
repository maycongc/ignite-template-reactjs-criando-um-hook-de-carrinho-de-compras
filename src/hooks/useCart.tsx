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

  function updateCart(newCart: Product[]) {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const isProductAlreadyInTheCart = cart.some(
        product => product.id === productId,
      );

      if (isProductAlreadyInTheCart) {
        const { data: stockData } = await api.get<Stock>(`stock/${productId}`);

        const cartUpdated = cart.map(product => {
          if (stockData.amount === product.amount) {
            throw new Error('Quantidade solicitada fora de estoque');
          }

          if (product.id === productId)
            return { ...product, amount: product.amount + 1 };
          else return product;
        });

        updateCart(cartUpdated);
      } else {
        const { data: productData } = await api
          .get<Omit<Product, 'amount'>>(`products/${productId}`)
          .catch(err => {
            throw new Error('Erro na adição do produto');
          });

        const newProduct: Product = {
          id: productData.id,
          price: productData.price,
          title: productData.title,
          image: productData.image,
          amount: 1,
        };

        const cartUpdated = [...cart, newProduct];
        updateCart(cartUpdated);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(product => product.id === productId)) {
        throw new Error('Erro na remoção do produto');
      }

      const cartUpdated = cart.filter(item => item.id !== productId);

      updateCart(cartUpdated);
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
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const { data: stockData } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stockData.amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      if (amount <= 0) {
        throw new Error('Minimum amount reached.');
      }

      const cartUpdated = cart.map(product => {
        if (product.id === productId) return { ...product, amount };
        else return product;
      });

      updateCart(cartUpdated);
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
