import { randomUUID } from "node:crypto"
import {
  requirePaymentConfig,
  sendJson,
  supabaseRequest,
  updateOrder,
} from "./_lib/paystack.js"

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const NIGERIAN_PHONE_PATTERN = /^(?:\+?234|0)[789][01]\d{8}$/

function validCustomer(customer) {
  return (
    typeof customer?.name === "string" &&
    customer.name.trim().length >= 2 &&
    typeof customer?.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()) &&
    typeof customer?.phone === "string" &&
    NIGERIAN_PHONE_PATTERN.test(customer.phone.replace(/[\s()-]/g, "")) &&
    typeof customer?.address === "string" &&
    customer.address.trim().length >= 5 &&
    typeof customer?.state === "string" &&
    customer.state.trim().length > 0
  )
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) return null
  const quantities = new Map()
  for (const item of items) {
    if (
      typeof item?.productId !== "string" ||
      !UUID_PATTERN.test(item.productId) ||
      (item.variantId !== undefined &&
        (typeof item.variantId !== "string" || item.variantId.length > 100)) ||
      !Number.isSafeInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > 20
    ) {
      return null
    }
    const key = `${item.productId}\u0000${item.variantId ?? ""}`
    quantities.set(key, {
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      qty: (quantities.get(key)?.qty ?? 0) + item.qty,
    })
  }
  if ([...quantities.values()].some((item) => item.qty > 20)) return null
  return [...quantities.values()]
    .sort((left, right) =>
      `${left.productId}:${left.variantId ?? ""}`.localeCompare(
        `${right.productId}:${right.variantId ?? ""}`,
      ),
    )
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    return sendJson(response, 405, { message: "Method not allowed." })
  }

  try {
    const config = requirePaymentConfig()
    const { customer, paymentMethod = "paystack", website, termsAccepted } = request.body ?? {}
    const items = normalizeItems(request.body?.items)
    if (website) return sendJson(response, 400, { message: "Please check your order details." })
    if (!termsAccepted || !validCustomer(customer) || !items || !["paystack", "pod"].includes(paymentMethod)) {
      return sendJson(response, 400, { message: "Please check your delivery details and order items." })
    }

    const reference = `ZOE-${randomUUID()}`
    const order = await supabaseRequest("rpc/create_zoenaturals_order", {
      method: "POST",
      body: JSON.stringify({
        p_reference: reference,
        p_customer: {
          name: customer.name.trim(),
          email: customer.email.trim().toLowerCase(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          state: customer.state.trim(),
        },
        p_items: items,
        p_payment_method: paymentMethod,
      }),
    })

    const amount = Number(order?.amount)
    const amountKobo = Number(order?.amount_kobo)
    if (!Number.isSafeInteger(amountKobo) || amountKobo < 1 || amount !== amountKobo / 100) {
      throw new Error("Order creation returned an invalid amount.")
    }

    if (paymentMethod === "pod") {
      return sendJson(response, 200, {
        status: "pod_pending",
        reference,
        amount,
      })
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customer.email.trim().toLowerCase(),
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: `${config.siteUrl}/thank-you.html`,
        metadata: { order_reference: reference },
      }),
    })
    const payment = await paystackResponse.json()
    if (!paystackResponse.ok || !payment.status || !payment.data?.authorization_url) {
      await updateOrder(reference, { status: "failed" })
      return sendJson(response, 502, {
        message: payment.message || "Paystack could not start your payment. Please try again.",
      })
    }

    await updateOrder(reference, { authorization_url: payment.data.authorization_url })
    return sendJson(response, 200, {
      paymentUrl: payment.data.authorization_url,
      reference,
      amount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("INSUFFICIENT_STOCK:")) {
      const [, product, available] = message.match(/INSUFFICIENT_STOCK:([^:]+):(\d+)/) ?? []
      return sendJson(response, 409, {
        message: product
          ? `${product} has only ${available} left.`
          : "One or more items are no longer available in the requested quantity.",
      })
    }
    if (message.includes("PRODUCT_NOT_FOUND")) {
      return sendJson(response, 409, { message: "One or more products are no longer available." })
    }
    console.error("Checkout initialization failed:", error)
    return sendJson(response, 500, { message: "Checkout could not be completed. Please try again." })
  }
}
