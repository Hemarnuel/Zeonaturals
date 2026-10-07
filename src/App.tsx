import { FormEvent, useEffect, useRef, useState } from "react"
import { Outlet } from "react-router"
import { apiRequest, extractProducts, type Product } from "./api"
import { useCart } from "./cart"
import { Button, Heading, Icon, NavLink, TextField } from "./components/ui"

const goals = ["Sleep", "Energy", "Immunity", "Digestion", "Skin & Hair"]
const categories = ["Herbal Teas", "Supplements", "Superfoods", "Body Care"]
const herbalTeaImages = [
  {
    src: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
    alt: "Freshly brewed herbal tea served in a glass cup",
  },
  {
    src: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80",
    alt: "Matcha tea whisked into a bright green latte",
  },
]
const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1400&q=85",
    alt: "Herbal tea steeping in a glass cup beside tea bags",
    tagline: "Brew a softer moment",
    headline: "Let the day steep away.",
  },
  {
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=1400&q=85",
    alt: "Matcha green tea whisked in a ceramic bowl",
    tagline: "Clean morning ritual",
    headline: "Clarity in every cup.",
  },
  {
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1400&q=85",
    alt: "Fresh botanical ingredients and herbal infusion",
    tagline: "Whole plant nourishment",
    headline: "Rooted in real life.",
  },
  {
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=85",
    alt: "Nourishing wellness bowl and organic herbs",
    tagline: "Daily vitality & balance",
    headline: "Feel light, naturally.",
  },
]

const reviews = [
  {
    quote:
      "The evening blend has become the gentlest part of my routine. I wake up feeling truly rested.",
    name: "Amara O.",
    product: "Calm Night Blend",
  },
  {
    quote:
      "Simple ingredients, beautiful packaging, and I can actually feel the difference in my energy.",
    name: "Tomi A.",
    product: "Daily Moringa",
  },
  {
    quote:
      "I love that every formula is easy to understand. Zoenaturals makes wellness feel approachable.",
    name: "Adaeze N.",
    product: "Radiant Roots",
  },
]

type ProductCardProps = {
  product: Product
  index: number
}

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)
}

function Brand() {
  return (
    <NavLink
      href="/"
      className="inline-flex items-center gap-2"
      aria-label="ZeoNaturals home"
    >
      <span className="grid size-9 place-items-center rounded-full bg-deep-fern text-cream">
        <Icon name="sprout" size="sm" />
      </span>
      <span className="font-heading text-xl tracking-tight text-walnut">
        ZeoNaturals
      </span>
    </NavLink>
  )
}

function SearchBox({
  inputRef,
  compact = false,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>
  compact?: boolean
}) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      apiRequest<any>(`/api/products?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: controller.signal,
      })
        .then((payload) => setSuggestions(extractProducts(payload).slice(0, 5)))
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error("Product suggestions could not be loaded:", error)
            setSuggestions([])
          }
        })
    }, 180)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (query.trim()) {
      window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`
    }
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`relative ${compact ? "w-full" : "w-full max-w-md"}`}
      onBlur={() => setTimeout(() => setFocused(false), 120)}
    >
      <TextField
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="What can nature help with?"
        aria-label="Search products"
        className="w-full pr-12"
      />
      <Button
        type="submit"
        variant="icon"
        className="absolute right-1.5 top-1/2 -translate-y-1/2"
        aria-label="Submit search"
      >
        <Icon name="search" size="sm" />
      </Button>
      {focused && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-walnut/10 bg-cream shadow-soft">
          {suggestions.map((product) => (
            <a
              key={product.id}
              href={`/product/${encodeURIComponent(product.slug)}`}
              className="block px-4 py-3 text-sm transition hover:bg-sage/20"
            >
              <span className="font-semibold">{product.name}</span>
              <span className="ml-2 text-walnut/55">{formatNaira(product.price)}</span>
            </a>
          ))}
        </div>
      )}
    </form>
  )
}

function MegaMenu({ close }: { close: () => void }) {
  const [goalsList, setGoalsList] = useState<string[]>(goals);
  const [categoriesList, setCategoriesList] = useState<string[]>(categories);

  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/categories")
      .then((payload) => {
        if (active) {
          if (Array.isArray(payload.goals) && payload.goals.length) {
            setGoalsList(payload.goals);
          }
          if (Array.isArray(payload.categories) && payload.categories.length) {
            setCategoriesList(payload.categories);
          }
        }
      })
      .catch((error) => console.error("Could not load product categories:", error));
    return () => { active = false };
  }, []);

  return (
    <div className="absolute inset-x-0 top-full border-t border-walnut/10 bg-cream shadow-soft">
      <div className="mx-auto grid max-w-7xl grid-cols-[1.5fr_1fr_1fr] gap-12 px-8 py-9">
        <div>
          <p className="eyebrow">Shop by goal</p>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
            {goalsList.map((goal) => (
              <NavLink
                key={goal}
                href={`/shop?goal=${encodeURIComponent(goal)}`}
                onClick={close}
              >
                {goal}
              </NavLink>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">Shop by category</p>
          <div className="mt-5 flex flex-col gap-3">
            {categoriesList.map((category) => (
              <NavLink
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
                onClick={close}
              >
                {category}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="rounded-card bg-sage/25 p-6">
          <span className="inline-block rounded-full bg-gold px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-walnut">
            Most loved
          </span>
          <Heading level={3} className="mt-4 text-2xl">
            Our full collection
          </Heading>
          <p className="mt-2 text-sm leading-6 text-walnut/70">
            Explore every published product, from daily essentials to new blends.
          </p>
          <NavLink
            href="/shop?sort=bestselling"
            className="mt-5 inline-flex font-bold text-deep-fern"
            onClick={close}
          >
            Explore the collection <span aria-hidden="true">→</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function Header({
  searchRef,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-walnut/10 bg-cream/95 backdrop-blur-md">
      <div className="border-b border-walnut/10 bg-deep-fern px-4 py-2 text-center text-xs font-semibold tracking-wide text-cream">
        Free delivery across Nigeria on orders over ₦50,000
      </div>
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-5 lg:px-8">
        <Brand />
        <div className="hidden flex-1 justify-center md:flex">
          <SearchBox inputRef={searchRef} />
        </div>
        <nav
          className="ml-auto hidden items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          <Button
            variant="nav"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
          >
            Shop <Icon name="chevronDown" size="xs" />
          </Button>
          <NavLink href="/about" className="px-3 py-2 text-sm font-semibold">
            Our story
          </NavLink>
          <NavLink href="/journal" className="px-3 py-2 text-sm font-semibold">
            Journal
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <NavLink href="/account" aria-label="Account" className="hidden sm:inline-grid rounded-full p-2">
            <Icon name="user" />
          </NavLink>
          <Button
            variant="icon"
            aria-label={`Cart with ${itemCount} items`}
            className="relative"
            onClick={() => (window.location.href = "/cart")}
          >
            <Icon name="bag" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
      <div className="px-5 pb-4 md:hidden">
        <SearchBox inputRef={searchRef} compact />
      </div>
      {menuOpen && <MegaMenu close={() => setMenuOpen(false)} />}
    </header>
  )
}

function ProductCard({ product, index }: ProductCardProps) {
  const { addItemQuantity } = useCart()
  const available = product.variants?.length
    ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
    : product.stock
  const cheapestVariant = product.variants?.length
    ? product.variants.reduce((lowest, item) =>
        (item.salePrice ?? item.price) < (lowest.salePrice ?? lowest.price) ? item : lowest,
      )
    : undefined
  const regularPrice = cheapestVariant?.price ?? product.price
  const salePrice = cheapestVariant?.salePrice ?? product.salePrice
  const fallbackImage = herbalTeaImages[index % herbalTeaImages.length]
  const [imageSource, setImageSource] = useState(product.image || fallbackImage.src)

  useEffect(() => {
    setImageSource(product.image || fallbackImage.src)
  }, [product.image, fallbackImage.src])

  return (
    <article className="w-[78vw] shrink-0 snap-start sm:w-80">
      <NavLink href={`/product/${encodeURIComponent(product.slug)}`} className="relative block overflow-hidden rounded-card bg-sage/20">
        <img
          src={imageSource}
          alt={product.image && imageSource === product.image ? product.name : fallbackImage.alt}
          onError={() => {
            if (imageSource !== fallbackImage.src) setImageSource(fallbackImage.src)
          }}
          loading="lazy"
          className="h-72 w-full object-cover transition duration-500 hover:scale-105"
        />
        {available <= 5 && (
          <span className="absolute left-3 top-3 rounded-full bg-deep-fern px-3 py-1 text-xs font-bold text-white">
            {available > 0 ? "Low stock" : "Out of stock"}
          </span>
        )}
        {salePrice != null && salePrice < regularPrice && (
          <span className="absolute right-3 top-3 rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-white">
            Sale
          </span>
        )}
      </NavLink>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-deep-fern/80">
        {product.category}
      </p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
            <Heading level={3} className="text-2xl">{product.name}</Heading>
          </NavLink>
          <p className="mt-1 font-semibold text-walnut/70">
            {salePrice != null && salePrice < regularPrice && (
              <span className="mr-2 text-sm text-walnut/45 line-through">
                {formatNaira(regularPrice)}
              </span>
            )}
            {product.variants?.length
              ? `From ${formatNaira(salePrice ?? regularPrice)}`
              : formatNaira(salePrice ?? regularPrice)}
          </p>
        </div>
        <Button
          variant="small"
          disabled={available < 1}
          onClick={() => addItemQuantity(product, 1)}
          aria-label={`Add ${product.name} to cart`}
        >
          {available < 1 ? "Out of stock" : "Add to cart"}
        </Button>
      </div>
      <Button
        className="mt-3 w-full"
        disabled={available < 1}
        onClick={() => {
          addItemQuantity(product, 1)
          window.location.href = "/checkout"
        }}
      >
        {available < 1 ? "Out of stock" : "Order now"}
      </Button>
    </article>
  )
}

function HeroImageSlider() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % heroSlides.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [paused])

  return (
    <div
      className="relative min-h-[25rem] overflow-hidden rounded-card bg-deep-fern shadow-soft sm:min-h-[30rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        setPaused(true)
        touchStart.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return
        const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
        if (Math.abs(delta) > 40) {
          setActive((current) => (current + (delta < 0 ? 1 : heroSlides.length - 1)) % heroSlides.length)
        }
        touchStart.current = null
        setPaused(false)
      }}
    >
      {heroSlides.map((slide, index) => (
        <div
          key={slide.image}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            active === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.alt}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-walnut/85 via-walnut/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-cream sm:p-9">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              {slide.tagline}
            </p>
            <p className="mt-2 max-w-sm font-heading text-3xl leading-tight sm:text-4xl">
              {slide.headline}
            </p>
          </div>
        </div>
      ))}
      <Button
        variant="icon"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 bg-cream/80 text-walnut shadow-md hover:bg-cream"
        onClick={() => setActive((active + heroSlides.length - 1) % heroSlides.length)}
        aria-label="Previous image"
      >
        <Icon name="arrowLeft" />
      </Button>
      <Button
        variant="icon"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 bg-cream/80 text-walnut shadow-md hover:bg-cream"
        onClick={() => setActive((active + 1) % heroSlides.length)}
        aria-label="Next image"
      >
        <Icon name="arrowRight" />
      </Button>
      <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.image}
            aria-label={`Show slide ${index + 1}`}
            aria-current={active === index}
            onClick={() => setActive(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              active === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function GoalProductShelf({ goal }: { goal: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    apiRequest<any>(`/api/products?goal=${encodeURIComponent(goal)}&limit=4`)
      .then((payload) => { if (active) setProducts(extractProducts(payload).slice(0, 4)) })
      .catch((reason) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : `Could not load ${goal} products.`)
        console.error(`Could not load ${goal} products:`, reason)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [goal])
  if (!loading && !error && products.length === 0) return null
  return (
    <section className="py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <Heading level={2} className="text-3xl sm:text-4xl">{goal}</Heading>
        <a href={`/shop?goal=${encodeURIComponent(goal)}`} className="shrink-0 font-semibold text-deep-fern">View all →</a>
      </div>
      {error ? (
        <p role="alert" className="rounded-card bg-terracotta/10 p-5 text-sm text-walnut">{error}</p>
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="animate-pulse"><div className="h-64 rounded-card bg-sage/20" /><div className="mt-4 h-5 w-2/3 rounded bg-sage/25" /></div>)}</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      )}
    </section>
  )
}

function ProductShelf({ title, sort }: { title: string; sort?: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    const url = new URL("/api/products", "http://localhost")
    url.searchParams.set("limit", "4")
    if (sort) {
      url.searchParams.set("sort", sort)
    }
    apiRequest<any>(url.toString())
      .then((payload) => { if (active) setProducts(extractProducts(payload).slice(0, 4)) })
      .catch((reason) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : `Could not load products.`)
        console.error(`Could not load products:`, reason)
      })
      .finally(() => { if (active) setLoading(false) })
  }, [sort])
  if (!loading && !error && products.length === 0) return null
  return (
    <section className="py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <Heading level={2} className="text-3xl sm:text-4xl">{title}</Heading>
        <a href={`/shop${sort ? `?sort=${sort}` : ""}`} className="shrink-0 font-semibold text-deep-fern">View all →</a>
      </div>
      {error ? (
        <p role="alert" className="rounded-card bg-terracotta/10 p-5 text-sm text-walnut">{error}</p>
      ) : loading ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="animate-pulse"><div className="h-64 rounded-card bg-sage/20" /></div>)}</div>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <NavLink
              key={product.id}
              href={`/product/${encodeURIComponent(product.slug)}`}
              className="block group"
            >
              <div className="relative overflow-hidden rounded-card bg-sage/20">
                <img
                  src={product.image || herbalTeaImages[index % herbalTeaImages.length].src}
                  alt={product.image && product.image === product.image ? product.name : herbalTeaImages[index % herbalTeaImages.length].alt}
                  className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-deep-fern/80">
                {product.category}
              </p>
              <p className="font-heading text-lg font-semibold">{product.name}</p>
              <p className="mt-1 font-semibold text-walnut/70">
                {formatNaira(product.price)}
              </p>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  )
}

function GoalCollections() {
  return (
    <div id="bestsellers" className="bg-white/45 py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <ProductShelf title="Newest Product" />
        <ProductShelf title="Best Selling" sort="bestselling" />
        <div className="mt-5 text-center">
          <Button onClick={() => { window.location.href = "/shop" }}>Shop more</Button>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  function joinNewsletter(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail("")
  }

  return (
    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-deep-fern">Wellness, rooted in nature</p>
          <Heading
            level={1}
            className="mt-5 text-5xl leading-[1.04] sm:text-6xl lg:text-7xl"
          >
            Feel more like{" "}
            <em className="font-normal text-deep-fern">yourself.</em>
          </Heading>
          <p className="mt-6 max-w-xl text-lg leading-8 text-walnut/75">
            Thoughtful plant-based formulas, made to support your everyday
            rhythm—from deeper rest to brighter energy.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/quiz")}
            >
              Find my supplement <Icon name="arrowRight" size="sm" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/shop")}
            >
              Shop all wellness
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-walnut/70">
            <span className="inline-flex items-center gap-2">
              <Icon name="check" size="sm" />
              Plant-powered
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="check" size="sm" />
              Responsibly sourced
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="check" size="sm" />
              Made with care
            </span>
          </div>
        </div>
        <HeroImageSlider />
      </section>

      <section className="border-y border-walnut/10 bg-cream">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 py-8 lg:grid-cols-4 lg:px-8">
          {[
            ["flask", "Lab-tested", "Quality you can trust"],
            ["sprout", "Natural ingredients", "Thoughtfully sourced"],
            ["truck", "Fast delivery", "Across Nigeria"],
            ["lock", "Secure payment", "Protected checkout"],
          ].map(([icon, title, description], index) => (
            <div
              key={title}
              className={`flex items-center gap-3 px-2 py-4 sm:px-5 ${
                index % 2 ? "border-l border-walnut/10" : ""
              } ${index === 2 ? "lg:border-l" : ""}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage/25 text-deep-fern">
                <Icon name={icon} size="sm" />
              </span>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-0.5 text-xs text-walnut/60">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <GoalCollections />

      <section
        id="our-story"
        className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24"
      >
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200"
            alt="Woman wearing a fresh flower in warm natural light"
            className="h-[34rem] w-full rounded-card object-cover object-center"
          />
          <div className="absolute -bottom-5 -right-2 rounded-card bg-gold px-6 py-5 shadow-soft sm:right-8">
            <p className="font-heading text-2xl font-semibold">
              Rooted in care.
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest">
              Made for real life
            </p>
          </div>
        </div>
        <div className="lg:pl-10">
          <p className="eyebrow">Our story</p>
          <Heading
            level={2}
            className="mt-4 text-4xl leading-tight sm:text-5xl"
          >
            Wellness should feel personal, not complicated.
          </Heading>
          <p className="mt-6 text-lg leading-8 text-walnut/70">
            Zoenaturals began with a simple belief: nature already gives us
            powerful ways to care for ourselves. We pair trusted botanicals with
            thoughtful formulation to create daily supplements that fit real
            routines.
          </p>
          <p className="mt-4 leading-7 text-walnut/70">
            Every ingredient has a purpose. Every blend is made with clarity. No
            noise, no impossible promises—just considered support for feeling
            well.
          </p>
          <NavLink
            href="/about"
            className="mt-7 inline-flex items-center gap-2 font-bold text-deep-fern"
          >
            Read our story <Icon name="arrowRight" size="sm" />
          </NavLink>
        </div>
      </section>

      <section className="px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-card bg-deep-fern px-6 py-12 text-cream sm:px-12 lg:px-20 lg:py-16">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-cream/15" />
          <div className="absolute -bottom-28 right-28 size-64 rounded-full border border-cream/10" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold">
                Subscribe & save
              </p>
              <Heading
                level={2}
                className="mt-3 max-w-2xl text-4xl text-white sm:text-5xl"
              >
                Your wellness ritual, right on time.
              </Heading>
              <p className="mt-4 max-w-xl leading-7 text-cream/70">
                Save 15% on every delivery, pause whenever you need, and never
                run out of your daily essentials.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/shop")}
            >
              Explore subscriptions <Icon name="arrowRight" size="sm" />
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-sage/15 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <p className="eyebrow">Real rituals, real people</p>
            <Heading level={2} className="mt-3 text-4xl sm:text-5xl">
              Notes from our community
            </Heading>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.name}
                className="rounded-card bg-cream p-7 shadow-soft"
              >
                <div
                  className="flex gap-1 text-gold"
                  aria-label="5 out of 5 stars"
                >
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Icon key={star} name="star" size="sm" />
                  ))}
                </div>
                <p className="mt-6 font-heading text-xl leading-8">
                  “{review.quote}”
                </p>
                <div className="mt-7 border-t border-walnut/10 pt-5">
                  <p className="text-sm font-bold">{review.name}</p>
                  <p className="mt-1 text-xs text-walnut/55">
                    Verified buyer · {review.product}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/30 text-deep-fern">
            <Icon name="mail" />
          </span>
          <Heading level={2} className="mt-5 text-4xl sm:text-5xl">
            A little wellness in your inbox.
          </Heading>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-walnut/65">
            Thoughtful tips, ingredient stories, and first access to new
            botanical blends.
          </p>
          {subscribed ? (
            <p className="mx-auto mt-8 rounded-card bg-sage/25 px-5 py-4 font-semibold text-deep-fern">
              You’re on the list. Welcome to the Zoenaturals community.
            </p>
          ) : (
            <form
              onSubmit={joinNewsletter}
              className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            >
              <TextField
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="min-w-0 flex-1"
              />
              <Button type="submit">Join the community</Button>
            </form>
          )}
          <p className="mt-3 text-xs text-walnut/45">
            No clutter. Unsubscribe whenever you like.
          </p>
        </div>
      </section>
    </main>
  )
}

function Footer() {
  const groups: { title: string; links: [string, string][] }[] = [
    {
      title: "Shop",
      links: [["/shop", "All products"], ["/shop?goal=Sleep", "Bestsellers"], ["/shop?goal=Energy", "Shop by goal"]],
    },
    {
      title: "About",
      links: [["/about", "Our story"], ["/ingredients", "Our ingredients"], ["/journal", "Journal"]],
    },
    {
      title: "Support",
      links: [["/faq", "FAQs"], ["/contact", "Contact us"], ["/account", "Your account"], ["/track", "Track order"]],
    },
    {
      title: "Policies",
      links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/returns", "Returns"]],
    },
  ]
  return (
    <footer className="bg-deep-fern pb-28 pt-16 text-cream lg:pb-10 lg:pt-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1.4fr_2fr] lg:px-8">
        <div>
          <NavLink
            href="/"
            variant="footer"
            className="inline-block font-heading text-3xl text-cream"
            aria-label="ZeoNaturals home"
          >
            ZeoNaturals
          </NavLink>
          <p className="mt-4 max-w-sm leading-7 text-cream/70">
            Plant-based wellness for feeling grounded, nourished, and wholly
            yourself.
          </p>
          <div className="mt-7 h-px w-12 bg-gold" />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {groups.map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-bold uppercase tracking-widest text-gold">
                {title}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {links.map(([href, label]) => (
                  <NavLink key={label} href={href} variant="footer">
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-3 border-t border-cream/15 px-5 pt-7 text-xs text-cream/55 sm:flex-row sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} Zoenaturals. All rights reserved.</p>
        <p>Thoughtfully made in Nigeria.</p>
      </div>
    </footer>
  )
}

function MobileNav({ focusSearch }: { focusSearch: () => void }) {
  const { itemCount } = useCart()
  const items = [
    { label: "Home", icon: "home", href: "/" },
    { label: "Shop", icon: "grid", href: "/shop" },
    { label: "Search", icon: "search", action: focusSearch },
    { label: "Cart", icon: "bag", href: "/cart", count: itemCount },
    { label: "Account", icon: "user", href: "/account" },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-walnut/10 bg-cream/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md lg:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) =>
        item.action ? (
          <Button key={item.label} variant="mobileNav" onClick={item.action}>
            <Icon name={item.icon} size="sm" />
            <span>{item.label}</span>
          </Button>
        ) : (
          <NavLink
            key={item.label}
            href={item.href}
            variant="mobileNav"
            className="relative"
          >
            <Icon name={item.icon} size="sm" />
            <span>{item.label}</span>
            {!!item.count && (
              <span className="absolute right-3 top-2 grid size-4 place-items-center rounded-full bg-terracotta text-[9px] font-bold text-white">
                {item.count}
              </span>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function ToastNotice() {
  const [message, setMessage] = useState("")
  useEffect(() => {
    let timeout: number | undefined
    const show = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (typeof detail !== "string") return
      setMessage(detail)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setMessage(""), 3000)
    }
    window.addEventListener("zoenaturals-toast", show)
    return () => {
      window.removeEventListener("zoenaturals-toast", show)
      window.clearTimeout(timeout)
    }
  }, [])
  return message ? <div role="status" className="fixed bottom-40 left-1/2 z-[70] -translate-x-1/2 rounded-card bg-deep-fern px-5 py-3 text-sm font-semibold text-white shadow-soft lg:bottom-20">{message}</div> : null
}

export function RootLayout() {
  const searchRef = useRef<HTMLInputElement>(null)
  const [cookieVisible, setCookieVisible] = useState(false)
  useEffect(() => {
    try {
      setCookieVisible(window.localStorage.getItem("zoenaturals-cookie-notice") !== "accepted")
    } catch (error) {
      console.error("Unable to read cookie preference:", error)
      setCookieVisible(true)
    }
  }, [])
  return (
    <div className="min-h-screen bg-cream text-walnut">
      <SeoMetadata title="Zoenaturals | Plant-powered wellness" description="Thoughtful plant-based formulas for better rest, brighter energy, and everyday balance." />
      <Header searchRef={searchRef} />
      <Outlet />
      <Footer />
      <ToastNotice />
      {cookieVisible && (
        <aside className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-3xl flex-col gap-4 rounded-card border border-walnut/15 bg-cream p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-walnut/75">We use essential cookies to keep your shopping experience working.</p>
          <Button onClick={() => {
            try {
              window.localStorage.setItem("zoenaturals-cookie-notice", "accepted")
              setCookieVisible(false)
            } catch (error) {
              console.error("Unable to save cookie preference:", error)
              setCookieVisible(false)
            }
          }}>Accept</Button>
        </aside>
      )}
      <a href="https://wa.me/2348000000000" target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp" className="fixed bottom-24 right-4 z-40 rounded-full bg-deep-fern px-4 py-3 text-sm font-bold text-white shadow-soft lg:bottom-6">WhatsApp</a>
      <MobileNav
        focusSearch={() => {
          searchRef.current?.focus()
          searchRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }}
      />
    </div>
  )
}

function SeoMetadata({ title, description }: { title: string; description: string }) {
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
  return null
}
