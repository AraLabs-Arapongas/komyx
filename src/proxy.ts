import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization and the files crawlers and link previews fetch
    // without a session (sitemap, robots, share image): the auth redirect used to send them to /login.
    "/((?!_next/static|_next/image|favicon.ico|icons/|sitemap\\.xml|robots\\.txt|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
