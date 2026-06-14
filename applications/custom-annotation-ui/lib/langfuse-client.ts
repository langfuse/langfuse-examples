/**
 * Langfuse API Client
 * Uses the Langfuse SDK for type-safe API access
 */

import Langfuse from "langfuse"

const LANGFUSE_HOST = process.env.NEXT_PUBLIC_LANGFUSE_HOST || "https://cloud.langfuse.com"
const LANGFUSE_PUBLIC_KEY = process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY

if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
  console.warn("Langfuse credentials not found in environment variables")
}

/**
 * Initialize Langfuse SDK client
 * This client provides type-safe access to all Langfuse API endpoints
 */
export const langfuseClient = new Langfuse({
  publicKey: LANGFUSE_PUBLIC_KEY,
  secretKey: LANGFUSE_SECRET_KEY,
  baseUrl: LANGFUSE_HOST,
})

/**
 * Export the API namespace for direct access
 * All methods are auto-generated from the Langfuse OpenAPI spec
 */
export const langfuseApi = langfuseClient.api
