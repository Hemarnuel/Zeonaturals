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
const goalCards = [
  {
    name: "Sleep",
    description: "Rest deeply",
    icon: "moon",
    tone: "bg-[#EEF6EC] text-walnut border border-[#D9E7D4]",
    badge: "bg-[#D9E7D4] text-deep-fern",
    glow: "bg-[#D5E9C9]",
  },
  {
    name: "Energy",
    description: "Move brightly",
    icon: "sun",
    tone: "bg-[#FFF7E8] text-walnut border border-[#F2E2BC]",
    badge: "bg-[#F9E6B7] text-walnut",
    glow: "bg-[#F6D99A]",
  },
  {
    name: "Immunity",
    description: "Stay supported",
    icon: "shield",
    tone: "bg-[#F4F1EA] text-walnut border border-[#E3DCC8]",
    badge: "bg-[#DDE4C6] text-deep-fern",
    glow: "bg-[#CDD9B5]",
  },
  {
    name: "Digestion",
    description: "Feel balanced",
    icon: "sprout",
    tone: "bg-[#FCEFE9] text-walnut border border-[#F3D3C0]",
    badge: "bg-[#F7D0B8] text-walnut",
    glow: "bg-[#F4B89B]",
  },
  {
    name: "Skin & Hair",
    description: "Glow naturally",
    icon: "sparkle",
    tone: "bg-[#F3EEE9] text-walnut border border-[#E4D5C5]",
    badge: "bg-[#E8D7C5] text-walnut",
    glow: "bg-[#D9BF9F]",
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

type Product = {
  id: string
  name: string
  price: number
  category: string
  image?: string
}

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

  function submit(event: FormEvent) {
    event.preventDefault()
    if (query.trim()) {
      window.location.hash = `search=${encodeURIComponent(query.trim())}`
    }
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`relative ${compact ? "w-full" : "w-full max-w-md"}`}
    >
      <TextField
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
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
    </form>
  )
}

function MegaMenu({ close }: { close: () => void }) {
  return (
    <div className="absolute inset-x-0 top-full border-t border-walnut/10 bg-cream shadow-soft">
      <div className="mx-auto grid max-w-7xl grid-cols-[1.5fr_1fr_1fr] gap-12 px-8 py-9">
        <div>
          <p className="eyebrow">Shop by goal</p>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
            {goals.map((goal) => (
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
            {categories.map((category) => (
              <NavLink
                key={category}
                href={`#${category.toLowerCase().replace(/ /g, "-")}`}
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
            href="#bestsellers"
            className="mt-5 inline-flex font-bold text-deep-fern"
            onClick={close}
          >
            Explore the collection <span aria-hidden="true">→</span>
          </NavLink>
        </div>
      </div>
    </div>
  )
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
          <Button
            variant="icon"
            aria-label="Account"
            className="hidden sm:inline-grid"
          >
            <Icon name="user" />
          </Button>
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

function useHomeProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setLoading(true)
      setError("")
      try {
        const payload = await apiRequest<any>("/api/products", {
          signal: controller.signal,
        })
        const rawProducts: any[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.products)
            ? payload.products
            : Array.isArray(payload.data?.products)
              ? payload.data.products
            : Array.isArray(payload.data)
              ? payload.data
              : []
        setProducts(extractProducts(rawProducts))
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return
        setError(
          "We couldn't load the product collection right now. Please try again in a moment.",
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [requestKey])

  return {
    products,
    loading,
    error,
    retry: () => setRequestKey((key) => key + 1),
  }
}

function ProductCard({ product, index }: ProductCardProps) {
  const { addItem } = useCart()
  const fallbackImage = herbalTeaImages[index % herbalTeaImages.length]
  const [imageSource, setImageSource] = useState(product.image || fallbackImage.src)

  useEffect(() => {
    setImageSource(product.image || fallbackImage.src)
  }, [product.image, fallbackImage.src])

  return (
    <article className="w-[78vw] shrink-0 snap-start sm:w-80">
      <div className="overflow-hidden rounded-card bg-sage/20">
        <img
          src={imageSource}
          alt={product.image && imageSource === product.image ? product.name : fallbackImage.alt}
          onError={() => {
            if (imageSource !== fallbackImage.src) setImageSource(fallbackImage.src)
          }}
          loading="lazy"
          className="h-72 w-full object-cover transition duration-500 hover:scale-105"
        />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-deep-fern/80">
        {product.category}
      </p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <Heading level={3} className="text-2xl">
            {product.name}
          </Heading>
          <p className="mt-1 font-semibold text-walnut/70">
            {formatNaira(product.price)}
          </p>
        </div>
        <Button
          variant="small"
          onClick={() => addItem(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          Add
        </Button>
      </div>
    </article>
  )
}

function HomeProducts() {
  const { products, loading, error, retry } = useHomeProducts()
  const carouselRef = useRef<HTMLDivElement>(null)

  function scroll(direction: number) {
    carouselRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" })
  }

  return (
    <section id="bestsellers" className="bg-white/45 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Recently added & community-loved</p>
            <Heading level={2} className="mt-3 text-4xl sm:text-5xl">
              Explore our collection.
            </Heading>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="icon"
              onClick={() => scroll(-1)}
              aria-label="Previous products"
            >
              <Icon name="arrowLeft" />
            </Button>
            <Button
              variant="icon"
              onClick={() => scroll(1)}
              aria-label="Next products"
            >
              <Icon name="arrowRight" />
            </Button>
          </div>
        </div>

        {loading && (
          <div
            className="mt-10 flex gap-6 overflow-hidden"
            aria-label="Loading products"
          >
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="w-[78vw] shrink-0 sm:w-80">
                <div className="h-64 animate-pulse rounded-card bg-sage/20" />
                <div className="mt-5 h-3 w-24 animate-pulse rounded-full bg-sage/30" />
                <div className="mt-3 h-7 w-48 animate-pulse rounded-full bg-sage/30" />
                <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-sage/20" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 flex flex-col items-center rounded-card border border-terracotta/30 bg-terracotta/10 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-terracotta/15 text-terracotta">
              <Icon name="alert" />
            </span>
            <Heading level={3} className="mt-4 text-2xl">
              Our shelf is taking a pause
            </Heading>
            <p className="mt-2 max-w-md text-sm leading-6 text-walnut/70">
              {error}
            </p>
            <Button variant="secondary" className="mt-5" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="mt-10 rounded-card bg-sage/15 p-8 text-center text-walnut/70">
            No products have been published yet. Please check back soon.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <div
            ref={carouselRef}
            className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
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
        <div className="relative min-h-[25rem] overflow-hidden rounded-card bg-deep-fern sm:min-h-[30rem]">
          <img
            src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1400&q=85"
            alt="Herbal tea steeping in a glass cup beside tea bags"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-walnut/80 via-walnut/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-cream sm:p-9">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              Brew a softer moment
            </p>
            <p className="mt-2 max-w-sm font-heading text-3xl leading-tight sm:text-4xl">
              Let the day steep away.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <p className="eyebrow">Begin with how you want to feel</p>
            <Heading level={2} className="mt-3 text-4xl sm:text-5xl">
              Shop by goal
            </Heading>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {goalCards.map((goal) => (
              <NavLink
                key={goal.name}
                href={`/shop?goal=${encodeURIComponent(goal.name)}`}
                className={`group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[1.25rem] p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg ${goal.tone}`}
              >
                <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-80 blur-2xl transition duration-500 group-hover:scale-110 ${goal.glow}`} />
                <div className="relative z-10 flex items-center justify-between">
                  <span className={`grid size-11 place-items-center rounded-2xl shadow-sm ${goal.badge}`}>
                    <Icon name={goal.icon} />
                  </span>
                  <span className="rounded-full bg-white/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-walnut/70">
                    Goal
                  </span>
                </div>
                <div className="relative z-10 mt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-walnut/60">
                    {goal.description}
                  </p>
                  <p className="mt-2 font-heading text-[2rem] leading-none tracking-tight">
                    {goal.name}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                    Explore <Icon name="arrowRight" size="xs" />
                  </span>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      <HomeProducts />

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
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {[
            [
              "Shop",
              ["/shop", "All products"],
              ["/shop?goal=Sleep", "Bestsellers"],
              ["/shop?goal=Energy", "Shop by goal"],
            ],
            [
              "About",
              ["/about", "Our story"],
              ["/ingredients", "Our ingredients"],
              ["/journal", "Journal"],
            ],
            [
              "Support",
              ["/faq", "FAQs"],
              ["/contact", "Contact us"],
              ["/account", "Your account"],
            ],
          ].map(([title, ...links]) => (
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

export function RootLayout() {
  const searchRef = useRef<HTMLInputElement>(null)
  return (
    <div className="min-h-screen bg-cream text-walnut">
      <Header searchRef={searchRef} />
      <Outlet />
      <Footer />
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
