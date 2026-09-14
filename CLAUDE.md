## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Root-Cause-First Error Handling

When an error appears during implementation or testing:

1. Determine the actual root cause before changing behavior.

2. Do not suppress, hide, or work around an error merely by wrapping it in `try` / `except`.

3. Use `try` / `except` only when exception handling is genuinely the correct design for the operation.

4. If an exception appears to require defensive wrapping, first consider whether the control flow, abstraction, validation, or surrounding design can be improved so the exceptional state is handled more naturally.

5. Prefer fixing the underlying or refactoring the entire code defect over masking its symptoms.

6. Preserve and present meaningful failures and typed exceptions rather than converting them into silent fallbacks.
