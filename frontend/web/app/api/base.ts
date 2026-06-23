const isServer = typeof window === "undefined";
const baseUrl = isServer
  ? (process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_GATEWAY_URL || "")
  : (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "");

export { baseUrl }