import { describe, expect, it } from "vitest";
import { TTLCache } from "../../../lib/cache/ttl-cache";

describe("TTLCache", () => {
	it("stores and retrieves values", () => {
		const cache = new TTLCache<string>();
		cache.set("key", "value", 60);
		expect(cache.get("key")).toBe("value");
	});

	it("expires values after TTL", async () => {
		const cache = new TTLCache<string>();
		cache.set("key", "value", -1); // Already expired
		expect(cache.get("key")).toBeNull();
	});

	it("deletes entries", () => {
		const cache = new TTLCache<string>();
		cache.set("key", "value", 60);
		cache.delete("key");
		expect(cache.get("key")).toBeNull();
	});

	it("clears all entries", () => {
		const cache = new TTLCache<string>();
		cache.set("k1", "v1", 60);
		cache.set("k2", "v2", 60);
		cache.clear();
		expect(cache.get("k1")).toBeNull();
		expect(cache.get("k2")).toBeNull();
	});
});
