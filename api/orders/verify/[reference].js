import {
  getOrder,
  markOrderPaid,
  sendJson,
  verifyPaystackTransaction,
} from "../../_lib/paystack.js"

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return sendJson(response, 405, { message: "Method not allowed." })
  }

  const reference = request.query?.reference
  if (typeof reference !== "string" || !/^ZOE-[0-9a-f-]{36}$/i.test(reference)) {
    return sendJson(response, 400, { message: "A valid payment reference is required." })
  }

  try {
    const order = await getOrder(reference)
    if (!order) return sendJson(response, 404, { message: "Order not found." })
    if (order.status === "paid") return sendJson(response, 200, { status: "paid" })
    if (order.payment_method !== "paystack") {
      return sendJson(response, 200, { status: order.status })
    }

    const paid = await verifyPaystackTransaction(reference, order.amount_kobo)
    if (!paid) return sendJson(response, 200, { status: order.status })
    await markOrderPaid(reference)
    return sendJson(response, 200, { status: "paid" })
  } catch (error) {
    console.error("Payment verification failed:", error)
    return sendJson(response, 500, { message: "Payment status could not be verified." })
  }
}
