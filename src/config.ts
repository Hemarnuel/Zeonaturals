export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? ""

export const IS_DEMO_API =
	!API_BASE_URL ||
	API_BASE_URL.includes("YOUR-API-DOMAIN") ||
	API_BASE_URL.includes("example")
