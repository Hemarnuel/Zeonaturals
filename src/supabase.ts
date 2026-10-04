import { createClient } from "@supabase/supabase-js"
import type { Product, ProductInput } from "./api"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.")
  return supabase
}

function productFromRow(row: Record<string, any>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    price: Number(row.price ?? 0),
    category: String(row.category ?? "Supplements"),
    goal: String(row.goal ?? "Everyday wellness"),
    image: row.image_url ?? undefined,
    stock: Math.max(0, Number(row.stock ?? 0)),
    description: String(row.description ?? ""),
    ingredients: String(row.ingredients ?? ""),
    howToUse: String(row.how_to_use ?? ""),
    facts: row.facts && typeof row.facts === "object" ? row.facts : {},
    faq: Array.isArray(row.faq) ? row.faq : [],
    published: Boolean(row.published),
  }
}

function productToRow(input: ProductInput) {
  return {
    ...(input.id ? { id: input.id } : {}),
    slug: (input.slug && input.slug.trim()) || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: input.name,
    price: Number(input.price) || 0,
    category: input.category || "Supplements",
    goal: input.goal || "Everyday wellness",
    image_url: input.image || null,
    stock: Math.max(0, Number(input.stock) || 0),
    description: input.description || "",
    ingredients: input.ingredients || "",
    how_to_use: input.howToUse || "",
    facts: input.facts || {},
    faq: input.faq || [],
    published: input.published ?? true,
  }
}

export async function signInAdmin(email: string, password: string) {
  const client = getClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error

  const { data: membership, error: membershipError } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    await client.auth.signOut()
    throw new Error("This account does not have Zoenaturals admin access.")
  }
  return data.user
}

export async function getAdminUser() {
  const client = getClient()
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (!sessionData.session) return null

  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) return null

  const { data: membership, error: membershipError } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership) {
    await client.auth.signOut()
    return null
  }
  return membership ? data.user : null
}

export async function signOutAdmin() {
  const { error } = await getClient().auth.signOut()
  if (error) throw error
}

export async function listAdminProducts(): Promise<Product[]> {
  const { data, error } = await getClient()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(productFromRow)
}

export async function listPublishedProducts(): Promise<Product[]> {
  const { data, error } = await getClient()
    .from("products")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(productFromRow)
}

export async function saveRemoteProducts(inputs: ProductInput[]): Promise<Product[]> {
  if (!inputs.length) return []
  const { data, error } = await getClient()
    .from("products")
    .upsert(inputs.map(productToRow), { onConflict: "id" })
    .select("*")

  if (error) throw error
  return data.map(productFromRow)
}

export async function saveRemoteProduct(input: ProductInput): Promise<Product> {
  const [product] = await saveRemoteProducts([input])
  if (!product) throw new Error("Supabase saved no product record.")
  return product
}

export async function removeRemoteProduct(id: string) {
  const { data, error } = await getClient()
    .from("products")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Product not found or you do not have permission to remove it.")
}
