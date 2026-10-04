import Papa from "papaparse"
import type { ProductInput } from "./api"

export type ProductCsvPreview = {
  products: ProductInput[]
  errors: string[]
  rowCount: number
}

type ProductCsvRow = Record<string, string | undefined>

const requiredHeaders = [
  "name",
  "price",
  "stock",
  "description",
  "ingredients",
  "how_to_use",
]

function normalizeHeader(header: string) {
  const normalized = header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (normalized === "image_url") return "image"
  if (normalized === "howtouse") return "how_to_use"
  if (normalized === "facts") return "facts_json"
  if (normalized === "faq") return "faq_json"
  return normalized
}

function parseJsonCell<T>(value: string, fallback: T, field: string, errors: string[]): T {
  if (!value.trim()) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    errors.push(`${field} must contain valid JSON.`)
    return fallback
  }
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function readProductRows(
  rows: ProductCsvRow[],
  headers: string[],
  existingSlugs: ReadonlySet<string>,
): ProductCsvPreview {
  const errors: string[] = []
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))
  if (missingHeaders.length) {
    return {
      products: [],
      errors: [`Missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}.`],
      rowCount: rows.length,
    }
  }

  const products: ProductInput[] = []
  const seenSlugs = new Set<string>()
  const populatedRows = rows.filter((row) => Object.values(row).some((value) => value?.trim()))

  populatedRows.forEach((row, index) => {
    const rowNumber = index + 2
    const value = (key: string) => String(row[key] ?? "").trim()
    const name = value("name")
    const description = value("description")
    const ingredients = value("ingredients")
    const howToUse = value("how_to_use")
    const priceValue = value("price").replace(/[\s,₦]/g, "")
    const stockValue = value("stock").replace(/[\s,]/g, "")
    const price = Number(priceValue)
    const stock = Number(stockValue)
    const slug = slugify(value("slug") || name)
    const rowErrors: string[] = []

    if (!name) rowErrors.push("name is required")
    if (!description) rowErrors.push("description is required")
    if (!ingredients) rowErrors.push("ingredients is required")
    if (!howToUse) rowErrors.push("how_to_use is required")
    if (!priceValue || !Number.isFinite(price) || price < 0) rowErrors.push("price must be a non-negative number")
    if (!stockValue || !Number.isInteger(stock) || stock < 0) rowErrors.push("stock must be a non-negative whole number")
    if (!slug) rowErrors.push("a valid slug or product name is required")
    if (slug && (seenSlugs.has(slug) || existingSlugs.has(slug))) rowErrors.push(`slug "${slug}" already exists`)

    const publishedValue = value("published").toLowerCase()
    let published = true
    if (["false", "0", "draft", "no"].includes(publishedValue)) published = false
    else if (publishedValue && !["true", "1", "published", "yes"].includes(publishedValue)) {
      rowErrors.push("published must be true/false or published/draft")
    }

    const rowFacts = parseJsonCell<Record<string, unknown>>(
      value("facts_json"),
      {},
      "facts_json",
      rowErrors,
    )
    const rowFaq = parseJsonCell<unknown>(value("faq_json"), [], "faq_json", rowErrors)
    const facts: Record<string, string> = {}
    if (!rowFacts || typeof rowFacts !== "object" || Array.isArray(rowFacts)) {
      rowErrors.push(`Row ${rowNumber}: facts_json must be a JSON object.`)
    } else {
      Object.entries(rowFacts).forEach(([key, fact]) => {
        facts[key] = String(fact)
      })
    }

    let faq: ProductInput["faq"] = []
    if (!Array.isArray(rowFaq)) {
      rowErrors.push(`Row ${rowNumber}: faq_json must be a JSON array.`)
    } else {
      faq = rowFaq.flatMap((item) => {
        if (!item || typeof item !== "object") return []
        const entry = item as Record<string, unknown>
        const question = String(entry.question ?? "").trim()
        const answer = String(entry.answer ?? "").trim()
        return question && answer ? [{ question, answer }] : []
      })
      if (faq.length !== rowFaq.length) rowErrors.push(`Row ${rowNumber}: each faq_json item needs question and answer.`)
    }

    if (rowErrors.length) {
      errors.push(...rowErrors.map((message) => `Row ${rowNumber}: ${message}`))
      return
    }

    seenSlugs.add(slug)
    products.push({
      slug,
      name,
      price,
      category: value("category") || "Supplements",
      goal: value("goal") || "Everyday wellness",
      image: value("image") || undefined,
      stock,
      description,
      ingredients,
      howToUse,
      facts,
      faq,
      published,
    })
  })

  if (!populatedRows.length) errors.push("The CSV has no product rows.")
  return { products, errors, rowCount: populatedRows.length }
}

export function parseProductCsv(file: File, existingSlugs: ReadonlySet<string>): Promise<ProductCsvPreview> {
  return new Promise((resolve) => {
    Papa.parse<ProductCsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: (result) => {
        const parserErrors = result.errors.map((error) => {
          const row = typeof error.row === "number" ? `Row ${error.row + 2}: ` : ""
          return `${row}${error.message}`
        })
        const preview = readProductRows(result.data, result.meta.fields ?? [], existingSlugs)
        resolve({
          ...preview,
          errors: [...parserErrors, ...preview.errors],
        })
      },
      error: (error) => resolve({ products: [], errors: [error.message], rowCount: 0 }),
    })
  })
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

const templateHeaders = [
  "name",
  "slug",
  "price",
  "category",
  "goal",
  "image",
  "stock",
  "description",
  "ingredients",
  "how_to_use",
  "published",
  "facts_json",
  "faq_json",
]

const templateSample = [
  "Sample Moringa",
  "sample-moringa",
  "18500",
  "Supplements",
  "Energy",
  "",
  "25",
  "A botanical blend for everyday energy.",
  "Moringa leaf, ginger",
  "Mix one serving into water once daily.",
  "true",
  JSON.stringify({ Format: "60 capsules", "Best for": "Daily use" }),
  JSON.stringify([{ question: "How do I use it?", answer: "Use as directed on the label." }]),
]

export const PRODUCT_CSV_TEMPLATE = [templateHeaders, templateSample]
  .map((row) => row.map(csvCell).join(","))
  .join("\r\n")
  .concat("\r\n")
