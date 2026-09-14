import { $, component$, useSignal } from "@builder.io/qwik";

interface SearchBarProps {
	initialQuery?: string;
}

export const SearchBar = component$<SearchBarProps>(({ initialQuery = "" }) => {
	const query = useSignal(initialQuery);
	const isLoading = useSignal(false);

	const handleSubmit = $(() => {
		const q = query.value.trim();
		if (q) {
			window.location.href = `/search?q=${encodeURIComponent(q)}`;
		}
	});

	return (
		<search>
			<form
				onSubmit$={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="flex w-full items-center gap-2"
			>
				<div class="relative flex-1">
					<svg
						class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						type="search"
						name="q"
						placeholder="Search anime by title..."
						value={query.value}
						onInput$={(e) => {
							query.value = (e.target as HTMLInputElement).value;
						}}
						class="min-h-11 w-full rounded-md border border-parchment-300 bg-white py-3 pl-10 pr-4 text-parchment-900 placeholder-parchment-500 shadow-sm focus:border-evergreen-500 focus:outline-none focus:ring-2 focus:ring-evergreen-200"
						aria-label="Search anime"
					/>
				</div>
				<button
					type="submit"
					disabled={isLoading.value}
					class="min-h-11 rounded-md bg-evergreen-800 px-5 py-3 font-bold text-white shadow-sm hover:bg-evergreen-700 focus:outline-none focus:ring-2 focus:ring-evergreen-500 focus:ring-offset-2 disabled:opacity-50"
					aria-busy={isLoading.value}
				>
					{isLoading.value ? "Searching..." : "Search"}
				</button>
			</form>
		</search>
	);
});

export default SearchBar;
