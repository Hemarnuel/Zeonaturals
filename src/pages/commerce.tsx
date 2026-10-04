import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import {
  ApiError,
  apiRequest,
  extractProducts,
  getBuiltInProductSlugs,
  getAdminProducts,
  normalizeProduct,
  Product,
  ProductInput,
  removeProductRecord,
  saveProductRecord,
  saveProductRecords,
} from "../api"
import {
  getAdminUser,
  isSupabaseConfigured,
  listAdminProducts,
  removeRemoteProduct,
  saveRemoteProduct,
  saveRemoteProducts,
  signInAdmin,
  signOutAdmin,
} from "../supabase"
import {
  parseProductCsv,
  ProductCsvPreview,
  PRODUCT_CSV_TEMPLATE,
} from "../productCsv"
import { useCart } from "../cart"
import { IS_DEMO_API } from "../config"
import {
  Button,
  Heading,
  Icon,
  NavLink,
  RadioField,
  TextArea,
  TextField,
} from "../components/ui"

const goals = ["Sleep", "Energy", "Immunity", "Digestion", "Skin & Hair"]
const categories = ["Herbal Teas", "Supplements", "Superfoods", "Body Care"]

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)
}

function ProductImage({
  product,
  className = "h-72",
}: {
  product: Product
  className?: string
}) {
  return product.image ? (
    <img
      src={product.image}
      alt={product.name}
      className={`${className} w-full rounded-card object-cover`}
    />
  ) : (
    <div
      className={`${className} grid w-full place-items-center overflow-hidden rounded-card bg-sage/20`}
      aria-label={`${product.name} image placeholder`}
    >
      <div className="grid size-28 place-items-center rounded-full bg-cream text-deep-fern shadow-soft">
        <Icon name="sprout" size="xl" />
      </div>
    </div>
  )
}

function ProductActions({
  product,
  quantity = 1,
  stacked = false,
}: {
  product: Product
  quantity?: number
  stacked?: boolean
}) {
  const { addItemQuantity } = useCart()
  const navigate = useNavigate()
  const unavailable = product.stock === 0
  const cartProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
  }

  function orderNow() {
    addItemQuantity(cartProduct, quantity)
    navigate("/checkout")
  }

  return (
    <div className={`flex gap-2 ${stacked ? "flex-col sm:flex-row" : ""}`}>
      <Button
        variant="secondary"
        disabled={unavailable}
        className="flex-1 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={() => addItemQuantity(cartProduct, quantity)}
      >
        {unavailable ? "Out of stock" : "Add to cart"}
      </Button>
      <Button
        disabled={unavailable}
        className="flex-1 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={orderNow}
      >
        {unavailable ? "Out of stock" : "Order now"}
      </Button>
    </div>
  )
}

function PageIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy: string
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8 lg:pt-16">
      <p className="eyebrow">{eyebrow}</p>
      <Heading level={1} className="mt-3 text-4xl sm:text-5xl">
        {title}
      </Heading>
      <p className="mt-4 max-w-2xl leading-7 text-walnut/65">{copy}</p>
    </div>
  )
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const filterKey = searchParams.toString()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")

    apiRequest<any>(`/api/products${filterKey ? `?${filterKey}` : ""}`, {
      signal: controller.signal,
    })
      .then((payload) => setProducts(extractProducts(payload)))
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return
        setError(
          reason instanceof Error
            ? reason.message
            : "Products could not be loaded.",
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [filterKey])

  function setFilter(key: "goal" | "category", value: string) {
    const next = new URLSearchParams(searchParams)
    next.get(key) === value ? next.delete(key) : next.set(key, value)
    setSearchParams(next)
  }

  function search(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    query.trim() ? next.set("q", query.trim()) : next.delete("q")
    setSearchParams(next)
  }

  return (
    <main>
      <PageIntro
        eyebrow="Plant-powered support"
        title="Shop your wellness ritual"
        copy="Explore purposeful formulas for better rest, brighter energy, and everyday balance."
      />
      <div className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <form onSubmit={search} className="flex max-w-2xl gap-2">
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search supplements"
            aria-label="Search supplements"
            className="min-w-0 flex-1"
          />
          <Button type="submit">
            <Icon name="search" size="sm" /> Search
          </Button>
        </form>

        <div className="mt-8 space-y-5 border-y border-walnut/10 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 w-20 text-xs font-bold uppercase tracking-wider">
              Goal
            </p>
            {goals.map((goal) => (
              <Button
                key={goal}
                variant="secondary"
                className={
                  searchParams.get("goal") === goal
                    ? "border-deep-fern bg-deep-fern !text-cream"
                    : "px-4 py-2"
                }
                onClick={() => setFilter("goal", goal)}
              >
                {goal}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 w-20 text-xs font-bold uppercase tracking-wider">
              Category
            </p>
            {categories.map((category) => (
              <Button
                key={category}
                variant="secondary"
                className={
                  searchParams.get("category") === category
                    ? "border-deep-fern bg-deep-fern !text-cream"
                    : "px-4 py-2"
                }
                onClick={() => setFilter("category", category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item}>
                <div className="h-72 animate-pulse rounded-card bg-sage/20" />
                <div className="mt-5 h-6 w-2/3 animate-pulse rounded-full bg-sage/25" />
                <div className="mt-3 h-4 w-24 animate-pulse rounded-full bg-sage/20" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-card border border-terracotta/30 bg-terracotta/10 p-8 text-center">
            <Heading level={2} className="text-2xl">
              Products are unavailable
            </Heading>
            <p className="mt-2 text-sm text-walnut/70">{error}</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="mt-10 rounded-card bg-sage/15 p-10 text-center">
            <Heading level={2} className="text-2xl">
              No products found
            </Heading>
            <p className="mt-2 text-walnut/65">
              Try a different search or remove a filter.
            </p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id}>
                <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
                  <ProductImage product={product} />
                </NavLink>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-deep-fern">
                  {product.goal}
                </p>
                <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
                  <Heading level={2} className="mt-2 text-2xl">
                    {product.name}
                  </Heading>
                </NavLink>
                <p className="mb-5 mt-1 font-semibold text-walnut/70">
                  {formatNaira(product.price)}
                </p>
                <ProductActions product={product} />
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export function ProductPage() {
  const { slug = "" } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] =
    useState<"description" | "ingredients" | "use">("description")

  useEffect(() => {
    setLoading(true)
    setMissing(false)
    setError("")
    apiRequest<any>(`/api/products/${encodeURIComponent(slug)}`)
      .then((payload) => {
        const nextProduct = normalizeProduct(
          payload.product ?? payload.data?.product ?? payload.data ?? payload,
        )
        setProduct(nextProduct)
        if (nextProduct.goal) {
          apiRequest<any>(
            `/api/products?goal=${encodeURIComponent(nextProduct.goal)}`,
          )
            .then((relatedPayload) =>
              setRelated(
                extractProducts(relatedPayload)
                  .filter((item) => item.id !== nextProduct.id)
                  .slice(0, 3),
              ),
            )
            .catch(() => setRelated([]))
        }
      })
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 404)
          setMissing(true)
        else
          setError(
            reason instanceof Error
              ? reason.message
              : "This product could not be loaded.",
          )
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8">
        <div className="h-[32rem] animate-pulse rounded-card bg-sage/20" />
        <div className="space-y-5 pt-8">
          <div className="h-4 w-24 animate-pulse rounded-full bg-sage/25" />
          <div className="h-12 w-3/4 animate-pulse rounded-full bg-sage/25" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-sage/20" />
        </div>
      </main>
    )
  }

  if (missing) return <NotFoundPage product />

  if (!product || error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <Heading level={1} className="text-4xl">
          Product unavailable
        </Heading>
        <p className="mt-4 text-walnut/65">{error}</p>
        <NavLink
          href="/shop"
          className="mt-6 inline-block font-bold text-deep-fern"
        >
          Return to shop
        </NavLink>
      </main>
    )
  }

  const tabContent = {
    description: product.description,
    ingredients: product.ingredients,
    use: product.howToUse,
  }

  return (
    <main className="pb-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 lg:grid-cols-2 lg:px-8 lg:py-20">
        <ProductImage product={product} className="h-[32rem] lg:h-[40rem]" />
        <div className="lg:pt-8">
          <p className="eyebrow">{product.goal}</p>
          <Heading level={1} className="mt-3 text-4xl sm:text-5xl">
            {product.name}
          </Heading>
          <p className="mt-4 text-xl font-semibold">
            {formatNaira(product.price)}
          </p>
          <p className="mt-6 leading-7 text-walnut/65">{product.description}</p>
          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider">
              Quantity
            </p>
            <div className="inline-flex items-center rounded-card border border-walnut/15 bg-white/50">
              <Button
                variant="icon"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </Button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <Button
                variant="icon"
                onClick={() =>
                  setQuantity((value) => Math.min(product.stock, value + 1))
                }
                disabled={quantity >= product.stock}
                aria-label="Increase quantity"
              >
                +
              </Button>
            </div>
            <span className="ml-3 text-xs text-walnut/55">
              {product.stock ? `${product.stock} available` : "Out of stock"}
            </span>
          </div>
          <div className="mt-7">
            <ProductActions product={product} quantity={quantity} stacked />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="flex gap-1 overflow-x-auto border-b border-walnut/15">
          {[
            ["description", "Description"],
            ["ingredients", "Ingredients"],
            ["use", "How to use"],
          ].map(([key, label]) => (
            <Button
              key={key}
              variant="nav"
              className={`whitespace-nowrap rounded-b-none px-5 py-3 ${
                activeTab === key
                  ? "border-b-2 border-deep-fern text-deep-fern"
                  : ""
              }`}
              onClick={() => setActiveTab(key as typeof activeTab)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="min-h-28 py-7 leading-8 text-walnut/70">
          {tabContent[activeTab]}
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-10 lg:grid-cols-2 lg:px-8">
        <div>
          <Heading level={2} className="text-3xl">
            Product facts
          </Heading>
          <div className="mt-5 overflow-hidden rounded-card border border-walnut/15">
            {Object.keys(product.facts).length ? (
              Object.entries(product.facts).map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-2 border-b border-walnut/10 px-5 py-4 last:border-b-0"
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-sm text-walnut/65">{value}</p>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-walnut/60">
                See packaging for complete product facts.
              </p>
            )}
          </div>
        </div>
        <div>
          <Heading level={2} className="text-3xl">
            Frequently asked questions
          </Heading>
          <div className="mt-5 space-y-3">
            {(product.faq.length
              ? product.faq
              : [
                  {
                    question: "When should I take this?",
                    answer:
                      "Follow the directions on the package or your healthcare provider’s advice.",
                  },
                  {
                    question: "Can I combine this with other supplements?",
                    answer:
                      "Please speak with a qualified healthcare provider before combining supplements.",
                  },
                ]
            ).map((item) => (
              <details
                key={item.question}
                className="rounded-card border border-walnut/15 bg-white/30 p-5"
              >
                <summary className="cursor-pointer font-semibold">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-walnut/65">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-14 lg:px-8">
          <Heading level={2} className="text-4xl">
            You may also like
          </Heading>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <article key={item.id}>
                <NavLink href={`/product/${encodeURIComponent(item.slug)}`}>
                  <ProductImage product={item} className="h-64" />
                  <Heading level={3} className="mt-4 text-2xl">
                    {item.name}
                  </Heading>
                </NavLink>
                <p className="mt-1 font-semibold text-walnut/65">
                  {formatNaira(item.price)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const navigate = useNavigate()

  return (
    <main>
      <PageIntro
        eyebrow="Your ritual"
        title="Shopping cart"
        copy="Review your items before continuing to secure checkout."
      />
      <div className="mx-auto max-w-5xl px-5 pb-20 lg:px-8">
        {items.length === 0 ? (
          <div className="rounded-card bg-sage/15 p-12 text-center">
            <Icon name="bag" size="xl" />
            <Heading level={2} className="mt-5 text-3xl">
              Your cart is empty
            </Heading>
            <p className="mt-3 text-walnut/65">
              Find the right botanical support for your routine.
            </p>
            <Button className="mt-6" onClick={() => navigate("/shop")}>
              Browse products
            </Button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-walnut/10 rounded-card border border-walnut/10 bg-white/30 px-5">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-[5rem_1fr] gap-4 py-6 sm:grid-cols-[6rem_1fr_auto]"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="size-20 rounded-card object-cover sm:size-24"
                    />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-card bg-sage/20 text-deep-fern sm:size-24">
                      <Icon name="sprout" />
                    </div>
                  )}
                  <div>
                    <Heading level={2} className="text-xl">
                      {item.name}
                    </Heading>
                    <p className="mt-1 text-sm font-semibold text-walnut/65">
                      {formatNaira(item.price)}
                    </p>
                    <Button
                      variant="nav"
                      className="mt-2 px-0 text-xs text-terracotta"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="col-start-2 flex items-center sm:col-auto">
                    <Button
                      variant="icon"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </Button>
                    <span className="w-9 text-center font-bold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="icon"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      disabled={
                        item.stock !== undefined && item.quantity >= item.stock
                      }
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      +
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-7 flex flex-col items-end">
              <p className="text-sm text-walnut/60">
                {IS_DEMO_API
                  ? "Demo prices only. No payment will be collected."
                  : "Your payable total will be confirmed by the server."}
              </p>
              <Button className="mt-4" onClick={() => navigate("/checkout")}>
                Continue to checkout <Icon name="arrowRight" size="sm" />
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

type CheckoutResponse = {
  paymentUrl?: string
  status?: string
  reference?: string
  amount?: number
}

export function CheckoutPage() {
  const { items, clearCart } = useCart()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "pod">(
    "paystack",
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState<CheckoutResponse | null>(
    null,
  )
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  const updateCustomer = (field: keyof typeof customer, value: string) =>
    setCustomer((current) => ({ ...current, [field]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await apiRequest<CheckoutResponse>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          customer,
          items: items.map((item) => ({
            productId: item.id,
            qty: item.quantity,
          })),
          paymentMethod,
        }),
      })
      const result = (response as CheckoutResponse & { data?: CheckoutResponse }).data ?? response

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl)
        return
      }
      if (result.status === "pod_pending") {
        clearCart()
        setConfirmation(result)
        return
      }
      setError("Checkout could not be completed. Please try again.")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Checkout could not be completed.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage/30 text-deep-fern">
          <Icon name="check" size="xl" />
        </span>
        <Heading level={1} className="mt-6 text-4xl">
          {IS_DEMO_API ? "Demo order captured" : "Order received"}
        </Heading>
        <p className="mt-4 text-walnut/65">
          {IS_DEMO_API
            ? "This was a test only. No order was sent for fulfilment."
            : "Your pay-on-delivery order is awaiting fulfilment."}
        </p>
        <div className="mt-7 rounded-card bg-white/40 p-5">
          <p className="text-xs font-bold uppercase tracking-wider">
            Reference
          </p>
          <p className="mt-2 font-semibold">
            {confirmation.reference ?? "Pending"}
          </p>
          {confirmation.amount !== undefined && (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider">
                {IS_DEMO_API ? "Simulated test amount" : "Server-confirmed amount"}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatNaira(confirmation.amount)}
              </p>
            </>
          )}
        </div>
        <Button className="mt-7" onClick={() => navigate("/shop")}>
          Continue shopping
        </Button>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <Heading level={1} className="text-4xl">
          Your cart is empty
        </Heading>
        <p className="mt-3 text-walnut/65">
          Add a product before starting checkout.
        </p>
        <Button className="mt-6" onClick={() => navigate("/shop")}>
          Go to shop
        </Button>
      </main>
    )
  }

  return (
    <main>
      <PageIntro
        eyebrow={IS_DEMO_API ? "Demo checkout" : "Secure checkout"}
        title="Complete your order"
        copy={
          IS_DEMO_API
            ? "This is a checkout simulation. No payment will be collected and no order will be sent for fulfilment."
            : "Delivery details and payment, all in one simple step."
        }
      />
      <form
        onSubmit={submit}
        className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 lg:grid-cols-[1fr_24rem] lg:px-8"
      >
        <div>
          <Heading level={2} className="text-2xl">
            Delivery details
          </Heading>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              required
              value={customer.name}
              onChange={(event) => updateCustomer("name", event.target.value)}
              placeholder="Full name"
              aria-label="Full name"
            />
            <TextField
              required
              type="email"
              value={customer.email}
              onChange={(event) => updateCustomer("email", event.target.value)}
              placeholder="Email address"
              aria-label="Email address"
            />
            <TextField
              required
              type="tel"
              value={customer.phone}
              onChange={(event) => updateCustomer("phone", event.target.value)}
              placeholder="Phone number"
              aria-label="Phone number"
              className="sm:col-span-2"
            />
            <TextArea
              required
              value={customer.address}
              onChange={(event) =>
                updateCustomer("address", event.target.value)
              }
              placeholder="Delivery address"
              aria-label="Delivery address"
              className="sm:col-span-2"
            />
          </div>

          <Heading level={2} className="mt-10 text-2xl">
            Payment
          </Heading>
          <div className="mt-5 grid gap-3">
            <RadioField
              name="payment"
              value="paystack"
              checked={paymentMethod === "paystack"}
              onChange={() => setPaymentMethod("paystack")}
              label={IS_DEMO_API ? "Simulate online payment" : "Pay online with Paystack"}
              description={
                IS_DEMO_API
                  ? "Completes a test flow only. No card, bank, or USSD payment is made."
                  : "Card, bank transfer, or USSD. You’ll continue to Paystack securely."
              }
            />
            <RadioField
              name="payment"
              value="pod"
              checked={paymentMethod === "pod"}
              onChange={() => setPaymentMethod("pod")}
              label="Pay on delivery"
              description="Pay when your order arrives at the delivery address."
            />
          </div>
        </div>

        <aside className="h-fit rounded-card border border-walnut/10 bg-white/35 p-6">
          <Heading level={2} className="text-2xl">
            Order summary
          </Heading>
          <div className="mt-5 divide-y divide-walnut/10">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <p>
                  {item.name}{" "}
                  <span className="text-walnut/50">× {item.quantity}</span>
                </p>
                <p className="shrink-0 text-walnut/60">
                  {formatNaira(item.price)} each
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-card bg-sage/15 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-deep-fern">
              {IS_DEMO_API ? "Simulated pricing" : "Secure server pricing"}
            </p>
            <p className="mt-2 text-sm leading-6 text-walnut/65">
              {IS_DEMO_API
                ? "This test amount is simulated in the browser. No payment will be collected."
                : "The final payable amount is calculated and returned by the server—not this browser."}
            </p>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-card bg-terracotta/10 p-4 text-sm font-semibold text-terracotta"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="mt-5 w-full" disabled={submitting}>
            {submitting
              ? "Submitting…"
              : paymentMethod === "paystack"
                ? IS_DEMO_API
                  ? "Simulate payment"
                  : "Continue to Paystack"
                : "Place order"}
          </Button>
        </aside>
      </form>
    </main>
  )
}

export function ThankYouPage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get("reference") ?? ""
  const { clearCart } = useCart()
  const [state, setState] = useState<"loading" | "paid" | "unconfirmed">(
    "loading",
  )

  useEffect(() => {
    if (!reference) {
      setState("unconfirmed")
      return
    }
    apiRequest<any>(`/api/orders/verify/${encodeURIComponent(reference)}`)
      .then((payload) => {
        const status = payload.status ?? payload.data?.status
        if (status === "paid") {
          clearCart()
          setState("paid")
        } else setState("unconfirmed")
      })
      .catch(() => setState("unconfirmed"))
  }, [reference])

  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      {state === "loading" ? (
        <>
          <div className="mx-auto size-14 animate-pulse rounded-full bg-sage/30" />
          <Heading level={1} className="mt-6 text-4xl">
            Confirming your payment
          </Heading>
          <p className="mt-3 text-walnut/65">This should only take a moment.</p>
        </>
      ) : state === "paid" ? (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage/30 text-deep-fern">
            <Icon name="check" size="xl" />
          </span>
          <Heading level={1} className="mt-6 text-4xl">
            {IS_DEMO_API ? "Demo payment complete" : "Order confirmed"}
          </Heading>
          <p className="mt-3 text-walnut/65">
            {IS_DEMO_API
              ? "This simulated payment did not charge you or create a real order."
              : "Thank you. We’ll send your order details by email."}
          </p>
          <p className="mt-5 text-sm font-semibold">Reference: {reference}</p>
        </>
      ) : (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gold/30 text-walnut">
            <Icon name="alert" size="xl" />
          </span>
          <Heading level={1} className="mt-6 text-4xl">
            Payment not confirmed yet
          </Heading>
          <p className="mt-3 text-walnut/65">
            Your payment may still be processing. Please keep this reference for
            support.
          </p>
          <p className="mt-5 text-sm font-semibold">
            Reference: {reference || "Not provided"}
          </p>
          <NavLink
            href="mailto:hello@zoenaturals.com"
            className="mt-6 inline-block font-bold text-deep-fern"
          >
            Contact support
          </NavLink>
        </>
      )}
    </main>
  )
}

export function AdminPage() {
  const emptyForm: ProductInput = {
    name: "",
    slug: "",
    price: 0,
    category: "Supplements",
    goal: "Energy",
    image: "",
    stock: 0,
    description: "",
    ingredients: "",
    howToUse: "",
    facts: {
      "Format": "",
      "Best for": "",
    },
    faq: [
      { question: "When should I take this?", answer: "Use as directed on the packaging." },
    ],
    published: true,
  }

  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [products, setProducts] = useState<Product[]>([])
  const [notice, setNotice] = useState("")
  const [adminUser, setAdminUser] = useState<{ id: string; email?: string } | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [csvPreview, setCsvPreview] = useState<ProductCsvPreview | null>(null)
  const [csvParsing, setCsvParsing] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)

  useEffect(() => {
    let active = true
    async function initialize() {
      if (!isSupabaseConfigured) {
        setProducts(getAdminProducts())
        return
      }
      try {
        const user = await getAdminUser()
        if (!active) return
        setAdminUser(user)
        if (user) setProducts(await listAdminProducts())
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load admin products.")
      } finally {
        if (active) setAuthLoading(false)
      }
    }
    void initialize()
    return () => {
      active = false
    }
  }, [])

  function updateField<T extends keyof ProductInput>(field: T, value: ProductInput[T]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function refreshProducts() {
    setProducts(isSupabaseConfigured ? await listAdminProducts() : getAdminProducts())
  }

  async function handleSignIn(event: FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setNotice("")
    try {
      const user = await signInAdmin(email, password)
      setAdminUser(user)
      setProducts(await listAdminProducts())
      setPassword("")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign in.")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const nextProduct = isSupabaseConfigured
        ? await saveRemoteProduct({ ...form, published: true })
        : saveProductRecord({ ...form, published: true })
      await refreshProducts()
      setNotice(`Product published: ${nextProduct.name}`)
      setForm(emptyForm)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save product.")
    }
  }

  function handleEdit(product: Product) {
    setForm({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      category: product.category,
      goal: product.goal,
      image: product.image ?? "",
      stock: product.stock,
      description: product.description,
      ingredients: product.ingredients,
      howToUse: product.howToUse,
      facts: product.facts,
      faq: product.faq,
      published: product.published ?? true,
    })
  }

  async function handleDelete(id: string) {
    try {
      if (isSupabaseConfigured) await removeRemoteProduct(id)
      else removeProductRecord(id)
      await refreshProducts()
      setNotice("Product removed from the entry portal.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to remove product.")
    }
  }

  async function handleCsvSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    setCsvPreview(null)
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvPreview({ products: [], errors: ["Choose a .csv file."], rowCount: 0 })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setCsvPreview({ products: [], errors: ["CSV files must be 5 MB or smaller."], rowCount: 0 })
      return
    }

    setCsvParsing(true)
    try {
      const existingSlugs = new Set([
        ...products.map((product) => product.slug.toLowerCase()),
        ...getBuiltInProductSlugs(),
      ])
      setCsvPreview(await parseProductCsv(file, existingSlugs))
    } catch (error) {
      setCsvPreview({
        products: [],
        errors: [error instanceof Error ? error.message : "Unable to read this CSV."],
        rowCount: 0,
      })
    } finally {
      setCsvParsing(false)
    }
  }

  async function handleCsvImport() {
    if (!csvPreview || csvPreview.errors.length || !csvPreview.products.length) return

    setCsvImporting(true)
    try {
      const savedProducts = isSupabaseConfigured
        ? await saveRemoteProducts(csvPreview.products)
        : saveProductRecords(csvPreview.products)
      await refreshProducts()
      setNotice(`Imported ${savedProducts.length} products from CSV.`)
      setCsvPreview(null)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "CSV import failed. No products were imported.")
    } finally {
      setCsvImporting(false)
    }
  }

  if (isSupabaseConfigured && authLoading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="eyebrow">Admin portal</p>
        <Heading level={1} className="mt-3 text-3xl">Checking secure session</Heading>
      </main>
    )
  }

  if (isSupabaseConfigured && !adminUser) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 lg:py-28">
        <p className="eyebrow">Admin portal</p>
        <Heading level={1} className="mt-3 text-4xl">Sign in to manage products</Heading>
        <form onSubmit={handleSignIn} className="mt-8 space-y-4 rounded-card border border-walnut/10 bg-white/35 p-6">
          <TextField
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            aria-label="Admin email"
          />
          <TextField
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            aria-label="Password"
          />
          {notice && <p role="alert" className="text-sm font-semibold text-terracotta-dark">{notice}</p>}
          <Button type="submit" disabled={authLoading}>
            {authLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin portal</p>
          <Heading level={1} className="mt-3 text-4xl sm:text-5xl">
            Product management
          </Heading>
        </div>
        <Button variant="secondary" onClick={() => (window.location.href = "/shop")}>
          View shop
        </Button>
        {isSupabaseConfigured && (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await signOutAdmin()
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Signed out locally; the server session may still be active.")
              } finally {
                setAdminUser(null)
                setProducts([])
              }
            }}
          >
            Sign out
          </Button>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-8 rounded-card border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-walnut">
          Demo mode: product changes are saved only in this browser. Configure Supabase to enable secure shared storage.
        </div>
      )}

      {notice && (
        <div className="mb-8 rounded-card bg-sage/20 px-4 py-3 text-sm font-semibold text-deep-fern">
          {notice}
        </div>
      )}

      <section className="mb-8 rounded-card border border-walnut/10 bg-white/35 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Heading level={2} className="text-2xl">Upload products from CSV</Heading>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-walnut/65">
              Required columns: name, price, stock, description, ingredients, and how_to_use. Optional columns include slug, category, goal, image, published, facts_json, and faq_json.
            </p>
          </div>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(PRODUCT_CSV_TEMPLATE)}`}
            download="zoenaturals-products-template.csv"
            className="shrink-0 text-sm font-bold text-deep-fern underline underline-offset-4"
          >
            Download CSV template
          </a>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose product CSV file"
            onChange={handleCsvSelection}
            disabled={csvParsing || csvImporting}
            className="block w-full min-w-0 text-sm text-walnut file:mr-4 file:rounded-card file:border-0 file:bg-deep-fern file:px-4 file:py-3 file:text-sm file:font-bold file:text-cream hover:file:bg-walnut disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={handleCsvImport}
            disabled={
              csvParsing ||
              csvImporting ||
              !csvPreview?.products.length ||
              Boolean(csvPreview?.errors.length)
            }
          >
            {csvParsing
              ? "Checking CSV..."
              : csvImporting
                ? "Importing..."
                : csvPreview?.products.length
                  ? `Import ${csvPreview.products.length} products`
                  : "Import products"}
          </Button>
        </div>

        {csvPreview && (
          <div className="mt-4" aria-live="polite">
            {csvPreview.errors.length ? (
              <div role="alert" className="rounded-card bg-terracotta/10 p-4 text-sm text-terracotta-dark">
                <p className="font-bold">Fix these CSV issues and upload the file again:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {csvPreview.errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
                </ul>
              </div>
            ) : (
              <p className="rounded-card bg-sage/20 px-4 py-3 text-sm font-semibold text-deep-fern">
                {csvPreview.rowCount} product rows checked and ready to import.
              </p>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-walnut/10 bg-white/35 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Product name"
              aria-label="Product name"
            />
            <TextField
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              placeholder="Slug"
              aria-label="Slug"
            />
            <TextField
              required
              type="number"
              value={form.price}
              onChange={(event) => updateField("price", Number(event.target.value))}
              placeholder="Price"
              aria-label="Price"
            />
            <TextField
              required
              type="number"
              value={form.stock}
              onChange={(event) => updateField("stock", Number(event.target.value))}
              placeholder="Stock"
              aria-label="Stock"
            />
            <TextField
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              placeholder="Category"
              aria-label="Category"
            />
            <TextField
              value={form.goal}
              onChange={(event) => updateField("goal", event.target.value)}
              placeholder="Goal"
              aria-label="Goal"
            />
          </div>

          <TextField
            value={form.image}
            onChange={(event) => updateField("image", event.target.value)}
            placeholder="Image URL"
            aria-label="Image URL"
          />

          <TextArea
            required
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Product description"
            aria-label="Product description"
          />

          <TextArea
            required
            value={form.ingredients}
            onChange={(event) => updateField("ingredients", event.target.value)}
            placeholder="Ingredients"
            aria-label="Ingredients"
          />

          <TextArea
            required
            value={form.howToUse}
            onChange={(event) => updateField("howToUse", event.target.value)}
            placeholder="How to use"
            aria-label="How to use"
          />

          <div className="rounded-card bg-sage/15 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-deep-fern">Publishing</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button type="submit">Publish product</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void (async () => {
                    try {
                      const savedDraft = isSupabaseConfigured
                        ? await saveRemoteProduct({ ...form, published: false })
                        : saveProductRecord({ ...form, published: false, id: form.id ?? `draft-${Date.now()}` })
                      await refreshProducts()
                      setNotice(`Draft saved: ${savedDraft.name}`)
                    } catch (error) {
                      setNotice(error instanceof Error ? error.message : "Unable to save draft.")
                    }
                  })()
                }}
              >
                Save draft
              </Button>
            </div>
          </div>
        </form>

        <div className="rounded-card border border-walnut/10 bg-white/35 p-6">
          <Heading level={2} className="text-2xl">
            Published entries
          </Heading>
          <div className="mt-5 space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-walnut/60">No admin products yet.</p>
            ) : (
              products.map((product) => (
                <article key={product.id} className="rounded-card border border-walnut/10 bg-cream p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl">{product.name}</p>
                      <p className="mt-1 text-sm text-walnut/65">
                        {product.goal} · {product.category} · ₦{product.price.toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-sage/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-deep-fern">
                      {product.published === false ? "Draft" : "Live"}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" onClick={() => handleEdit(product)}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => handleDelete(product.id)}>
                      Remove
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="eyebrow">Our story</p>
          <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
            Rooted in rituals that actually fit real life.
          </Heading>
          <p className="mt-6 text-lg leading-8 text-walnut/70">
            Zoenaturals was created to bring clarity back to everyday wellness.
            We believe plant-powered care should feel simple, intentional, and
            easy to sustain.
          </p>
          <p className="mt-4 leading-7 text-walnut/65">
            Our formulations are built around the rhythms people already live by—
            better sleep, steadier energy, calmer digestion, and more confidence
            in the way they care for themselves.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => (window.location.href = "/shop")}>Shop rituals</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/quiz")}>
              Find your fit
            </Button>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80"
          alt="Natural wellness ingredients in a bright kitchen setting"
          className="h-[30rem] w-full rounded-card object-cover"
        />
      </div>
    </main>
  )
}

export function JournalPage() {
  const entries = [
    {
      title: "Better sleep starts with a softer evening routine",
      summary: "A simple rhythm for easing into rest with less stimulation and more calm.",
    },
    {
      title: "Gentle energy without the burnout spiral",
      summary: "How to support better stamina with nutrients and routines built for real days.",
    },
    {
      title: "Why digestive comfort matters more than we think",
      summary: "Plant-based support can make everyday gut health feel steadier and simpler.",
    },
  ]

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="text-center">
        <p className="eyebrow">Journal</p>
        <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
          Notes for better everyday rituals.
        </Heading>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {entries.map((entry) => (
          <article key={entry.title} className="rounded-card border border-walnut/10 bg-white/30 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-deep-fern">Wellness journal</p>
            <Heading level={2} className="mt-4 text-2xl">
              {entry.title}
            </Heading>
            <p className="mt-3 leading-7 text-walnut/65">{entry.summary}</p>
            <NavLink href="/shop" className="mt-5 inline-flex font-bold text-deep-fern">
              Explore products →
            </NavLink>
          </article>
        ))}
      </div>
    </main>
  )
}

export function IngredientsPage() {
  const ingredients = [
    ["Moringa", "Nutrient-dense support for steady daily energy."],
    ["Chamomile", "A calming botanical used for softer evening rituals."],
    ["Ginger", "A warming root known for digestive comfort and resilience."],
    ["Collagen", "Beauty support often used to encourage skin and hair vitality."],
  ]

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">Our ingredients</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        Thoughtful ingredients, clear purpose.
      </Heading>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {ingredients.map(([name, description]) => (
          <div key={name} className="rounded-card bg-sage/15 p-6">
            <p className="font-heading text-2xl text-walnut">{name}</p>
            <p className="mt-3 leading-7 text-walnut/65">{description}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-card bg-deep-fern p-8 text-cream">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Why we keep it simple</p>
        <p className="mt-4 text-lg leading-8 text-cream/80">
          We prioritize ingredients you can understand and routines you can keep. No clutter, no mystery blends—just ingredients chosen for their role in real wellness.
        </p>
      </div>
    </main>
  )
}

export function FaqPage() {
  const faq = [
    {
      question: "How long does delivery take?",
      answer: "Most orders are delivered within 2–5 business days across Nigeria, depending on your location.",
    },
    {
      question: "Do you offer subscriptions?",
      answer: "Yes. Many bestsellers can be reordered on a subscription basis for a simple, consistent routine.",
    },
    {
      question: "Can I change or cancel my order?",
      answer: "If your order has not yet been processed, we can usually help amend or cancel it quickly.",
    },
    {
      question: "Are your products suitable for sensitive people?",
      answer: "Our formulas are designed to be gentle and transparent, but we recommend checking with a qualified healthcare professional if you have special health concerns.",
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">Help & FAQ</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        Questions, answered simply.
      </Heading>
      <div className="mt-10 space-y-4">
        {faq.map((item) => (
          <details key={item.question} className="rounded-card border border-walnut/10 bg-white/30 p-5">
            <summary className="cursor-pointer list-none font-semibold text-walnut">{item.question}</summary>
            <p className="mt-3 leading-7 text-walnut/65">{item.answer}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button onClick={() => (window.location.href = "/contact")}>Ask a question</Button>
      </div>
    </main>
  )
}

export function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">Contact</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        We’d love to hear from you.
      </Heading>
      <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-card border border-walnut/10 bg-white/30 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-deep-fern">Email</p>
            <p className="mt-2 text-walnut/70">hello@zoenaturals.com</p>
          </div>
          <div className="rounded-card border border-walnut/10 bg-white/30 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-deep-fern">Phone</p>
            <p className="mt-2 text-walnut/70">+234 (0) 800 000 0000</p>
          </div>
          <div className="rounded-card border border-walnut/10 bg-white/30 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-deep-fern">Hours</p>
            <p className="mt-2 text-walnut/70">Mon–Sat · 8:00am–6:00pm</p>
          </div>
        </div>
        <div className="rounded-card bg-sage/15 p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-deep-fern">Send a message</p>
          <div className="mt-5 space-y-4">
            <TextField placeholder="Name" aria-label="Name" />
            <TextField type="email" placeholder="Email" aria-label="Email" />
            <TextArea placeholder="How can we help?" aria-label="How can we help?" />
            <Button onClick={() => (window.location.href = "/shop")}>Send message</Button>
          </div>
        </div>
      </div>
    </main>
  )
}

export function QuizPage() {
  const questions = [
    {
      question: "What do you want more of right now?",
      options: ["Better sleep", "More energy", "Less digestive stress", "Glow and balance"],
    },
    {
      question: "Which ritual feels most like you?",
      options: ["Night wind-down", "Morning reset", "Daily nourishment", "Gentle self-care"],
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">Wellness quiz</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        Find your next ritual.
      </Heading>
      <div className="mt-10 space-y-8">
        {questions.map((item, index) => (
          <div key={item.question} className="rounded-card border border-walnut/10 bg-white/30 p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-deep-fern">Question {index + 1}</p>
            <p className="mt-3 font-heading text-2xl">{item.question}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {item.options.map((option) => (
                <Button key={option} variant="secondary" onClick={() => (window.location.href = "/shop")}>{option}</Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

export function AccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">My account</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        Welcome back to your ritual.
      </Heading>
      <div className="mt-10 rounded-card border border-walnut/10 bg-white/30 p-8">
        <p className="text-walnut/65">Your account dashboard is ready for future sign-in flows and saved rituals.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => (window.location.href = "/shop")}>Browse products</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/checkout")}>Checkout</Button>
        </div>
      </div>
    </main>
  )
}

export function NotFoundPage({ product = false }: { product?: boolean }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-24 text-center">
      <p className="eyebrow">404</p>
      <Heading level={1} className="mt-4 text-5xl">
        {product ? "Product not found" : "This page wandered off"}
      </Heading>
      <p className="mt-4 text-walnut/65">
        {product
          ? "This product may have moved or is no longer available."
          : "The page you’re looking for doesn’t seem to be here."}
      </p>
      <NavLink
        href={product ? "/shop" : "/"}
        className="mt-7 inline-block font-bold text-deep-fern"
      >
        {product ? "Return to shop" : "Return home"} →
      </NavLink>
    </main>
  )
}
