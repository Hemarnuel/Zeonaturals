import { sendJson, supabaseRequest } from "../_lib/paystack.js"

const REFERENCE_PATTERN = /^ZOE-[0-9a-f-]{36}$/i

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return sendJson(response, 405, { message: "Method not allowed." })
  }
  const reference = request.query?.reference
  const email = request.query?.email
  if (
    typeof reference !== "string" ||
    !REFERENCE_PATTERN.test(reference) ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return sendJson(response, 400, { message: "Enter a valid order reference and email." })
  }

  try {
    const params = new URLSearchParams({
      reference: `eq.${reference}`,
      "customer->>email": `eq.${email.trim().toLowerCase()}`,
      select: "reference,status,created_at,paid_at",
    })
    const rows = await supabaseRequest(`orders?${params}`)
    const order = Array.isArray(rows) ? rows[0] : null
    if (!order) return sendJson(response, 404, { message: "No order matched that reference and email." })
    return sendJson(response, 200, {
      reference: order.reference,
      status: order.status,
      timeline: [
        { status: "paid", label: "Paid", complete: ["paid", "packed", "shipped", "delivered"].includes(order.status) },
        { status: "packed", label: "Packed", complete: ["packed", "shipped", "delivered"].includes(order.status) },
        { status: "shipped", label: "Shipped", complete: ["shipped", "delivered"].includes(order.status) },
        { status: "delivered", label: "Delivered", complete: order.status === "delivered" },
      ],
    })
  } catch (error) {
    console.error("Order tracking failed:", error)
    return sendJson(response, 500, { message: "Order status could not be loaded." })
  }
}
