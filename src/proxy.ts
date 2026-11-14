import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Pages only: not the API, Next's own files, or anything with a file extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
