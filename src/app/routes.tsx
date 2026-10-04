import { createBrowserRouter } from "react-router"
import { HomePage, RootLayout } from "../App"
import {
  AboutPage,
  AccountPage,
  AdminPage,
  CartPage,
  CheckoutPage,
  ContactPage,
  FaqPage,
  IngredientsPage,
  JournalPage,
  NotFoundPage,
  ProductPage,
  QuizPage,
  ShopPage,
  ThankYouPage,
} from "../pages/commerce"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "shop", Component: ShopPage },
      { path: "about", Component: AboutPage },
      { path: "journal", Component: JournalPage },
      { path: "ingredients", Component: IngredientsPage },
      { path: "contact", Component: ContactPage },
      { path: "faq", Component: FaqPage },
      { path: "quiz", Component: QuizPage },
      { path: "account", Component: AccountPage },
      { path: "admin", Component: AdminPage },
      { path: "product/:slug", Component: ProductPage },
      { path: "cart", Component: CartPage },
      { path: "checkout", Component: CheckoutPage },
      { path: "thank-you.html", Component: ThankYouPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
