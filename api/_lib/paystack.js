const PAYSTACK_API = "https://api.paystack.co"

export function sendJson(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json")
  response.end(JSON.stringify(body))
}

export function requirePaymentConfig() {
  const { PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL } =
    process.env
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SITE_URL) {
    throw new Error("Missing payment server configuration.")
  }
  return {
    paystackSecret: PAYSTACK_SECRET_KEY,
    supabaseUrl: SUPABASE_URL.replace(/\/$/, ""),
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: SITE_URL.replace(/\/$/, ""),
  }
}

export async function supabaseRequest(path, init = {}) {
  const { supabaseUrl, serviceRoleKey } = requirePaymentConfig()
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    const message = body?.message || body?.details || `Supabase request failed (${response.status}).`
    throw new Error(message)
  }
  return body
}

export async function verifyPaystackTransaction(reference, expectedAmountKobo) {
  const { paystackSecret } = requirePaymentConfig()
  const response = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${paystackSecret}` } },
  )
  const result = await response.json()
  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message || "Unable to verify payment with Paystack.")
  }
  return (
    result.data.status === "success" &&
    result.data.currency === "NGN" &&
    Number(result.data.amount) === Number(expectedAmountKobo)
  )
}

export async function markOrderPaid(reference) {
  const completed = await supabaseRequest("rpc/complete_zoenaturals_order", {
    method: "POST",
    body: JSON.stringify({ p_reference: reference }),
  })
  if (completed !== true) {
    throw new Error("Order could not be marked as paid.")
  }
}

export async function getOrder(reference) {
  const rows = await supabaseRequest(
    `orders?reference=eq.${encodeURIComponent(reference)}&select=reference,status,amount_kobo,payment_method,expires_at`,
  )
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export async function updateOrder(reference, updates) {
  await supabaseRequest(`orders?reference=eq.${encodeURIComponent(reference)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  })
}
