import { sendJson, supabaseRequest } from "./_lib/paystack.js"

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return sendJson(response, 405, { message: "Method not allowed." })
  }
  try {
    const products = await supabaseRequest(
      "products?select=goal,category&published=eq.true&order=created_at.desc",
    )
    const goals = [...new Set(products.map((product) => product.goal).filter(Boolean))]
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))]
    return sendJson(response, 200, { goals, categories })
  } catch (error) {
    console.error("Category list failed:", error)
    return sendJson(response, 500, { message: "Product categories could not be loaded." })
  }
}
