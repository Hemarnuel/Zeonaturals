import { createHmac, timingSafeEqual } from "node:crypto"
import {
  getOrder,
  markOrderPaid,
  sendJson,
  updateOrder,
  verifyPaystackTransaction,
} from "../_lib/paystack.js"

export const config = { api: { bodyParser: false } }

async function readRawBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1024 * 1024) throw new Error("Webhook body too large.")
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    return sendJson(response, 405, { message: "Method not allowed." })
  }

  try {
    const rawBody = await readRawBody(request)
    const signature = request.headers["x-paystack-signature"]
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret || typeof signature !== "string") {
      return sendJson(response, 401, { message: "Invalid webhook signature." })
    }

    const expected = createHmac("sha512", secret).update(rawBody).digest()
    const received = Buffer.from(signature, "hex")
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return sendJson(response, 401, { message: "Invalid webhook signature." })
    }

    const event = JSON.parse(rawBody.toString("utf8"))
    const reference = event?.data?.reference
    if (typeof reference !== "string") {
      return sendJson(response, 400, { message: "Webhook event has no payment reference." })
    }

    const order = await getOrder(reference)
    if (!order) return sendJson(response, 404, { message: "Order not found." })

    if (event.event === "charge.success") {
      const paid = await verifyPaystackTransaction(reference, order.amount_kobo)
      if (!paid) return sendJson(response, 400, { message: "Payment details did not match the order." })
      if (order.status !== "paid") await markOrderPaid(reference)
    } else if (event.event === "charge.failed" && order.status === "pending") {
      await updateOrder(reference, { status: "failed" })
    }

    return sendJson(response, 200, { received: true })
  } catch (error) {
    console.error("Paystack webhook failed:", error)
    return sendJson(response, 500, { message: "Webhook could not be processed." })
  }
}
