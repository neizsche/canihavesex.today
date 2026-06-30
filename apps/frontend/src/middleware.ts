import type { MiddlewareHandler } from 'astro';

function shouldLogPath(pathname: string): boolean {
  if (pathname.startsWith('/_astro/')) return false;
  if (pathname.startsWith('/favicon')) return false;
  if (pathname.startsWith('/robots.txt')) return false;
  if (pathname.startsWith('/sitemap')) return false;
  return true;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname, search } = new URL(context.request.url);
  if (!shouldLogPath(pathname)) return next();

  const startAt = process.hrtime.bigint();
  const method = context.request.method;
  const url = `${pathname}${search}`;

  console.log(`[frontend] -> ${method} ${url}`);

  try {
    const res = await next();
    const durationMs = Number((process.hrtime.bigint() - startAt) / 1_000_000n);
    console.log(`[frontend] <- ${method} ${url} ${res.status} ${durationMs}ms`);
    return res;
  } catch (err) {
    const durationMs = Number((process.hrtime.bigint() - startAt) / 1_000_000n);
    console.error(`[frontend] xx ${method} ${url} ${durationMs}ms`);
    console.error(err);
    throw err;
  }
};
