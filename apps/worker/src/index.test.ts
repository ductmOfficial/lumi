import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import worker, { type Env } from "./index";

/** The Workers runtime's HTMLRewriter, reduced to what the page handler needs: pass-through. */
class FakeRewriter {
  on() {
    return this;
  }
  transform(response: Response) {
    return response;
  }
}

const SHELL = '<!doctype html><html lang="vi"><head><title>Lumi</title></head></html>';

function setup() {
  const assets = vi.fn<(request: Request) => Promise<Response>>(() =>
    Promise.resolve(
      new Response(SHELL, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
  const env = { ASSETS: { fetch: assets }, SITE_URL: "https://lumi.example" } as unknown as Env;
  return { env, assets };
}

const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
const handle = (request: Request, env: Env) =>
  worker.fetch(request as Parameters<typeof worker.fetch>[0], env, ctx);

describe("pages", () => {
  beforeEach(() => {
    vi.stubGlobal("HTMLRewriter", FakeRewriter);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves the app shell for GET, varying by language", async () => {
    const res = await handle(new Request("https://lumi.example/"), setup().env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Vary")).toContain("Accept-Language");
    expect(await res.text()).toContain("<title>");
  });

  it("answers HEAD with the same headers as GET and no body", async () => {
    const { env, assets } = setup();
    const res = await handle(new Request("https://lumi.example/", { method: "HEAD" }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Vary")).toContain("Accept-Language");
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.body).toBeNull();
    // the asset is read with GET, so the page can be rewritten
    expect(assets.mock.calls[0]?.[0].method).toBe("GET");
  });

  it("does not serve pages for other methods", async () => {
    const { env, assets } = setup();
    await handle(new Request("https://lumi.example/", { method: "POST" }), env);
    expect(assets.mock.calls[0]?.[0].method).toBe("POST");
  });
});
