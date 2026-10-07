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
  variantId?: string
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
  setQuantity: (id: string, quantity: number, variantId?: string) => void
  removeItem: (id: string, variantId?: string) => void
  setStock: (id: string, stock: number, variantId?: string) => void
  clearCart: () => void
}

const STORAGE_KEY = "zoenaturals-cart"
const CartContext = createContext<CartContextValue | null>(null)

function showCartToast(message: string) {
  window.dispatchEvent(new CustomEvent("zoenaturals-toast", { detail: message }))
}

function readStoredCart(): CartItem[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => ({
      ...item,
      id: String(item.productId ?? item.id),
      variantId: item.variantId ? String(item.variantId) : undefined,
      quantity: Math.max(1, Number(item.qty ?? item.quantity) || 1),
    }))
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.map(({ id, quantity, ...item }) => ({
          ...item,
          productId: id,
          qty: quantity,
        }))),
      )
    } catch (error) {
      console.error("Unable to persist the shopping cart:", error)
    }
  }, [items])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem: (nextItem) =>
        {
          setItems((current) => {
          const existing = current.find(
            (item) => item.id === nextItem.id && item.variantId === nextItem.variantId,
          )
          return existing
            ? current.map((item) =>
                item.id === nextItem.id && item.variantId === nextItem.variantId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              )
            : [...current, { ...nextItem, quantity: 1 }]
          })
          showCartToast(`${nextItem.name} added to your cart.`)
        },
      addItemQuantity: (nextItem, quantity) =>
        {
          setItems((current) => {
          const safeQuantity = Math.max(1, Math.floor(quantity))
          const existing = current.find(
            (item) => item.id === nextItem.id && item.variantId === nextItem.variantId,
          )
          return existing
            ? current.map((item) =>
                item.id === nextItem.id && item.variantId === nextItem.variantId
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
          })
          showCartToast(`${nextItem.name} added to your cart.`)
        },
      setQuantity: (id, quantity, variantId) =>
        setItems((current) =>
          current
            .map((item) =>
              item.id === id && item.variantId === variantId
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
      removeItem: (id, variantId) =>
        setItems((current) =>
          current.filter((item) => item.id !== id || item.variantId !== variantId),
        ),
      setStock: (id, stock, variantId) =>
        setItems((current) =>
          current.map((item) =>
            item.id === id && item.variantId === variantId
              ? {
                  ...item,
                  stock: Math.max(0, stock),
                  quantity: Math.max(1, Math.min(item.quantity, Math.max(0, stock))),
                }
              : item,
          ),
        ),
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
