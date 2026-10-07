export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? ""

export const PAYSTACK_ENABLED = import.meta.env.VITE_PAYSTACK_ENABLED === "true"

export const IS_DEMO_API =
	!API_BASE_URL ||
	API_BASE_URL.includes("YOUR-API-DOMAIN") ||
	API_BASE_URL.includes("example")

export const IS_DEMO_CHECKOUT = IS_DEMO_API && !PAYSTACK_ENABLED
