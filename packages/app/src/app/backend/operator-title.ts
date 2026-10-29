import type { Metadata } from "next";

import { metadata as notFoundMetadata } from "@/app/not-found";
import { getPrincipal } from "@/server/auth/page-guards";

/**
 * `generateMetadata` for a backend page (accounts AD4). Next.js resolves
 * metadata apart from rendering and still sends it with a 404, so a static
 * title such as "Dashboard" would reveal the area to a non-operator. Only an
 * operator gets the page's own title; anyone else gets the 404's.
 */
export function operatorTitle(title: string): () => Promise<Metadata> {
  return async () => {
    const principal = await getPrincipal();
    return principal?.roles.includes("operator") ? { title } : notFoundMetadata;
  };
}
