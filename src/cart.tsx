import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type CartItem = {
  id: string
  slug?: string
  name: string
  price: number
  quantity: number
  image?: string
  stock?: number
}

type NewCartItem = Omit<CartItem, "quantity">

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  addItem: (item: NewCartItem) => void
  addItemQuantity: (item: NewCartItem, quantity: number) => void
  setQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

const STORAGE_KEY = "zoenaturals-cart"
const CartContext = createContext<CartContextValue | null>(null)

function readStoredCart(): CartItem[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem: (nextItem) =>
        setItems((current) => {
          const existing = current.find((item) => item.id === nextItem.id)
          return existing
            ? current.map((item) =>
                item.id === nextItem.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              )
            : [...current, { ...nextItem, quantity: 1 }]
        }),
      addItemQuantity: (nextItem, quantity) =>
        setItems((current) => {
          const safeQuantity = Math.max(1, Math.floor(quantity))
          const existing = current.find((item) => item.id === nextItem.id)
          return existing
            ? current.map((item) =>
                item.id === nextItem.id
                  ? {
                      ...item,
                      quantity: Math.min(
                        item.quantity + safeQuantity,
                        nextItem.stock ?? Number.POSITIVE_INFINITY,
                      ),
                    }
                  : item,
              )
            : [
                {
                  ...nextItem,
                  quantity: Math.min(
                    safeQuantity,
                    nextItem.stock ?? safeQuantity,
                  ),
                },
                ...current,
              ]
        }),
      setQuantity: (id, quantity) =>
        setItems((current) =>
          current
            .map((item) =>
              item.id === id
                ? {
                    ...item,
                    quantity: Math.min(
                      Math.max(0, Math.floor(quantity)),
                      item.stock ?? Number.POSITIVE_INFINITY,
                    ),
                  }
                : item,
            )
            .filter((item) => item.quantity > 0),
        ),
      removeItem: (id) =>
        setItems((current) => current.filter((item) => item.id !== id)),
      clearCart: () => setItems([]),
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
