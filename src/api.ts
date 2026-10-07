import { API_BASE_URL, IS_DEMO_API, PAYSTACK_ENABLED } from "./config"
import { isSupabaseConfigured } from "./supabase"

type ProductFaq = {
  question: string
  answer: string
}

export type Product = {
  id: string
  slug: string
  name: string
  price: number
  salesCount?: number
  salePrice?: number
  variants?: ProductVariant[]
  images?: string[]
  category: string
  goal: string
  image?: string
  stock: number
  description: string
  ingredients: string
  howToUse: string
  facts: Record<string, string>
  faq: ProductFaq[]
  published?: boolean
}

export type ProductVariant = {
  id: string
  name: string
  price: number
  salesCount?: number
  stock: number
  salePrice?: number
}

export type ProductInput = {
  id?: string
  slug?: string
  name: string
  price: number
  salesCount?: number
  salePrice?: number
  variants?: ProductVariant[]
  images?: string[]
  category: string
  goal: string
  image?: string
  stock: number
  description: string
  ingredients: string
  howToUse: string
  facts?: Record<string, string>
  faq?: ProductFaq[]
  published?: boolean
}

const ADMIN_PRODUCTS_KEY = "zoenaturals-admin-products"

function getStoredAdminProducts(): Product[] {
  if (typeof window === "undefined") return []

  try {
    const value = window.localStorage.getItem(ADMIN_PRODUCTS_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStoredAdminProducts(products: Product[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products))
}

export function getAdminProducts(): Product[] {
  return getStoredAdminProducts()
}

function productFromInput(input: ProductInput): Product {
  const generatedSlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const resolvedSlug = (input.slug && input.slug.trim()) || generatedSlug || `product-${Date.now()}`

  const nextProduct: Product = {
    id: input.id ?? resolvedSlug ?? `product-${Date.now()}`,
    slug: resolvedSlug,
    name: input.name,
    price: Number(input.price) || 0,
    salesCount: input.salesCount ?? 0,
    salePrice: input.salePrice ? Number(input.salePrice) : undefined,
    variants: input.variants ?? [],
    images: input.images ?? (input.image ? [input.image] : []),
    category: input.category || "Supplements",
    goal: input.goal || "Everyday wellness",
    image: input.image || undefined,
    stock: Math.max(0, Number(input.stock) || 0),
    description: input.description || "A thoughtful botanical formula for your daily ritual.",
    ingredients: input.ingredients || "See product packaging for the complete ingredient list.",
    howToUse: input.howToUse || "Use as directed on the product packaging.",
    facts: input.facts || {},
    faq: input.faq || [],
    published: input.published ?? true,
  }
  return nextProduct
}

export function saveProductRecords(inputs: ProductInput[]): Product[] {
  const existing = new Map(getStoredAdminProducts().map((product) => [product.id, product]))
  const nextProducts = inputs.map(productFromInput)
  nextProducts.forEach((product) => existing.set(product.id, product))
  setStoredAdminProducts([...existing.values()])
  return nextProducts
}

export function saveProductRecord(input: ProductInput): Product {
  return saveProductRecords([input])[0]
}

export function removeProductRecord(id: string) {
  const existing = getStoredAdminProducts().filter((item) => item.id !== id)
  setStoredAdminProducts(existing)
}

const demoProducts: Product[] = [
  {
    id: "sleep-night-blend",
    slug: "sleep-night-blend",
    name: "Calm Night Blend",
    price: 24500,
    category: "Herbal Teas",
    goal: "Sleep",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    stock: 18,
    description:
      "A settling evening ritual with calming botanicals to help you unwind and recover deeply.",
    ingredients:
      "Chamomile, lemon balm, lavender, passionflower, magnesium glycinate.",
    howToUse:
      "Steep one sachet in hot water for 8–10 minutes before bed and sip slowly.",
    facts: {
      "Format": "30 sachets",
      "Main benefit": "Sleep support",
      "Flavor": "Citrus lavender",
      "Best for": "Evening wind-down",
    },
    faq: [
      {
        question: "Can I take this every night?",
        answer: "Yes. It is formulated for nightly use as part of a calming routine.",
      },
      {
        question: "Does it contain caffeine?",
        answer: "No. This blend is naturally caffeine-free.",
      },
    ],
  },
  {
    id: "daily-moringa",
    slug: "daily-moringa",
    name: "Daily Moringa",
    price: 21500,
    category: "Supplements",
    goal: "Energy",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80",
    stock: 24,
    description:
      "A clean daily energy support made with moringa and adaptogens to help you move brighter.",
    ingredients:
      "Moringa leaf, green tea extract, ashwagandha, spirulina.",
    howToUse:
      "Take two capsules in the morning with water or a smoothie.",
    facts: {
      "Format": "60 capsules",
      "Main benefit": "Daily vitality",
      "Flavor": "Neutral",
      "Best for": "Busy mornings",
    },
    faq: [
      {
        question: "Is this suitable for beginners?",
        answer: "Yes. It is designed for everyday use and easy to fit into a daily routine.",
      },
    ],
  },
  {
    id: "immune-boost",
    slug: "immune-boost",
    name: "Pure Immunity Elixir",
    price: 26000,
    category: "Supplements",
    goal: "Immunity",
    image:
      "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
    stock: 20,
    description:
      "A supportive immune blend with vitamin-rich botanicals and daily antioxidant protection.",
    ingredients:
      "Elderberry, ginger, zinc, vitamin C, echinacea, lemon peel.",
    howToUse:
      "Take one teaspoon twice daily, or mix into warm water, tea, or juice.",
    facts: {
      "Format": "120 ml",
      "Main benefit": "Immune resilience",
      "Flavor": "Citrus ginger",
      "Best for": "Seasonal support",
    },
    faq: [
      {
        question: "Can I take this alongside other vitamins?",
        answer: "Yes, but consult your healthcare practitioner for combination guidance.",
      },
    ],
  },
  {
    id: "gut-ease-tea",
    slug: "gut-ease-tea",
    name: "Gut Ease Tea",
    price: 19000,
    category: "Herbal Teas",
    goal: "Digestion",
    image:
      "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=80",
    stock: 26,
    description:
      "Comforting digestive support with a gentle blend of gut-soothing herbs and bitters.",
    ingredients:
      "Ginger root, fennel, peppermint, chamomile, dandelion root.",
    howToUse:
      "Steep in hot water for 8 minutes after meals or when feeling unsettled.",
    facts: {
      "Format": "20 sachets",
      "Main benefit": "Digestive ease",
      "Flavor": "Fresh mint",
      "Best for": "After-meal comfort",
    },
    faq: [
      {
        question: "How often can I drink it?",
        answer: "Up to two cups a day is a common use, depending on your routine.",
      },
    ],
  },
  {
    id: "radiant-roots",
    slug: "radiant-roots",
    name: "Radiant Roots",
    price: 23500,
    category: "Body Care",
    goal: "Skin & Hair",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    stock: 17,
    description:
      "A beauty and glow blend crafted to support healthy hair, skin, and everyday radiance.",
    ingredients:
      "Biotin, pumpkin seed, collagen peptides, hibiscus, rosemary.",
    howToUse:
      "Take one capsule daily with breakfast and stay consistent for best results.",
    facts: {
      "Format": "60 capsules",
      "Main benefit": "Glow support",
      "Flavor": "None",
      "Best for": "Hair and skin vitality",
    },
    faq: [
      {
        question: "When should I expect results?",
        answer: "Most customers notice a difference after 4–8 weeks of consistent use.",
      },
    ],
  },
  {
    id: "daily-greens",
    slug: "daily-greens",
    name: "Daily Greens",
    price: 22000,
    category: "Superfoods",
    goal: "Energy",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    stock: 28,
    description:
      "A nutrient-dense green blend for more sustained energy and gentle daily nourishment.",
    ingredients:
      "Spinach, kale, wheatgrass, barley grass, chia, flaxseed.",
    howToUse:
      "Mix one scoop into water or a smoothie once daily.",
    facts: {
      "Format": "250 g",
      "Main benefit": "Nutrient support",
      "Flavor": "Light green apple",
      "Best for": "Balanced energy",
    },
    faq: [
      {
        question: "Is it suitable for sensitive stomachs?",
        answer: "Yes. It is designed to be gentle and easy to mix into daily drinks.",
      },
    ],
  },
  {
    id: "golden-turmeric",
    slug: "golden-turmeric",
    name: "Golden Turmeric+",
    price: 23000,
    category: "Supplements",
    goal: "Immunity",
    image:
      "https://images.unsplash.com/photo-1571786256017-aee7a0c4d4a8?auto=format&fit=crop&w=900&q=80",
    stock: 19,
    description:
      "A warm, anti-inflammatory formula with turmeric and ginger for everyday immune balance.",
    ingredients:
      "Turmeric root, black pepper, ginger, vitamin D3, zinc.",
    howToUse:
      "Take one capsule twice daily with meals and plenty of water.",
    facts: {
      "Format": "60 capsules",
      "Main benefit": "Inflammation support",
      "Flavor": "Warm spice",
      "Best for": "Daily resilience",
    },
    faq: [
      {
        question: "Can I take this with other supplements?",
        answer: "Yes. It pairs well with daily wellness routines, but check labels carefully.",
      },
    ],
  },
  {
    id: "lavender-sleep-drops",
    slug: "lavender-sleep-drops",
    name: "Lavender Sleep Drops",
    price: 20000,
    category: "Body Care",
    goal: "Sleep",
    image:
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80",
    stock: 22,
    description:
      "A soothing nighttime tincture that helps quiet the body and make room for rest.",
    ingredients:
      "Lavender, valerian root, passionflower, lemon balm, coconut MCT oil.",
    howToUse:
      "Take 1mL before bed or add to water for a calming evening ritual.",
    facts: {
      "Format": "30 ml",
      "Main benefit": "Nighttime calm",
      "Flavor": "Lavender citrus",
      "Best for": "Stress relief",
    },
    faq: [
      {
        question: "Is it safe for daily use?",
        answer: "Yes, when used as directed. It is designed to support regular nighttime routines.",
      },
    ],
  },
  {
    id: "bloom-gut-balance",
    slug: "bloom-gut-balance",
    name: "Bloom Gut Balance",
    price: 21000,
    category: "Superfoods",
    goal: "Digestion",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
    stock: 25,
    description:
      "A gut-friendly formula designed to support smoother digestion and more comfortable days.",
    ingredients:
      "Probiotics, inulin, ginger, fennel, licorice root.",
    howToUse:
      "Take one serving in the morning or before meals to support digestion.",
    facts: {
      "Format": "30 servings",
      "Main benefit": "Balanced gut health",
      "Flavor": "Mild ginger",
      "Best for": "Daily digestive rhythm",
    },
    faq: [
      {
        question: "Should I take it with food?",
        answer: "Yes, taking it with a meal can make it easier on the stomach.",
      },
    ],
  },
  {
    id: "glow-balance",
    slug: "glow-balance",
    name: "Glow & Balance",
    price: 27000,
    category: "Supplements",
    goal: "Skin & Hair",
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    stock: 16,
    description:
      "A beauty-support blend for radiant skin, stronger hair, and everyday confidence.",
    ingredients:
      "Collagen peptides, acerola, biotin, silica, vitamin E.",
    howToUse:
      "Take two capsules daily, ideally with your breakfast or lunch.",
    facts: {
      "Format": "60 capsules",
      "Main benefit": "Skin and hair vitality",
      "Flavor": "Natural",
      "Best for": "Glow rituals",
    },
    faq: [
      {
        question: "Does it contain any fillers?",
        answer: "No. It is formulated without unnecessary fillers.",
      },
    ],
  },
]

export function getBuiltInProductSlugs(): string[] {
  return demoProducts.map((product) => product.slug.toLowerCase())
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getDemoProductsForRequest(path: string): Product[] | Product | null {
  const url = new URL(path, "http://localhost")
  const adminProducts = getStoredAdminProducts()
  const mergedProducts = [...adminProducts, ...demoProducts]

  if (url.pathname === "/api/products") {
    const goal = url.searchParams.get("goal")
    const category = url.searchParams.get("category")
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? ""
    const sort = url.searchParams.get("sort") ?? "newest"
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 12))

    let filtered = mergedProducts
    if (goal) filtered = filtered.filter((product) => product.goal === goal)
    if (category) filtered = filtered.filter((product) => product.category === category)
    if (q) filtered = filtered.filter((product) => product.name.toLowerCase().includes(q))

    if (sort === "price_asc") filtered = [...filtered].sort((a, b) => a.price - b.price)
    else if (sort === "price_desc") filtered = [...filtered].sort((a, b) => b.price - a.price)
    else if (sort === "bestselling") filtered = [...filtered].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))

    return filtered.slice((page - 1) * limit, page * limit)
  }

  if (url.pathname.startsWith("/api/products/")) {
    const slug = decodeURIComponent(url.pathname.replace("/api/products/", ""))
    return mergedProducts.find((product) => product.slug === slug) ?? null
  }

  return null
}

function demoCheckoutResponse(
  body: any,
  catalog: Product[] = demoProducts,
): { paymentUrl?: string; status?: string; reference?: string; amount?: number } {
  const customer = body?.customer ?? {}
  const items = Array.isArray(body?.items) ? body.items : []
  const paymentMethod = body?.paymentMethod ?? "paystack"

  const total = items.reduce((sum: number, item: any) => {
    const match = catalog.find((product) => product.id === item.productId)
    const unitPrice = match ? match.price : 0
    return sum + unitPrice * (Number(item.qty) || 1)
  }, 0)

  const reference = `ZOE-${Math.floor(Date.now() / 1000) % 900000 + 100000}`

  if (paymentMethod === "paystack") {
    return {
      paymentUrl: `/thank-you.html?reference=${encodeURIComponent(reference)}&customer=${encodeURIComponent(customer.name ?? "")}`,
      reference,
      amount: total,
    }
  }

  return {
    status: "pod_pending",
    reference,
    amount: total,
  }
}

async function mockApiRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = new URL(path, "http://localhost")

  if (url.pathname === "/api/categories") {
    let catalog = demoProducts
    if (isSupabaseConfigured) {
      const { listStorefrontProducts } = await import("./supabase")
      const remoteProducts = await listStorefrontProducts()
      catalog = PAYSTACK_ENABLED
        ? remoteProducts.filter((product) => product.published)
        : [...remoteProducts, ...demoProducts]
    }
    return {
      goals: [...new Set(catalog.map((product) => product.goal))],
      categories: [...new Set(catalog.map((product) => product.category))],
    } as T
  }

  if (isProductRequest(url.pathname) && isSupabaseConfigured) {
    const { listStorefrontProducts } = await import("./supabase")
    const remoteProducts = await listStorefrontProducts()
    const remoteSlugs = new Set(remoteProducts.map((product) => product.slug))
    const products = PAYSTACK_ENABLED
      ? remoteProducts.filter((product) => product.published)
      : [
          ...remoteProducts,
          ...demoProducts.filter((product) => !remoteSlugs.has(product.slug)),
        ]

    if (url.pathname === "/api/products") {
      const goal = url.searchParams.get("goal")
      const category = url.searchParams.get("category")
      const query = url.searchParams.get("q")?.trim().toLowerCase() ?? ""
      const sort = url.searchParams.get("sort") ?? "newest"
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 12))
      let filtered = products
      if (goal) filtered = filtered.filter((product) => product.goal === goal)
      if (category) filtered = filtered.filter((product) => product.category === category)
      if (query) filtered = filtered.filter((product) => product.name.toLowerCase().includes(query))
      if (sort === "price_asc") filtered = [...filtered].sort((a, b) => a.price - b.price)
      else if (sort === "price_desc") filtered = [...filtered].sort((a, b) => b.price - a.price)
      else if (sort === "bestselling") filtered = [...filtered].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
      return filtered.slice((page - 1) * limit, page * limit) as T
    }

    const slug = decodeURIComponent(url.pathname.replace("/api/products/", ""))
    return (products.find((product) => product.slug === slug) ?? null) as T | null
  }

  if (url.pathname === "/api/products") {
    if (PAYSTACK_ENABLED) return [] as T
    return getDemoProductsForRequest(path) as T
  }

  if (url.pathname.startsWith("/api/products/")) {
    if (PAYSTACK_ENABLED) return null
    const product = getDemoProductsForRequest(path)
    if (!product) return null
    return { product } as T
  }

  if (url.pathname === "/api/checkout") {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (isSupabaseConfigured) {
      const { listStorefrontProducts } = await import("./supabase")
      const storefrontProducts = await listStorefrontProducts()
      return demoCheckoutResponse(body, [...storefrontProducts, ...demoProducts]) as T
    }
    return demoCheckoutResponse(body) as T
  }

  if (url.pathname.startsWith("/api/orders/verify/")) {
    return { status: "paid" } as T
  }

  return null
}

function isProductRequest(pathname: string) {
  return pathname === "/api/products" || pathname.startsWith("/api/products/")
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const pathname = new URL(path, "http://localhost").pathname
  const useSupabaseCatalog = isSupabaseConfigured && isProductRequest(pathname)
  const usePaystackApi =
    PAYSTACK_ENABLED &&
    (pathname === "/api/checkout" ||
      pathname.startsWith("/api/orders/verify/") ||
      pathname === "/api/orders/track")

  if ((IS_DEMO_API && !usePaystackApi) || useSupabaseCatalog) {
    const mocked = await mockApiRequest<T>(path, init)
    if (mocked !== null) return mocked
    if (useSupabaseCatalog) throw new ApiError(`Product not found: ${path}`, 404)
    throw new ApiError(`The demo API does not implement ${path}.`, 404)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })

    if (!response.ok) {
      let message = "Something went wrong. Please try again."
      try {
        const body = await response.json()
        message = body.message ?? body.error ?? message
      } catch {
        // Keep the safe fallback for non-JSON API errors.
      }
      if (response.status === 429) {
        message = "Too many requests, please try again shortly."
      }
      throw new ApiError(message, response.status)
    }

    return response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new Error(
      "Unable to connect to the Zoenaturals API. Please try again in a moment.",
    )
  }
}

export function normalizeProduct(raw: any, index = 0): Product {
  const facts = raw.productFacts ?? raw.product_facts ?? raw.facts ?? {}
  const faqSource = raw.faqs ?? raw.faq ?? []

  return {
    id: String(raw.id ?? raw.productId ?? raw.slug ?? index),
    slug: String(raw.slug ?? raw.id ?? index),
    name: String(raw.name ?? raw.title ?? "Botanical wellness blend"),
    price: Number(String(raw.price ?? 0).replace(/,/g, "")),
    salesCount: Math.max(0, Number(raw.sales_count ?? raw.salesCount ?? 0)),
    salePrice: raw.sale_price == null && raw.salePrice == null
      ? undefined
      : Number(raw.sale_price ?? raw.salePrice),
    variants: Array.isArray(raw.variants)
      ? raw.variants.map((variant: any, variantIndex: number) => ({
          id: String(variant.id ?? variant.variantId ?? variantIndex),
          name: String(variant.name ?? variant.label ?? "Standard"),
          price: Number(variant.price ?? raw.price ?? 0),
          stock: Math.max(0, Number(variant.stock ?? raw.stock ?? 0)),
          salePrice: variant.salePrice == null && variant.sale_price == null
            ? undefined
            : Number(variant.salePrice ?? variant.sale_price),
        }))
      : [],
    images: Array.isArray(raw.images)
      ? raw.images.filter((image: unknown): image is string => typeof image === "string")
      : raw.image_url || raw.imageUrl || raw.image
        ? [String(raw.image_url ?? raw.imageUrl ?? raw.image)]
        : [],
    category: String(raw.category?.name ?? raw.category ?? "Supplements"),
    goal: String(raw.goal?.name ?? raw.goal ?? "Everyday wellness"),
    image: raw.image_url ?? raw.imageUrl ?? raw.image ?? raw.images?.[0] ?? undefined,
    stock: Math.max(0, Number(raw.available ?? raw.stock ?? raw.quantity ?? 0)),
    description: String(
      raw.description ??
        "A thoughtful botanical formula for your daily ritual.",
    ),
    ingredients: String(
      raw.ingredients ??
        "See product packaging for the complete ingredient list.",
    ),
    howToUse: String(
      raw.how_to_use ??
        raw.howToUse ??
        "Use as directed on the product packaging.",
    ),
    facts:
      facts && typeof facts === "object" && !Array.isArray(facts)
        ? Object.fromEntries(
            Object.entries(facts).map(([key, value]) => [key, String(value)]),
          )
        : {},
    faq: Array.isArray(faqSource)
      ? faqSource.map((item) => ({
          question: String(item.question ?? item.q ?? ""),
          answer: String(item.answer ?? item.a ?? ""),
        }))
      : [],
  }
}

export function extractProducts(payload: any): Product[] {
  const products = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.products)
      ? payload.products
      : Array.isArray(payload?.data?.products)
        ? payload.data.products
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  return products.map(normalizeProduct)
}
