import { describe, expect, it } from "vitest";

import { isOnService, serviceSearchUrl } from "./streamingLinks";

const p = (provider_id: number, provider_name: string) => ({
  provider_id,
  provider_name,
  logo_path: "/x.png",
  display_priority: 1,
});
const service = { id: 8, name: "Netflix" };

describe("streaming links", () => {
  it("finds the service by id or by a variant's name", () => {
    expect(isOnService({ link: "", flatrate: [p(8, "Netflix")] }, service)).toBe(true);
    expect(isOnService({ link: "", ads: [p(1796, "Netflix Standard with Ads")] }, service)).toBe(
      true,
    );
    expect(isOnService({ link: "", flatrate: [p(337, "Disney Plus")] }, service)).toBe(false);
  });

  it("only counts streaming tiers, and needs data and a service", () => {
    expect(isOnService({ link: "", rent: [p(8, "Netflix")] }, service)).toBe(false);
    expect(isOnService(undefined, service)).toBe(false);
    expect(isOnService({ link: "", flatrate: [p(8, "Netflix")] }, null)).toBe(false);
  });

  it("builds an encoded search link for services with a known search page", () => {
    expect(serviceSearchUrl(service, " Amélie Poulain ")).toBe(
      "https://www.netflix.com/search?q=Am%C3%A9lie%20Poulain",
    );
    expect(serviceSearchUrl({ id: 350, name: "Apple TV Plus" }, "Mai")).toBe(
      "https://tv.apple.com/search?term=Mai",
    );
    expect(serviceSearchUrl({ id: 999, name: "Local Service" }, "Mai")).toBeUndefined();
  });
});
