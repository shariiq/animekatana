import { describe, expect, it } from "vitest";
import { SingleFlight } from "../../../lib/cache/single-flight";

describe("SingleFlight", () => {
	it("coalesces concurrent requests for the same key", async () => {
		const sf = new SingleFlight<string>();
		let callCount = 0;
		// biome-ignore lint/correctness/useQwikValidLexicalScope: Vitest factories are executed in Node, not a resumable Qwik component.
		const factory = async () => {
			callCount++;
			await new Promise((resolve) => setTimeout(resolve, 50));
			return "result";
		};

		const results = await Promise.all([
			sf.getOrSet("key", factory),
			sf.getOrSet("key", factory),
			sf.getOrSet("key", factory),
		]);

		expect(results).toEqual(["result", "result", "result"]);
		expect(callCount).toBe(1);
	});

	it("executes separate factories for different keys", async () => {
		const sf = new SingleFlight<string>();
		let callCount = 0;
		// biome-ignore lint/correctness/useQwikValidLexicalScope: Vitest factories are executed in Node, not a resumable Qwik component.
		const factory = async () => {
			callCount++;
			return "result";
		};

		await Promise.all([sf.getOrSet("key1", factory), sf.getOrSet("key2", factory)]);

		expect(callCount).toBe(2);
	});
});
