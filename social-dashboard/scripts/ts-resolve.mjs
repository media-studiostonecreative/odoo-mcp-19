// Lets the scripts/ CLIs import app modules with Node's built-in TypeScript
// support: app code imports siblings without an extension ("../db"), which
// Node's resolver won't guess, so retry those as ".ts".
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".") || /\\.[cm]?[jt]s$/.test(specifier)) throw error;
    return next(specifier + ".ts", context);
  }
}`),
);
