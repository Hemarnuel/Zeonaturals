import { RouterProvider } from "react-router"
import { CartProvider } from "../cart"
import { router } from "./routes"

export default function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  )
}
