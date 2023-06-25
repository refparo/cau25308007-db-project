import { API_BASE } from "@/config"

export const fetcher = async (url: string) => {
  const resp = await fetch(new URL(url, API_BASE), { credentials: "include" })
  if (!resp.ok) {
    throw new Error(resp.statusText)
  }
  return resp.json()
}
