/**
 * Single-flight request coalescer to prevent cache stampedes.
 */
export class SingleFlight<T> {
	private pending = new Map<string, Promise<T>>();

	async getOrSet<F extends () => Promise<T>>(key: string, factory: F): Promise<T> {
		const existing = this.pending.get(key);
		if (existing) {
			return existing;
		}

		const promise = factory().finally(() => {
			this.pending.delete(key);
		});

		this.pending.set(key, promise);
		return promise;
	}
}
