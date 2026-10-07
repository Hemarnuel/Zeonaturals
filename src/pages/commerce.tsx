import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
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
  ProductVariant,
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
import { IS_DEMO_CHECKOUT } from "../config"
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
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
]

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)
}

function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    document.title = title
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "description"
      document.head.append(meta)
    }
    meta.content = description
  }, [title, description])
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
  variant,
}: {
  product: Product
  quantity?: number
  stacked?: boolean
  variant?: ProductVariant
}) {
  const { addItemQuantity } = useCart()
  const navigate = useNavigate()
  const resolvedVariant = variant ?? (product.variants?.length
    ? product.variants.reduce((lowest, item) =>
        (item.salePrice ?? item.price) < (lowest.salePrice ?? lowest.price) ? item : lowest,
      )
    : undefined)
  const available = resolvedVariant?.stock ?? product.stock
  const unitPrice = resolvedVariant?.salePrice ?? product.salePrice ?? resolvedVariant?.price ?? product.price
  const unavailable = available === 0
  const cartProduct = {
    id: product.id,
    variantId: resolvedVariant?.id,
    slug: product.slug,
    name: resolvedVariant ? `${product.name} — ${resolvedVariant.name}` : product.name,
    price: unitPrice,
    image: resolvedVariant ? (product.images?.[0] ?? product.image) : product.image,
    stock: available,
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
  usePageMetadata("Shop wellness products | Zoenaturals", "Explore plant-powered supplements and wellness products by goal or category.")
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const sort = searchParams.get("sort") ?? "newest"
  const filterKey = searchParams.toString()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")

    const queryParams = new URLSearchParams(filterKey)
    queryParams.set("page", String(page))
    queryParams.set("limit", "13")
    apiRequest<any>(`/api/products?${queryParams}`, {
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
    next.delete("page")
    setSearchParams(next)
  }

  function search(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    query.trim() ? next.set("q", query.trim()) : next.delete("q")
    next.delete("page")
    setSearchParams(next)
  }

  const visibleProducts = products.slice(0, 12)
  const hasNextPage = products.length > 12

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) next.set("page", String(nextPage))
    else next.delete("page")
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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Sort by
            <select value={sort} onChange={(event) => {
              const next = new URLSearchParams(searchParams)
              next.set("sort", event.target.value)
              next.delete("page")
              setSearchParams(next)
            }} className="h-11 rounded-card border border-walnut/15 bg-white/55 px-3">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="bestselling">Bestselling</option>
            </select>
          </label>
          {searchParams.size > 0 && (
            <Button variant="nav" onClick={() => { setQuery(""); setSearchParams({}) }}>Clear filters</Button>
          )}
        </div>

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
              No products match
            </Heading>
            <p className="mt-2 text-walnut/65">
              Try a different search or remove a filter.
            </p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const cheapestVariant = product.variants?.length
                ? product.variants.reduce((lowest, item) =>
                    (item.salePrice ?? item.price) < (lowest.salePrice ?? lowest.price) ? item : lowest,
                  )
                : undefined
              const currentPrice = cheapestVariant?.salePrice ?? product.salePrice ?? cheapestVariant?.price ?? product.price
              const originalPrice = cheapestVariant?.salePrice != null
                ? cheapestVariant.price
                : product.salePrice != null
                  ? product.price
                  : undefined
              const available = product.variants?.length
                ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
                : product.stock
              return (
              <article key={product.id}>
                <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
                  <ProductImage product={product} />
                </NavLink>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-deep-fern">
                  {product.goal}
                </p>
                {originalPrice != null && <span className="mt-2 inline-block rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-white">Sale</span>}
                <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
                  <Heading level={2} className="mt-2 text-2xl">
                    {product.name}
                  </Heading>
                </NavLink>
                <p className="mb-1 mt-1 font-semibold text-walnut/70">
                  {originalPrice != null && <span className="mr-2 text-sm text-walnut/45 line-through">{formatNaira(originalPrice)}</span>}
                  {product.variants?.length ? `From ${formatNaira(currentPrice)}` : formatNaira(currentPrice)}
                </p>
                {available <= 5 && <p className="mb-4 text-xs font-bold text-terracotta">{available > 0 ? "Low stock" : "Out of stock"}</p>}
                <ProductActions product={product} />
              </article>
            )})}
          </div>
        )}
        {!loading && !error && products.length > 0 && (
          <nav className="mt-12 flex items-center justify-center gap-4" aria-label="Product pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
            <span className="text-sm font-semibold">Page {page}</span>
            <Button variant="secondary" disabled={!hasNextPage} onClick={() => changePage(page + 1)}>Next</Button>
          </nav>
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
  const [selectedVariantId, setSelectedVariantId] = useState("")
  const [activeImage, setActiveImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const imageTouchStart = useRef<number | null>(null)
  const imageSwiped = useRef(false)
  const [activeTab, setActiveTab] =
    useState<"description" | "ingredients" | "use">("description")
  usePageMetadata(
    `${product?.name ?? "Product"} | Zoenaturals`,
    product?.description ?? "Explore thoughtful plant-powered wellness products from Zoenaturals.",
  )

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
        setSelectedVariantId(nextProduct.variants?.[0]?.id ?? "")
        setActiveImage(0)
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
  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId)
  const available = selectedVariant?.stock ?? product.stock
  const price = selectedVariant?.salePrice ?? product.salePrice ?? selectedVariant?.price ?? product.price
  const originalPrice = selectedVariant?.salePrice != null
    ? selectedVariant.price
    : product.salePrice != null
      ? product.price
      : undefined
  const images = product.images?.length ? product.images : product.image ? [product.image] : []
  const currentImage = images[activeImage]

  return (
    <main className="pb-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div>
          <button type="button" onTouchStart={(event) => { imageTouchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => {
            if (imageTouchStart.current === null || images.length < 2) return
            const delta = (event.changedTouches[0]?.clientX ?? imageTouchStart.current) - imageTouchStart.current
            if (Math.abs(delta) > 40) {
              setActiveImage((current) => (current + (delta < 0 ? 1 : images.length - 1)) % images.length)
              imageSwiped.current = true
              window.setTimeout(() => { imageSwiped.current = false }, 500)
            }
            imageTouchStart.current = null
          }} onClick={() => {
            if (imageSwiped.current) {
              imageSwiped.current = false
              return
            }
            setZoomed(true)
          }} aria-label="Zoom product image" className="w-full cursor-zoom-in">
            {currentImage ? <img src={currentImage} alt={`${product.name} image ${activeImage + 1}`} className="h-[32rem] w-full rounded-card object-cover lg:h-[40rem]" /> : <ProductImage product={product} className="h-[32rem] lg:h-[40rem]" />}
          </button>
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show product image ${index + 1}`} className={`shrink-0 rounded-card ${activeImage === index ? "ring-2 ring-deep-fern" : ""}`}><img src={image} alt="" className="size-20 rounded-card object-cover" /></button>)}</div>}
        </div>
        <div className="lg:pt-8">
          <p className="eyebrow">{product.goal}</p>
          <Heading level={1} className="mt-3 text-4xl sm:text-5xl">
            {product.name}
          </Heading>
          <p className="mt-4 text-xl font-semibold">
            {originalPrice != null && <span className="mr-2 rounded-full bg-terracotta px-2 py-1 align-middle text-xs font-bold text-white">Sale</span>}
            {originalPrice != null && <span className="mr-2 text-base text-walnut/45 line-through">{formatNaira(originalPrice)}</span>}
            {formatNaira(price)}
          </p>
          {available <= 5 && <p className="mt-2 text-sm font-bold text-terracotta">{available > 0 ? `Only ${available} left` : "Out of stock"}</p>}
          <p className="mt-6 leading-7 text-walnut/65">{product.description}</p>
          <p className="mt-3 text-xs leading-6 text-walnut/55">These statements have not been evaluated by NAFDAC. This product is not intended to diagnose, treat, cure or prevent any disease. Consult your doctor before use.</p>
          {product.variants && product.variants.length > 0 && (
            <label className="mt-6 block text-sm font-bold">
              Pack size
              <select value={selectedVariantId} onChange={(event) => { setSelectedVariantId(event.target.value); setQuantity(1) }} className="mt-2 block h-12 w-full rounded-card border border-walnut/15 bg-white/55 px-4">
                {product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} — {formatNaira(variant.salePrice ?? variant.price)}</option>)}
              </select>
            </label>
          )}
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
                setQuantity((value) => Math.min(available, value + 1))
                }
                disabled={quantity >= available}
                aria-label="Increase quantity"
              >
                +
              </Button>
            </div>
            <span className="ml-3 text-xs text-walnut/55">
              {available ? `${available} available` : "Out of stock"}
            </span>
          </div>
          <div className="mt-7">
            <ProductActions product={product} quantity={quantity} stacked variant={selectedVariant} />
          </div>
          {zoomed && currentImage && (
            <button type="button" className="fixed inset-0 z-[80] grid cursor-zoom-out place-items-center bg-black/85 p-5" aria-label="Close zoomed product image" onClick={() => setZoomed(false)}>
              <img src={currentImage} alt={`${product.name} enlarged`} className="max-h-full max-w-full object-contain" />
            </button>
          )}
          <div className="fixed inset-x-0 bottom-16 z-30 flex items-center justify-between gap-4 border-t border-walnut/10 bg-cream/95 px-4 py-3 shadow-nav backdrop-blur md:hidden">
            <span className="font-bold">{formatNaira(price)}</span>
            <ProductActions product={product} quantity={quantity} variant={selectedVariant} stacked />
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
  const { items, setQuantity, removeItem, setStock } = useCart()
  const navigate = useNavigate()
  const [stockError, setStockError] = useState("")
  const cartSignature = items.map((item) => `${item.id}:${item.variantId ?? ""}:${item.quantity}`).join("|")

  useEffect(() => {
    let active = true
    setStockError("")
    Promise.all(items.map(async (item) => {
      if (!item.slug) return
      const payload = await apiRequest<any>(`/api/products/${encodeURIComponent(item.slug)}`)
      const product = normalizeProduct(payload.product ?? payload.data?.product ?? payload.data ?? payload)
      const variant = item.variantId
        ? product.variants?.find((entry) => entry.id === item.variantId)
        : undefined
      setStock(item.id, variant?.stock ?? product.stock, item.variantId)
    })).catch((reason) => {
      if (active) setStockError(reason instanceof Error ? reason.message : "Cart availability could not be checked.")
    })
    return () => { active = false }
  }, [cartSignature])

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
            {stockError && <p role="alert" className="mb-4 rounded-card bg-terracotta/10 p-4 text-sm font-semibold text-terracotta">{stockError}</p>}
            <div className="divide-y divide-walnut/10 rounded-card border border-walnut/10 bg-white/30 px-5">
              {items.map((item) => (
                <article
                  key={`${item.id}:${item.variantId ?? ""}`}
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
                    {item.stock !== undefined && item.stock <= 5 && <p className="mt-1 text-xs font-bold text-terracotta">{item.stock ? `Only ${item.stock} left` : "Out of stock"}</p>}
                    <p className="mt-1 text-sm font-semibold text-walnut/65">
                      {formatNaira(item.price)}
                    </p>
                    <Button
                      variant="nav"
                      className="mt-2 px-0 text-xs text-terracotta"
                      onClick={() => removeItem(item.id, item.variantId)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="col-start-2 flex items-center sm:col-auto">
                    <Button
                      variant="icon"
                      onClick={() => setQuantity(item.id, item.quantity - 1, item.variantId)}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </Button>
                    <span className="w-9 text-center font-bold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="icon"
                      onClick={() => setQuantity(item.id, item.quantity + 1, item.variantId)}
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
                {IS_DEMO_CHECKOUT
                  ? "Demo prices only. No payment will be collected."
                  : "Your payable total will be confirmed by the server."}
              </p>
              <Button className="mt-4" disabled={items.some((item) => item.stock === 0)} onClick={() => navigate("/checkout")}>
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
    state: "",
  })
  const [honeypot, setHoneypot] = useState("")

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
            ...(item.variantId ? { variantId: item.variantId } : {}),
            qty: item.quantity,
          })),
          paymentMethod,
          termsAccepted: true,
          website: honeypot,
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
          ? (reason instanceof ApiError && reason.status === 429) || reason.message.toLowerCase().includes("too many")
            ? "Too many requests, please try again shortly."
            : reason.message
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
          {IS_DEMO_CHECKOUT ? "Demo order captured" : "Order received"}
        </Heading>
        <p className="mt-4 text-walnut/65">
          {IS_DEMO_CHECKOUT
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
                {IS_DEMO_CHECKOUT ? "Simulated test amount" : "Server-confirmed amount"}
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
        eyebrow={IS_DEMO_CHECKOUT ? "Demo checkout" : "Secure checkout"}
        title="Complete your order"
        copy={
          IS_DEMO_CHECKOUT
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
              pattern="(?:\+?234|0)[789][01][0-9]{8}"
              title="Enter a valid Nigerian phone number."
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
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Nigerian state</span>
              <select required value={customer.state} onChange={(event) => updateCustomer("state", event.target.value)} className="h-11 w-full rounded-card border border-walnut/15 bg-white/55 px-4 text-sm">
                <option value="">Select state</option>
                {nigerianStates.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>
          <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </label>

          <Heading level={2} className="mt-10 text-2xl">
            Payment
          </Heading>
          <div className="mt-5 grid gap-3">
            <RadioField
              name="payment"
              value="paystack"
              checked={paymentMethod === "paystack"}
              onChange={() => setPaymentMethod("paystack")}
              label={IS_DEMO_CHECKOUT ? "Simulate online payment" : "Pay online with Paystack"}
              description={
                IS_DEMO_CHECKOUT
                  ? "Completes a test flow only. No card, bank, or USSD payment is made."
                  : "Card, bank transfer, or USSD. Items are reserved for 30 minutes while you pay."
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
          <label className="mt-5 flex items-start gap-3 text-sm text-walnut/70">
            <input type="checkbox" required className="mt-1 accent-deep-fern" />
            <span>I agree to the <a href="/terms" className="font-bold text-deep-fern underline">terms</a> and <a href="/returns" className="font-bold text-deep-fern underline">returns policy</a>.</span>
          </label>
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
              {IS_DEMO_CHECKOUT ? "Simulated pricing" : "Secure server pricing"}
            </p>
            <p className="mt-2 text-sm leading-6 text-walnut/65">
              {IS_DEMO_CHECKOUT
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
                ? IS_DEMO_CHECKOUT
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
    let active = true
    let attempts = 0
    let timeout: ReturnType<typeof setTimeout>

    async function verifyPayment() {
      try {
        const payload = await apiRequest<any>(
          `/api/orders/verify/${encodeURIComponent(reference)}`,
        )
        const status = payload.status ?? payload.data?.status
        if (!active) return
        if (status === "paid") {
          clearCart()
          setState("paid")
          return
        }
      } catch {
        if (!active) return
      }

      attempts += 1
      if (attempts >= 11) {
        setState("unconfirmed")
        return
      }
      timeout = setTimeout(verifyPayment, 3000)
    }

    void verifyPayment()
    return () => {
      active = false
      clearTimeout(timeout)
    }
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
            {IS_DEMO_CHECKOUT ? "Demo payment complete" : "Order confirmed"}
          </Heading>
          <p className="mt-3 text-walnut/65">
            {IS_DEMO_CHECKOUT
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

export function TrackingPage() {
  const [reference, setReference] = useState("")
  const [email, setEmail] = useState("")
  const [tracking, setTracking] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function trackOrder(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setTracking(null)
    try {
      const query = new URLSearchParams({ reference: reference.trim(), email: email.trim() })
      setTracking(await apiRequest<any>(`/api/orders/track?${query}`))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Order status could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">Order tracking</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">Follow your order</Heading>
      <p className="mt-4 text-walnut/65">Enter your order reference and the email used at checkout.</p>
      <form onSubmit={trackOrder} className="mt-8 grid gap-4 rounded-card border border-walnut/10 bg-white/30 p-6 sm:grid-cols-2">
        <TextField required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Order reference" aria-label="Order reference" />
        <TextField required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-label="Email address" />
        <Button type="submit" disabled={loading} className="sm:col-span-2">{loading ? "Checking…" : "Track order"}</Button>
      </form>
      {error && <p role="alert" className="mt-5 rounded-card bg-terracotta/10 p-4 text-sm font-semibold text-terracotta">{error}</p>}
      {tracking && <section className="mt-8 rounded-card bg-sage/15 p-6">
        <p className="text-sm font-semibold">Reference: {tracking.reference}</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-4">
          {tracking.timeline.map((step: { status: string; label: string; complete: boolean }) => <li key={step.status} className={`rounded-card p-4 text-center ${step.complete ? "bg-deep-fern text-cream" : "bg-white/60 text-walnut/50"}`}><span className="block text-sm font-bold">{step.label}</span><span className="mt-1 block text-xs">{step.complete ? "Complete" : "Pending"}</span></li>)}
        </ol>
      </section>}
    </main>
  )
}

export function PolicyPage() {
  const page = window.location.pathname.split("/").pop()
  const policy = page === "privacy"
    ? { title: "Privacy", copy: "We use the information you provide to process and deliver your orders, respond to support requests, and maintain essential site functionality. We do not sell personal information. Contact hello@zoenaturals.com to ask about your data." }
    : page === "returns"
      ? { title: "Returns", copy: "Contact hello@zoenaturals.com within 7 days of delivery if an item arrives damaged or incorrect. For hygiene and safety, opened supplements cannot be returned unless faulty. We’ll help arrange an eligible return or replacement." }
      : { title: "Terms", copy: "By placing an order, you agree to provide accurate delivery information and accept the prices and policies shown at checkout. Product statements are not medical advice. Consult a qualified healthcare professional before using supplements." }
  usePageMetadata(`${policy.title} | Zoenaturals`, `${policy.title} policy for Zoenaturals orders and customers.`)
  return <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24"><p className="eyebrow">Customer information</p><Heading level={1} className="mt-4 text-4xl">{policy.title}</Heading><p className="mt-6 leading-8 text-walnut/70">{policy.copy}</p><p className="mt-5 text-sm text-walnut/55">Questions? Contact <a className="font-semibold text-deep-fern underline" href="mailto:hello@zoenaturals.com">hello@zoenaturals.com</a>.</p></main>
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
  const productFormRef = useRef<HTMLFormElement>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [goalFilter, setGoalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all")
  const [sortBy, setSortBy] = useState<"newest" | "name" | "price" | "stock" | "sales">("newest")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

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
    await persistForm(form.published ?? true)
  }

  async function persistForm(published: boolean) {
    try {
      const nextProduct = isSupabaseConfigured
        ? await saveRemoteProduct({ ...form, published })
        : saveProductRecord({ ...form, published })
      await refreshProducts()
      setNotice(
        form.id
          ? `Product updated: ${nextProduct.name}`
          : published
            ? `Product published: ${nextProduct.name}`
            : `Draft saved: ${nextProduct.name}`,
      )
      setForm(emptyForm)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save product.")
    }
  }

  function handleSaveDraft() {
    if (!productFormRef.current?.reportValidity()) return
    void persistForm(false)
  }

  function handleEdit(product: Product) {
    setForm({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      salesCount: product.salesCount,
      salePrice: product.salePrice,
      variants: product.variants,
      images: product.images,
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
    productFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function handleDelete(id: string) {
    const product = products.find((item) => item.id === id)
    if (!product || !window.confirm(`Remove "${product.name}" from the catalog?`)) return

    try {
      if (isSupabaseConfigured) await removeRemoteProduct(id)
      else removeProductRecord(id)
      await refreshProducts()
      if (form.id === id) setForm(emptyForm)
      setNotice(`Product removed: ${product.name}`)
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

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.goal.toLowerCase().includes(query)
      )
    }

    if (categoryFilter) {
      result = result.filter((product) => product.category === categoryFilter)
    }

    if (goalFilter) {
      result = result.filter((product) => product.goal === goalFilter)
    }

    if (statusFilter === "published") {
      result = result.filter((product) => product.published !== false)
    } else if (statusFilter === "draft") {
      result = result.filter((product) => product.published === false)
    }

    result.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""

      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case "price":
          aVal = a.price
          bVal = b.price
          break
        case "stock":
          aVal = a.stock
          bVal = b.stock
          break
        case "sales":
          aVal = a.salesCount ?? 0
          bVal = b.salesCount ?? 0
          break
        case "newest":
        default:
          aVal = a.id
          bVal = b.id
          break
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [products, searchQuery, categoryFilter, goalFilter, statusFilter, sortBy, sortOrder])

  const allCategories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products])
  const allGoals = useMemo(() => [...new Set(products.map((p) => p.goal).filter(Boolean))].sort(), [products])

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
        <form
          ref={productFormRef}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-card border border-walnut/10 bg-white/35 p-6"
        >
          <div>
            <Heading level={2} className="text-2xl">
              {form.id ? `Edit ${form.name || "product"}` : "Add a product"}
            </Heading>
            {form.id && (
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => setForm(emptyForm)}
              >
                Cancel editing
              </Button>
            )}
          </div>
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
            <p className="text-xs font-bold uppercase tracking-wider text-deep-fern">Product status</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.published !== false}
                onChange={(event) => updateField("published", event.target.checked)}
                className="size-4 accent-deep-fern"
              />
              Published
            </label>
            <p className="mt-2 text-xs leading-5 text-walnut/65">
              Storefront visibility filtering is off for now, so all products appear in the shop regardless of status.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button type="submit">
                {form.id ? "Save changes" : "Save product"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
              >
                Save as draft
              </Button>
            </div>
          </div>
        </form>

        <div className="rounded-card border border-walnut/10 bg-white/35 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <Heading level={2} className="text-2xl">All products</Heading>
              <p className="mt-1 text-sm text-walnut/65">
                {filteredProducts.length} of {products.length} products
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchQuery("")
                  setCategoryFilter("")
                  setGoalFilter("")
                  setStatusFilter("all")
                }}
                disabled={!searchQuery && !categoryFilter && !goalFilter && statusFilter === "all"}
              >
                Clear filters
              </Button>
            </div>
          </div>

          <div className="mb-6 rounded-card bg-sage/15 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-deep-fern">Filters</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <TextField
                placeholder="Search name, slug, category, goal"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search products"
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-card border border-walnut/15 bg-white/55 px-4 text-sm"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={goalFilter}
                onChange={(event) => setGoalFilter(event.target.value)}
                className="h-11 rounded-card border border-walnut/15 bg-white/55 px-4 text-sm"
                aria-label="Filter by goal"
              >
                <option value="">All goals</option>
                {allGoals.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "published" | "draft")}
                className="h-11 rounded-card border border-walnut/15 bg-white/55 px-4 text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-walnut/65">Sort by</span>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(event) => {
                    const [by, order] = event.target.value.split(":")
                    setSortBy(by as "newest" | "name" | "price" | "stock" | "sales")
                    setSortOrder(order as "asc" | "desc")
                  }}
                  className="h-11 rounded-card border border-walnut/15 bg-white/55 px-4 text-sm"
                  aria-label="Sort products"
                >
                  <option value="newest:desc">Newest first</option>
                  <option value="newest:asc">Oldest first</option>
                  <option value="name:asc">Name A–Z</option>
                  <option value="name:desc">Name Z–A</option>
                  <option value="price:asc">Price low to high</option>
                  <option value="price:desc">Price high to low</option>
                  <option value="stock:asc">Stock low to high</option>
                  <option value="stock:desc">Stock high to low</option>
                  <option value="sales:asc">Sales low to high</option>
                  <option value="sales:desc">Sales high to low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-walnut/60">
                {products.length === 0 ? "No admin products yet." : "No products match the current filters."}
              </p>
            ) : (
              filteredProducts.map((product) => (
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
  const [tab, setTab] = useState<"orders" | "subscriptions" | "details">("orders")
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow">My account</p>
      <Heading level={1} className="mt-4 text-4xl sm:text-5xl">
        Welcome back to your ritual.
      </Heading>
      <div className="mt-10 flex flex-wrap gap-2 border-b border-walnut/15">
        {(["orders", "subscriptions", "details"] as const).map((item) => <Button key={item} variant="nav" className={tab === item ? "border-b-2 border-deep-fern text-deep-fern" : ""} onClick={() => setTab(item)}>{item === "details" ? "Details" : item === "orders" ? "Orders & reorder" : "Subscriptions"}</Button>)}
      </div>
      <div className="mt-6 rounded-card border border-walnut/10 bg-white/30 p-8">
        {tab === "orders" && <><p className="text-walnut/65">Your recent orders will appear here.</p><Button className="mt-5" onClick={() => (window.location.href = "/track")}>Track an order</Button></>}
        {tab === "subscriptions" && <p className="text-walnut/65">You don’t have any active subscriptions yet. Subscribe-and-save options will appear here.</p>}
        {tab === "details" && <div className="space-y-4"><TextField placeholder="Full name" aria-label="Full name" /><TextField type="email" placeholder="Email address" aria-label="Email address" /><TextField type="tel" placeholder="Phone number" aria-label="Phone number" /><p className="text-xs text-walnut/50">Account details are a mockup and are not saved.</p></div>}
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
