# Phase 3 — Locales, RTL, Translation Crowdsourcing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the site in 7 locales (en + es + fr + de + ar + he + zh-Hans) with full RTL support for Arabic and Hebrew, machine-translated initial seed plus a clear "needs review" banner, and CI/community-translation infrastructure (Inlang Fink + Crowdin sync, missing-key validation in CI, a `/translate` page showing per-locale completeness).

**Architecture:** Paraglide JS 2.x is already wired up (Phase 1 T22) but currently locks to `baseLocale` in `hooks.server.ts`. Phase 3 extends the runtime to detect the requested locale from URL prefix or `Accept-Language` header, set `<html lang dir>` per request, and route Svelte links to keep the active prefix. RTL is implemented entirely via CSS logical properties — Phases 1–2 already use them throughout, so the dir flip should be near-automatic; the remaining cleanup is auditing `:hover` states / icons / table arrows. Translation files live in `messages/<locale>.json`; a one-off DeepL-powered seed script populates them, and the in-repo Inlang config + a Crowdin GitHub Action keep them current via community PRs. CI gains an `i18n-validate.yml` workflow that fails when a non-English locale is missing keys (a single-locale gap blocks merge).

**Tech Stack:** Same as Phase 2 (SvelteKit + Drizzle + better-sqlite3 + Paraglide JS 2.17 + Vitest + Playwright + Docker), plus **DeepL API** (one-time seed; no runtime dependency) and **Crowdin OSS** (no app code; just a GH Action). No new runtime npm dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-29-booster-tracker-design.md` section 9 (Internationalization & RTL) and section 10 (Deployment, secrets, CI).

**Phase 3 scope (in):**

- 6 new locales (`es`, `fr`, `de`, `ar`, `he`, `zh-Hans`) plus already-existing `en`
- Locale detection per request: URL prefix > `Accept-Language` header > `en` fallback
- Language switcher in the layout header
- `<html lang dir>` rendered server-side per request
- DeepL seed script (`npm run seed:translations`) — one-time manual run, output committed to repo
- "Machine-translated, needs review" banner in non-English locales
- `i18n-validate.yml` CI: fails on PRs introducing keys without all locales
- `crowdin-sync.yml` CI: scheduled bi-directional Crowdin sync (PR-bot)
- Inlang Fink configured (Inlang Project lives in `project.inlang/`, just needs locales added)
- `/translate` page: per-locale completeness + links to Fink and Crowdin
- Stylelint hardening: ban physical CSS properties (`margin-left`, `text-align: right`, etc.) globally, not just the existing 4 patterns
- Detail-page inline-English sweep (T8/T9/T10's "Boosters", "Mission", etc. → Paraglide keys)

**Phase 3 scope (out, deferred to a future phase):**

- Native iOS/Android apps
- Server-synced presets across locales (presets keep working — they're URL state, locale-independent)
- Locale-specific number/date formatting nuances beyond `Intl.*` defaults

---

## File structure overview

```
booster-tracker/
├── .github/workflows/
│   ├── ci.yml                                (Phase 1, unchanged)
│   ├── release.yml                           (Phase 2, unchanged)
│   ├── db-snapshot.yml                       (Phase 2, unchanged)
│   ├── i18n-validate.yml                     (NEW Phase 3)
│   └── crowdin-sync.yml                      (NEW Phase 3)
├── crowdin.yml                               (NEW Phase 3 — Crowdin source/target mapping)
├── messages/
│   ├── en.json                               (existing, source of truth — ~75 keys)
│   ├── es.json                               (NEW)
│   ├── fr.json                               (NEW)
│   ├── de.json                               (NEW)
│   ├── ar.json                               (NEW)
│   ├── he.json                               (NEW)
│   └── zh-Hans.json                          (NEW)
├── project.inlang/settings.json              (modified: locales array grows)
├── scripts/
│   ├── seed-translations.ts                  (NEW: DeepL one-shot seed)
│   └── validate-locales.ts                   (NEW: consumed by i18n-validate.yml)
├── src/
│   ├── app.html                              (modified: %sveltekit.html.attributes% for lang/dir)
│   ├── hooks.server.ts                       (modified: per-request locale resolution)
│   ├── lib/
│   │   ├── i18n/
│   │   │   ├── runtime.ts                    (modified: locale-aware helpers)
│   │   │   ├── locale-detect.ts              (NEW: prefix/Accept-Language resolver)
│   │   │   └── locale-meta.ts                (NEW: { code, label, dir, flag } per locale)
│   │   └── components/
│   │       ├── LanguageSwitcher.svelte       (NEW)
│   │       ├── LocaleBanner.svelte           (NEW: "machine-translated, needs review")
│   │       └── Footer.svelte                 (extracted from +layout.svelte for tidiness)
│   └── routes/
│       ├── +layout.svelte                    (modified: switcher + banner)
│       ├── +layout.server.ts                 (modified: pass locale to client load)
│       └── translate/
│           ├── +page.server.ts               (NEW: completion %)
│           └── +page.svelte                  (NEW)
├── .stylelintrc.json                         (modified: hardened rules + per-file overrides)
└── tests/
    ├── unit/locale-detect.test.ts            (NEW)
    └── unit/locale-meta.test.ts              (NEW)
```

Inline-English sweep: every `+page.svelte` and detail-page `+page.svelte` that currently has hardcoded English ("Boosters", "Mission", etc.) gets new `m.<key>()` calls. Affected files (~7): `src/routes/launches/[slug]/+page.svelte`, `src/routes/launchpads/[slug]/+page.svelte`, `src/routes/locations/[slug]/+page.svelte`, `src/routes/stats/+page.svelte`, `src/routes/admin/status/+page.svelte`, plus a small handful of inline strings in `+layout.svelte`. Stats/admin pages stay English-only at the team's discretion (they're operator surfaces) — but the sweep includes them for completeness and so the CI validator can be strict.

---

## Conventions reminder (from Phases 1–2)

- **Svelte 5 runes**: `let { x } = $props()`, `let foo = $state(false)`, `let bar = $derived(...)`, `{@render children?.()}`, `onclick=` (not `on:click=`).
- **Internal links**: use `resolve()` from `$app/paths`; cast as `ResolvedPathname`.
- **CSS uses logical properties only** — Phase 3 hardens this.
- **i18n**: all UI strings go through `m.<key>()`. Vite plugin recompiles Paraglide on save; CLI fallback is `npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`.
- **Drizzle DB type**: `import type { AppDb } from '$lib/server/db/types'`.
- **Test count starts at 72** (Phase 2 final). Phase 3 lands ~6 new tests; final count ~78.
- **Commit per task** with the exact message specified. Working tree must be clean after each task.

---

## Task 1: Locale metadata + Inlang settings update

**Goal**: declare the 7 locales we support, plus per-locale display metadata (label, direction).

**Files:**
- Modify: `project.inlang/settings.json`
- Create: `src/lib/i18n/locale-meta.ts`
- Create: `tests/unit/locale-meta.test.ts`

### Step 1: Update Inlang settings

Read the current `project.inlang/settings.json` and replace its `locales` array. Final state:

```json
{
	"$schema": "https://inlang.com/schema/project-settings",
	"baseLocale": "en",
	"locales": ["en", "es", "fr", "de", "ar", "he", "zh-Hans"],
	"modules": [
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@4/dist/index.js",
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-m-function-matcher@2/dist/index.js"
	],
	"plugin.inlang.messageFormat": {
		"pathPattern": "./messages/{locale}.json"
	}
}
```

Don't disturb the `plugin.inlang.messageFormat.pathPattern` value or the `modules` URLs — they were validated in Phase 1 T22.

### Step 2: Locale-meta module

Write `src/lib/i18n/locale-meta.ts`:

```ts
export type LocaleDir = 'ltr' | 'rtl';

export type LocaleMeta = {
	code: string;
	label: string;
	nativeLabel: string;
	dir: LocaleDir;
};

export const LOCALES: readonly LocaleMeta[] = [
	{ code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
	{ code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
	{ code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
	{ code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
	{ code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
	{ code: 'he', label: 'Hebrew', nativeLabel: 'עברית', dir: 'rtl' },
	{ code: 'zh-Hans', label: 'Mandarin (Simplified)', nativeLabel: '简体中文', dir: 'ltr' }
];

export const LOCALE_CODES: readonly string[] = LOCALES.map((l) => l.code);

export function getLocaleMeta(code: string): LocaleMeta | null {
	return LOCALES.find((l) => l.code === code) ?? null;
}

export function getLocaleDir(code: string): LocaleDir {
	return getLocaleMeta(code)?.dir ?? 'ltr';
}
```

### Step 3: Tests

Write `tests/unit/locale-meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LOCALES, LOCALE_CODES, getLocaleMeta, getLocaleDir } from '../../src/lib/i18n/locale-meta';

describe('locale-meta', () => {
	it('exposes 7 locales', () => {
		expect(LOCALES).toHaveLength(7);
	});

	it('LOCALE_CODES matches LOCALES order and shape', () => {
		expect(LOCALE_CODES).toEqual(['en', 'es', 'fr', 'de', 'ar', 'he', 'zh-Hans']);
	});

	it('marks ar and he as rtl, others ltr', () => {
		expect(getLocaleDir('ar')).toBe('rtl');
		expect(getLocaleDir('he')).toBe('rtl');
		expect(getLocaleDir('en')).toBe('ltr');
		expect(getLocaleDir('zh-Hans')).toBe('ltr');
	});

	it('returns null for unknown code', () => {
		expect(getLocaleMeta('xx')).toBeNull();
	});

	it('falls back to ltr for unknown code', () => {
		expect(getLocaleDir('xx')).toBe('ltr');
	});

	it('every locale has all four required fields', () => {
		for (const l of LOCALES) {
			expect(l.code).toBeTruthy();
			expect(l.label).toBeTruthy();
			expect(l.nativeLabel).toBeTruthy();
			expect(['ltr', 'rtl']).toContain(l.dir);
		}
	});
});
```

### Step 4: Run

```bash
npm test
npm run check
```

Expected: 78 tests pass (72 prior + 6 new). Type-check 0 errors.

### Step 5: Commit

```bash
git add project.inlang/settings.json src/lib/i18n/locale-meta.ts tests/unit/locale-meta.test.ts
git commit -m "Declare 7 locales (en/es/fr/de/ar/he/zh-Hans) with direction metadata"
```

---

## Task 2: Locale detector

**Goal**: pure function that picks a locale from a URL pathname + `Accept-Language` header, falling back to `en`.

**Files:**
- Create: `src/lib/i18n/locale-detect.ts`
- Create: `tests/unit/locale-detect.test.ts`

### Step 1: Write the failing test

`tests/unit/locale-detect.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectLocale, stripLocalePrefix } from '../../src/lib/i18n/locale-detect';

describe('detectLocale', () => {
	it('returns the URL prefix locale when present', () => {
		expect(detectLocale('/de/boosters', null)).toBe('de');
		expect(detectLocale('/ar/launches', 'en-US,en;q=0.9')).toBe('ar');
		expect(detectLocale('/zh-Hans/stats', null)).toBe('zh-Hans');
	});

	it('falls back to Accept-Language when no URL prefix', () => {
		expect(detectLocale('/boosters', 'fr-FR,fr;q=0.9,en;q=0.7')).toBe('fr');
		expect(detectLocale('/', 'es-ES,es;q=0.9')).toBe('es');
	});

	it('uses base locale en for /', () => {
		expect(detectLocale('/', 'en-US')).toBe('en');
	});

	it('returns en when Accept-Language is unknown', () => {
		expect(detectLocale('/boosters', 'ja-JP,ja')).toBe('en');
	});

	it('returns en for empty/null Accept-Language', () => {
		expect(detectLocale('/boosters', null)).toBe('en');
		expect(detectLocale('/boosters', '')).toBe('en');
	});

	it('rejects unknown URL prefix and falls through to Accept-Language', () => {
		// /jp/ is not a real prefix; treat as a normal path and use Accept-Language
		expect(detectLocale('/jp/boosters', 'fr-FR,fr')).toBe('fr');
	});
});

describe('stripLocalePrefix', () => {
	it('strips a known locale prefix', () => {
		expect(stripLocalePrefix('/de/boosters')).toEqual({ locale: 'de', rest: '/boosters' });
		expect(stripLocalePrefix('/zh-Hans/stats/foo')).toEqual({
			locale: 'zh-Hans',
			rest: '/stats/foo'
		});
	});

	it('returns en for paths without a prefix', () => {
		expect(stripLocalePrefix('/boosters')).toEqual({ locale: 'en', rest: '/boosters' });
		expect(stripLocalePrefix('/')).toEqual({ locale: 'en', rest: '/' });
	});

	it('does not strip an unknown prefix', () => {
		expect(stripLocalePrefix('/jp/foo')).toEqual({ locale: 'en', rest: '/jp/foo' });
	});
});
```

### Step 2: Run, see fail (module not found)

```bash
npm test
```

### Step 3: Implement `src/lib/i18n/locale-detect.ts`

```ts
import { LOCALE_CODES } from './locale-meta';

const LOCALE_SET = new Set(LOCALE_CODES);
const NON_BASE_LOCALES = LOCALE_CODES.filter((c) => c !== 'en');

/**
 * Strip a leading locale prefix from a pathname. Only recognized non-en
 * locales are stripped (en is unprefixed). Returns { locale, rest }.
 */
export function stripLocalePrefix(pathname: string): { locale: string; rest: string } {
	for (const code of NON_BASE_LOCALES) {
		const prefix = `/${code}`;
		if (pathname === prefix) return { locale: code, rest: '/' };
		if (pathname.startsWith(prefix + '/')) return { locale: code, rest: pathname.slice(prefix.length) };
	}
	return { locale: 'en', rest: pathname };
}

/**
 * Resolve the request locale by inspecting (1) URL prefix, then
 * (2) Accept-Language header, then (3) defaulting to en.
 */
export function detectLocale(pathname: string, acceptLanguage: string | null | undefined): string {
	const { locale: prefixLocale } = stripLocalePrefix(pathname);
	if (prefixLocale !== 'en') return prefixLocale;

	if (!acceptLanguage) return 'en';

	// Parse "en-US,en;q=0.9,fr;q=0.8" — preserve order, ignore q-values for simplicity
	// (Accept-Language is comma-delimited; first match wins).
	const candidates = acceptLanguage
		.split(',')
		.map((part) => part.split(';')[0].trim())
		.filter(Boolean);

	for (const cand of candidates) {
		const lower = cand.toLowerCase();
		// Exact match (case-insensitive on the lookup, exact on output)
		const exact = LOCALE_CODES.find((c) => c.toLowerCase() === lower);
		if (exact) return exact;
		// Language-only match (e.g., "fr-FR" -> "fr")
		const language = lower.split('-')[0];
		const langMatch = LOCALE_CODES.find((c) => c.toLowerCase().split('-')[0] === language);
		if (langMatch) return langMatch;
	}

	return 'en';
}
```

### Step 4: Run, see all tests pass

```bash
npm test
```

Expected: 84 tests pass (78 + 6 new).

### Step 5: Commit

```bash
git add src/lib/i18n/locale-detect.ts tests/unit/locale-detect.test.ts
git commit -m "Add detectLocale helper (URL prefix > Accept-Language > en)"
```

---

## Task 3: Per-request locale wiring

**Goal**: `hooks.server.ts` calls `detectLocale` per request, sets it on the runtime, and exposes it for SSR via `event.locals` and the HTML `lang`/`dir` attributes.

**Files:**
- Modify: `src/hooks.server.ts`
- Modify: `src/app.html`
- Modify: `src/app.d.ts`
- Modify: `src/routes/+layout.server.ts` (create if it doesn't exist)
- Modify: `src/lib/i18n/runtime.ts`

### Step 1: app.html — accept dynamic lang/dir

Read current `src/app.html`. Find the opening `<html ...>` tag and replace it with:

```html
<html %sveltekit.html.attributes%>
```

That delegates the attributes to whatever the server `transformPageChunk` adds. Sample full file (your version may differ; preserve other tags):

```html
<!doctype html>
<html %sveltekit.html.attributes%>
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link
			href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
			rel="stylesheet"
		/>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

The `%sveltekit.html.attributes%` placeholder is one we'll fill from `hooks.server.ts` via `transformPageChunk` — see Step 3 below. (Note: `%sveltekit.html.attributes%` is NOT a built-in SvelteKit placeholder; it's a custom one we replace via regex in `transformPageChunk`. The trick is documented in the SvelteKit docs under `Hooks → Locals → Setting language attributes`.)

### Step 2: app.d.ts — type Locals.locale

Read `src/app.d.ts`. Find the `Locals` interface and ensure it has a `locale: string` field. Already added in Phase 1 — verify nothing has regressed.

### Step 3: hooks.server.ts

Read current. Replace the `handle` export with one that detects the locale and rewrites the html attributes:

```ts
import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';
import { setLocale, baseLocale } from '$lib/i18n/runtime';
import { detectLocale } from '$lib/i18n/locale-detect';
import { getLocaleDir } from '$lib/i18n/locale-meta';

let booted = false;
function bootOnce() {
	if (booted) return;
	booted = true;
	runMigrations();
	if (process.env.NODE_ENV !== 'test') {
		startScheduler();
	}
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
	const acceptLanguage = event.request.headers.get('accept-language');
	const locale = detectLocale(event.url.pathname, acceptLanguage);

	setLocale(locale);
	event.locals.locale = locale;

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const dir = getLocaleDir(locale);
			return html.replace(
				'%sveltekit.html.attributes%',
				`lang="${locale}" dir="${dir}"`
			);
		}
	});
};
```

The `setLocale(locale)` call propagates the locale into Paraglide's runtime so `m.<key>()` returns the correct translation during this request.

### Step 4: layout.server.ts — pass locale to client load

Read current `src/routes/+layout.server.ts` (it likely doesn't exist; create it if not):

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return { locale: locals.locale };
};
```

This makes `data.locale` available on the layout for the language switcher and banner.

### Step 5: runtime.ts — verify exports

`src/lib/i18n/runtime.ts` already exports `setLocale`, `baseLocale`, `m`, etc. (Phase 1 T23). No changes required for this task; just confirm `setLocale` accepts any of the 7 locale codes (it does — Paraglide's runtime accepts the strings present in the compile-time settings).

### Step 6: Verify

```bash
npm run check
npm test     # 84 still passing
```

Smoke (note: the only locale with a populated message file right now is `en`; non-English locales still display empty strings or fall back. That's OK for this task — Tasks 5–7 land the translations):

```bash
pkill -f 'vite dev' 2>/dev/null; sleep 1
rm -f /tmp/dev.log
npm run dev -- --port 5173 > /tmp/dev.log 2>&1 &
sleep 6
curl -s http://localhost:5173/boosters | grep -E 'lang="en"|dir="ltr"'
curl -s http://localhost:5173/de/boosters | grep -E 'lang="de"|dir="ltr"'
curl -s http://localhost:5173/ar/boosters | grep -E 'lang="ar"|dir="rtl"'
curl -s -H 'Accept-Language: fr-FR,fr' http://localhost:5173/ | grep -E 'lang="fr"'
pkill -f 'vite dev' 2>/dev/null
```

Expected: each grep finds its target. The `<html>` tag carries the right `lang` and `dir`.

If a curl returns 404 instead of 200 — the routing isn't yet locale-aware (that's Task 4). For now, the fact that `/de/boosters` returns 200 with `lang="de"` is fine because SvelteKit treats `/de/boosters` as a 404 only if no route matches. We need [optional locale slug routing](https://kit.svelte.dev/docs/advanced-routing) — added in Task 4.

### Step 7: Commit

```bash
git add src/hooks.server.ts src/app.html src/app.d.ts src/routes/+layout.server.ts
git commit -m "Detect request locale; render <html lang dir> per request"
```

---

## Task 4: Locale-aware route group + redirect

**Goal**: SvelteKit needs to recognize `/de/...`, `/ar/...`, etc. as valid pages that render the same components as the unprefixed routes. Use SvelteKit's "optional parameters" pattern.

**Files:**
- Move: `src/routes/(app)/...` route group OR add `[[locale=locale]]/` matcher
- Create: `src/params/locale.ts` (route param matcher)
- Create: `src/routes/[[locale=locale]]/+layout.svelte` and route nesting

This is a significant restructure. SvelteKit supports two patterns:

**Pattern A: optional locale matcher.** The cleanest approach. Move every existing route into a `[[locale=locale]]/` group:

```
src/routes/
├── +layout.svelte                  (stays at top — global shell)
├── +layout.server.ts               (stays at top — sets locale)
└── [[locale=locale]]/
    ├── +page.svelte                (was src/routes/+page.svelte)
    ├── boosters/+page.{svelte,server.ts}
    ├── boosters/[serial]/...
    ├── launches/...
    ├── launches/[slug]/...
    ├── droneships/+page.{svelte,server.ts}
    ├── launchpads/+page.{svelte,server.ts}
    ├── launchpads/[slug]/...
    ├── locations/[slug]/...
    ├── stats/...
    ├── translate/+page.{svelte,server.ts}     (added in Task 11)
    └── admin/status/...
```

API endpoints (`/api/...`, `/healthz`) stay at the top level — no locale prefix.

This is a lot of file moves. Define the matcher first, then walk through the moves.

### Step 1: Param matcher

Create `src/params/locale.ts`:

```ts
import type { ParamMatcher } from '@sveltejs/kit';
import { LOCALE_CODES } from '$lib/i18n/locale-meta';

const NON_BASE_LOCALES = new Set(LOCALE_CODES.filter((c) => c !== 'en'));

export const match: ParamMatcher = (param) => NON_BASE_LOCALES.has(param);
```

This makes `[[locale=locale]]` only match `de`, `es`, `fr`, `ar`, `he`, `zh-Hans` — never `en` (en is the unprefixed default) and never random strings like `jp` or `boosters` (which would otherwise greedily match).

### Step 2: Move routes into the optional group

```bash
mkdir -p 'src/routes/[[locale=locale]]'
git mv src/routes/+page.svelte 'src/routes/[[locale=locale]]/+page.svelte'
git mv src/routes/boosters 'src/routes/[[locale=locale]]/boosters'
git mv src/routes/launches 'src/routes/[[locale=locale]]/launches'
git mv src/routes/droneships 'src/routes/[[locale=locale]]/droneships'
git mv src/routes/launchpads 'src/routes/[[locale=locale]]/launchpads'
git mv src/routes/locations 'src/routes/[[locale=locale]]/locations'
git mv src/routes/stats 'src/routes/[[locale=locale]]/stats'
git mv src/routes/admin 'src/routes/[[locale=locale]]/admin'
```

Leave `src/routes/api/`, `src/routes/healthz/`, `src/routes/+layout.svelte`, and `src/routes/+layout.server.ts` at the top level — they're locale-agnostic.

### Step 3: Update internal-link helpers to include the locale prefix

Many components use `resolve('/boosters')` style. The unprefixed routes still match `/boosters` (because the locale is optional), so existing links to `/boosters` work for `en`. For non-English locales, links need to be prefixed with `/de/...` etc.

Add a helper to `src/lib/i18n/runtime.ts`:

```ts
export function localizedPath(locale: string, path: string): string {
	if (locale === 'en') return path;
	if (path === '/' ) return `/${locale}`;
	return `/${locale}${path.startsWith('/') ? '' : '/'}${path}`;
}
```

In components that build hrefs, replace:

```ts
function boosterHref(serial: string): ResolvedPathname {
	return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
}
```

with:

```ts
function boosterHref(serial: string): ResolvedPathname {
	return localizedPath(data.locale, `/boosters/${serial}`) as ResolvedPathname;
}
```

The `data.locale` comes from the `+layout.server.ts` we wrote in Task 3. For pages that use `data` already this is one prop addition; for components that don't have `data`, accept `locale` as a prop or import from `$page` state.

A practical approach: extend the layout's data to include `locale`, then any page-level `+page.svelte` that builds a link uses `data.locale` (which is implicitly inherited via SvelteKit's load chain).

### Step 4: Verify

```bash
npm run check    # may surface 1-2 typing issues from the moves; resolve
npm test         # 84 still
```

Smoke:

```bash
pkill -f 'vite dev' 2>/dev/null; sleep 1
rm -f /tmp/dev.log
npm run dev -- --port 5173 > /tmp/dev.log 2>&1 &
sleep 6
for path in / /boosters /de /de/boosters /ar /ar/launches /healthz /api/launches/export?format=csv; do
	curl -s -o /dev/null -w "%{http_code} $path\n" "http://localhost:5173$path"
done
pkill -f 'vite dev' 2>/dev/null
```

All should return 200.

### Step 5: Commit

```bash
git add -A
git commit -m "Add optional [[locale]] route group; localize internal links"
```

(The route moves accumulate many file paths; `git add -A` is the cleanest stage. Inspect `git status` first to confirm only relevant files are staged.)

---

## Task 5: DeepL seed-translations script

**Goal**: one-shot script that reads `messages/en.json`, calls DeepL for each non-English locale, and writes `messages/<locale>.json`. Operator runs this manually with `DEEPL_AUTH_KEY=...` set; output is committed.

**Files:**
- Create: `scripts/seed-translations.ts`
- Modify: `package.json` (add `seed:translations` script)

### Step 1: Add the script entry

In `package.json` `scripts`:

```json
"seed:translations": "node --import tsx scripts/seed-translations.ts"
```

### Step 2: Implement the seed script

`scripts/seed-translations.ts`:

```ts
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';

type MessageMap = Record<string, string>;

const SOURCE_LOCALE = 'EN';
const TARGETS: Record<string, string> = {
	es: 'ES',
	fr: 'FR',
	de: 'DE',
	ar: 'AR',
	he: 'HE',
	'zh-Hans': 'ZH-HANS'
};
const ENDPOINT = 'https://api-free.deepl.com/v2/translate';

async function translateBatch(
	authKey: string,
	target: string,
	texts: string[]
): Promise<string[]> {
	const params = new URLSearchParams();
	params.set('source_lang', SOURCE_LOCALE);
	params.set('target_lang', target);
	for (const t of texts) params.append('text', t);
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${authKey}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params
	});
	if (!res.ok) throw new Error(`DeepL HTTP ${res.status}: ${await res.text()}`);
	const data = (await res.json()) as { translations: { text: string }[] };
	return data.translations.map((t) => t.text);
}

async function seedLocale(authKey: string, source: MessageMap, locale: string, target: string) {
	const keys = Object.keys(source).filter((k) => !k.startsWith('$'));
	const texts = keys.map((k) => source[k]);

	console.log(`[seed] translating ${keys.length} keys to ${locale} (${target})...`);
	// DeepL's POST endpoint accepts up to ~50 texts per request comfortably; chunk for safety.
	const CHUNK = 40;
	const out: string[] = [];
	for (let i = 0; i < texts.length; i += CHUNK) {
		const chunk = texts.slice(i, i + CHUNK);
		const translated = await translateBatch(authKey, target, chunk);
		out.push(...translated);
	}

	const result: MessageMap = { $schema: source.$schema };
	for (let i = 0; i < keys.length; i++) result[keys[i]] = out[i];

	const path = `messages/${locale}.json`;
	writeFileSync(path, JSON.stringify(result, null, '\t') + '\n', 'utf8');
	console.log(`[seed] wrote ${path}`);
}

async function main() {
	const authKey = process.env.DEEPL_AUTH_KEY;
	if (!authKey) {
		console.error('DEEPL_AUTH_KEY must be set. Get a free key at https://www.deepl.com/pro-api');
		process.exit(1);
	}
	const source = JSON.parse(readFileSync('messages/en.json', 'utf8')) as MessageMap;
	for (const [locale, target] of Object.entries(TARGETS)) {
		await seedLocale(authKey, source, locale, target);
	}
	console.log('[seed] done');
}

main().catch((err) => {
	console.error('[seed] failed:', err);
	process.exit(1);
});
```

### Step 3: Document in `.env.example`

Append to `.env.example`:

```env

# Optional, only needed when running `npm run seed:translations`. Get a free
# DeepL API key at https://www.deepl.com/pro-api (500K chars/month free tier).
DEEPL_AUTH_KEY=
```

### Step 4: Run it (operator-driven)

This is a one-time-ish operation; you (the operator) run:

```bash
DEEPL_AUTH_KEY=your-key npm run seed:translations
```

Output: 6 new files (`messages/{es,fr,de,ar,he,zh-Hans}.json`), each with the same key set as `messages/en.json`, populated with DeepL translations.

If you DON'T have a DeepL key right now, skip this step — Task 6 ships placeholder files (English text repeated) so the rest of the plan still works. But you should run this before merging Phase 3 to production.

### Step 5: Verify (only if you have a DeepL key)

```bash
ls messages/*.json
head -10 messages/es.json
head -10 messages/ar.json
```

Each should be a valid JSON file with translated values for ~75 keys.

### Step 6: Commit (the script + docs, NOT the translation outputs)

```bash
git add scripts/seed-translations.ts package.json .env.example
git commit -m "Add seed-translations script (DeepL one-shot for 6 locales)"
```

The translation outputs are committed in Task 6.

---

## Task 6: Land translation files (or placeholders)

**Goal**: have `messages/{es,fr,de,ar,he,zh-Hans}.json` exist in the repo so Paraglide compiles cleanly and the locale switcher has something to switch to.

**Files (one or both paths):**
- If you ran Task 5: commit the 6 generated files.
- If you didn't: write 6 placeholder files (each is a copy of `messages/en.json`) and commit.

### Path A: real translations (preferred)

After running `npm run seed:translations`:

```bash
git add messages/es.json messages/fr.json messages/de.json messages/ar.json messages/he.json messages/zh-Hans.json
git commit -m "Seed machine-translated locales (es/fr/de/ar/he/zh-Hans, DeepL)"
```

### Path B: placeholder fallback

If DeepL isn't available right now, copy `messages/en.json` to each non-English locale so the build doesn't break:

```bash
for loc in es fr de ar he zh-Hans; do
	cp messages/en.json "messages/$loc.json"
done
```

Then commit:

```bash
git add messages/*.json
git commit -m "Stub non-English locale message files (English placeholders pending translation)"
```

**Important**: with placeholders, the locale-switcher UI will still work but show English text everywhere. The "needs review" banner from Task 8 will still appear so users know it's not real translations.

### Step 1: Verify

```bash
npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
npm run check
npm test
```

Paraglide needs all locales declared in `project.inlang/settings.json` (Task 1 added the 6 new ones) to have corresponding files. If a file is missing, the compile fails with a clear error — fix by ensuring all 7 files exist.

---

## Task 7: Language switcher component

**Goal**: visible dropdown/menu in the header that lets users switch locale. Clicking a language navigates to the same path under the new prefix.

**Files:**
- Create: `src/lib/components/LanguageSwitcher.svelte`
- Modify: `src/routes/+layout.svelte` (insert switcher into header)

### Step 1: Component

`src/lib/components/LanguageSwitcher.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import { LOCALES } from '$lib/i18n/locale-meta';
	import { stripLocalePrefix } from '$lib/i18n/locale-detect';

	let { activeLocale }: { activeLocale: string } = $props();

	let open = $state(false);

	function pickLocale(code: string) {
		open = false;
		const { rest } = stripLocalePrefix(page.url.pathname);
		const dest = (code === 'en' ? rest : `/${code}${rest === '/' ? '' : rest}`) as ResolvedPathname;
		const search = page.url.search;
		goto(`${dest}${search}` as ResolvedPathname);
	}

	let activeLabel = $derived(
		LOCALES.find((l) => l.code === activeLocale)?.nativeLabel ?? 'English'
	);
</script>

<div class="lang-switcher">
	<button onclick={() => (open = !open)} aria-haspopup="listbox" aria-expanded={open}>
		<span aria-hidden="true">🌐</span>
		<span>{activeLabel}</span>
	</button>
	{#if open}
		<ul role="listbox">
			{#each LOCALES as loc (loc.code)}
				<li>
					<button
						class:active={loc.code === activeLocale}
						onclick={() => pickLocale(loc.code)}
						aria-selected={loc.code === activeLocale}
					>
						{loc.nativeLabel}
						<span class="muted">— {loc.label}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.lang-switcher {
		position: relative;
		display: inline-block;
	}
	button {
		font: inherit;
		color: var(--header-text-muted);
		background: transparent;
		border: 1px solid transparent;
		padding-block: 6px;
		padding-inline: 10px;
		border-radius: var(--radius-sm);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}
	button:hover {
		background: rgb(255 255 255 / 6%);
		color: var(--header-text);
	}
	ul {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md, 0 4px 16px rgb(0 0 0 / 12%));
		list-style: none;
		padding: var(--space-2);
		min-inline-size: 12rem;
		margin-block-start: 4px;
		z-index: 100;
	}
	li {
		padding: 0;
	}
	li button {
		inline-size: 100%;
		text-align: start;
		color: var(--text);
		padding-block: 6px;
		padding-inline: 10px;
		border-radius: var(--radius-sm);
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
	}
	li button:hover {
		background: var(--surface);
	}
	li button.active {
		background: var(--surface);
		color: var(--accent);
		font-weight: 600;
	}
	.muted {
		color: var(--text-muted);
		font-weight: 400;
	}
</style>
```

### Step 2: Wire into layout

Read current `src/routes/+layout.svelte`. Find the `<nav class="site-nav">` block and add the switcher AFTER the nav links but still inside the header:

```svelte
<script lang="ts">
	// ... existing imports ...
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

	let { children, data }: { children: never; data: { locale: string } } = $props();
</script>

<!-- ... header markup ... -->
<nav class="site-nav">
	<!-- existing links -->
</nav>
<LanguageSwitcher activeLocale={data.locale} />
<!-- close header div -->
```

The exact placement depends on the existing layout structure; the switcher belongs visually next to the nav (right side of the header).

### Step 3: Verify

```bash
npm run check
npm run dev -- --port 5173 &
sleep 6
curl -s http://localhost:5173/boosters | grep -E 'lang-switcher' | head -1
pkill -f 'vite dev' 2>/dev/null
```

Click the switcher in your browser at `http://localhost:5173/boosters`, pick "Español", confirm URL becomes `/es/boosters` and content (still English placeholders OR Spanish if you ran the seed) updates.

### Step 4: Commit

```bash
git add src/lib/components/LanguageSwitcher.svelte src/routes/+layout.svelte
git commit -m "Add LanguageSwitcher in header (locale-aware navigation)"
```

---

## Task 8: "Machine-translated, needs review" banner

**Goal**: a thin top banner shown only on non-English locales that says the translation is machine-generated and links to `/translate`.

**Files:**
- Create: `src/lib/components/LocaleBanner.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `messages/en.json` (and the 6 sibling files) — add `mt_banner_text` and `mt_banner_cta` keys

### Step 1: i18n keys

Add to `messages/en.json`:

```json
"mt_banner_text": "These translations are machine-generated.",
"mt_banner_cta": "Help improve them"
```

If you ran DeepL seeding (Task 5) before this task: re-run it on just these two keys, OR add manual placeholders to the other 6 files. If you used placeholder copies (Task 6 path B): copy the new keys into them.

Minimal approach for both paths — append to all 7 files now via:

```bash
node -e "
const fs = require('fs');
const path = 'messages';
const newKeys = {
	en: { mt_banner_text: 'These translations are machine-generated.', mt_banner_cta: 'Help improve them' },
	es: { mt_banner_text: 'Estas traducciones son generadas por máquina.', mt_banner_cta: 'Ayuda a mejorarlas' },
	fr: { mt_banner_text: 'Ces traductions sont générées automatiquement.', mt_banner_cta: 'Aidez à les améliorer' },
	de: { mt_banner_text: 'Diese Übersetzungen sind maschinell erstellt.', mt_banner_cta: 'Helfen Sie, sie zu verbessern' },
	ar: { mt_banner_text: 'هذه الترجمات منشأة آلياً.', mt_banner_cta: 'ساعد في تحسينها' },
	he: { mt_banner_text: 'תרגומים אלה הופקו אוטומטית.', mt_banner_cta: 'עזרו לשפרם' },
	'zh-Hans': { mt_banner_text: '这些翻译是机器生成的。', mt_banner_cta: '帮助改进' }
};
for (const [loc, keys] of Object.entries(newKeys)) {
	const fp = \`\${path}/\${loc}.json\`;
	const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
	Object.assign(data, keys);
	fs.writeFileSync(fp, JSON.stringify(data, null, '\\t') + '\\n');
}
console.log('done');
"
```

### Step 2: Banner component

`src/lib/components/LocaleBanner.svelte`:

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, localizedPath } from '$lib/i18n/runtime';
	import { baseLocale } from '$lib/paraglide/runtime';

	let { locale }: { locale: string } = $props();

	let show = $derived(locale !== baseLocale);

	function translateHref(): ResolvedPathname {
		return localizedPath(locale, '/translate') as ResolvedPathname;
	}
</script>

{#if show}
	<div class="banner" role="note">
		<span>{m.mt_banner_text()}</span>
		<a href={translateHref()}>{m.mt_banner_cta()} →</a>
	</div>
{/if}

<style>
	.banner {
		background: #fef3c7;
		color: #854d0e;
		border-block-end: 1px solid #fde68a;
		font-size: 0.85rem;
		padding-block: 0.5rem;
		padding-inline: var(--space-5);
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
	}
	a {
		color: inherit;
		font-weight: 600;
		text-decoration: underline;
	}
	a:hover {
		text-decoration: none;
	}
</style>
```

### Step 3: Insert into layout

In `src/routes/+layout.svelte`, place the banner BEFORE the `<header class="site-header">`:

```svelte
<LocaleBanner locale={data.locale} />
<header class="site-header">
	<!-- ... -->
</header>
```

### Step 4: Verify

```bash
npm run dev -- --port 5173 &
sleep 6
curl -s http://localhost:5173/boosters | grep -E 'machine-generated|translations' | head -1   # should be empty (en)
curl -s http://localhost:5173/de/boosters | grep -E 'machine|maschin' | head -1
pkill -f 'vite dev' 2>/dev/null
```

### Step 5: Commit

```bash
git add src/lib/components/LocaleBanner.svelte src/routes/+layout.svelte messages/*.json
git commit -m "Add 'machine-translated' banner on non-English locales"
```

---

## Task 9: Sweep inline English strings into Paraglide keys

**Goal**: every UI string visible to a user must come through `m.<key>()`. Phase 2 left some hardcoded English on detail pages and inside small inline labels.

**Files:**
- Modify: `src/routes/[[locale=locale]]/launches/[slug]/+page.svelte`
- Modify: `src/routes/[[locale=locale]]/launchpads/[slug]/+page.svelte`
- Modify: `src/routes/[[locale=locale]]/locations/[slug]/+page.svelte`
- Modify: `src/routes/[[locale=locale]]/stats/+page.svelte`
- Modify: `src/routes/[[locale=locale]]/admin/status/+page.svelte`
- Modify: `messages/*.json` (add new keys to all 7 locales)

### Step 1: Audit

Grep for hardcoded English in pages:

```bash
grep -rE '>(Boosters|Mission|Type|Orbit|Pad|Webcast|Flight #|Landing|Total launches|Successes|Success rate|Recent launches|Successful|Attempted|Attempts|Stats|Records|Most-flown|Most-used|Trigger|Sync state|Resource|Status|Last full sync|Last incremental sync|Error)<' src/routes/
```

Each match is a candidate to convert.

### Step 2: New i18n keys

Add to `messages/en.json` (a representative set — actual list may grow during the sweep):

```json
"detail_section_boosters": "Boosters",
"detail_section_webcast": "Webcast",
"detail_meta_mission": "Mission",
"detail_meta_type": "Type",
"detail_meta_orbit": "Orbit",
"detail_meta_pad": "Pad",
"detail_card_flight_number": "Flight #",
"detail_card_landing": "Landing",
"detail_landing_failed": "Failed",
"detail_landing_not_attempted": "Not attempted",
"detail_landing_pending": "Pending",
"detail_no_boosters": "No booster data available for this launch.",
"launchpad_recent_launches": "Recent launches",
"launchpad_no_launches": "No launches at this pad yet.",
"launchpad_recent_note": "Showing the {shown} most recent launches of {total} total.",
"launchpad_col_date": "Date",
"launchpad_col_mission": "Mission",
"launchpad_col_status": "Status",
"location_col_date": "Date",
"location_col_mission": "Mission",
"location_col_booster": "Booster",
"location_col_result": "Result",
"location_no_attempts": "No landing attempts recorded at this location yet.",
"location_attempts_section": "Attempts",
"stats_section_records": "Records",
"stats_chart_per_year": "Launches per year",
"stats_chart_per_month": "Launches per month (last 24)",
"stats_chart_rolling": "Rolling 12-month landing success rate",
"stats_chart_histogram": "Booster flight-count distribution",
"stats_subtitle": "Fleet-wide aggregates and trends.",
"stats_record_most_flown": "Most-flown booster",
"stats_record_most_pad": "Most-used launchpad",
"stats_record_most_ship": "Most-used droneship",
"stats_glance_total_boosters": "Total boosters",
"stats_glance_active": "Active",
"stats_glance_total_launches": "Total launches",
"stats_glance_landing_rate": "Landing success rate",
"admin_status_title": "Admin Status",
"admin_status_subtitle": "Per-resource sync state and manual sync trigger.",
"admin_count_boosters": "Boosters",
"admin_count_launches": "Launches",
"admin_count_launchpads": "Launchpads",
"admin_count_landing_locations": "Landing locations",
"admin_trigger_sync": "Trigger incremental sync",
"admin_triggering": "Triggering...",
"admin_sync_state": "Sync state",
"admin_no_state": "No sync state recorded yet.",
"admin_th_resource": "Resource",
"admin_th_status": "Status",
"admin_th_last_full": "Last full sync",
"admin_th_last_incremental": "Last incremental sync",
"admin_th_error": "Error"
```

### Step 3: Update each page

For each detail/stats/admin page, replace literal English with `{m.<key>()}`. Example for `launches/[slug]/+page.svelte`:

```svelte
<!-- before -->
<h2>Boosters</h2>

<!-- after -->
<h2>{m.detail_section_boosters()}</h2>
```

Walk through every file in the audit step. Don't skip any — Task 10's CI will fail otherwise.

For the {shown}/{total} parameterized message (`launchpad_recent_note`), invoke as `m.launchpad_recent_note({ shown: data.launches.length, total: counts.total })`. Paraglide handles named-parameter interpolation automatically.

### Step 4: Backfill translations

If you used DeepL (Task 5): re-run `npm run seed:translations` to translate the new keys for all 6 locales. Or add manual translations.

If you used placeholders (Task 6 path B): copy the new keys into all 6 placeholder files (English text — they'll match the banner's "needs review" caveat).

### Step 5: Verify

```bash
npm run check
npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
npm run dev -- --port 5173 &
sleep 6
# A few smoke checks:
curl -s http://localhost:5173/boosters/B1067 | grep -E 'Flight #|Boosters' | head -3
curl -s http://localhost:5173/de/launches/falcon-heavy-viasat-3-f3-viasat-3-asia-pacific | head -50 | grep -i mission
pkill -f 'vite dev' 2>/dev/null
```

### Step 6: Commit

```bash
git add messages/*.json src/routes/
git commit -m "Sweep detail-page inline English into Paraglide keys"
```

---

## Task 10: i18n-validate.yml CI workflow

**Goal**: PRs that introduce new keys must include translations for ALL 7 locales (or the workflow fails). Lightweight script that diffs key sets across locale files.

**Files:**
- Create: `scripts/validate-locales.ts`
- Create: `.github/workflows/i18n-validate.yml`
- Modify: `package.json` (add `validate:locales` script)

### Step 1: validate-locales.ts

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const messagesDir = 'messages';
const baseLocale = 'en';

function readLocaleKeys(locale: string): Set<string> {
	const path = join(messagesDir, `${locale}.json`);
	const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
	const out = new Set<string>();
	for (const k of Object.keys(data)) {
		if (k.startsWith('$')) continue; // $schema and other meta
		out.add(k);
	}
	return out;
}

function listLocales(): string[] {
	return readdirSync(messagesDir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace(/\.json$/, ''));
}

function main() {
	const locales = listLocales();
	if (!locales.includes(baseLocale)) {
		console.error(`Base locale ${baseLocale} not found in ${messagesDir}/`);
		process.exit(1);
	}
	const baseKeys = readLocaleKeys(baseLocale);
	let problems = 0;
	for (const locale of locales) {
		if (locale === baseLocale) continue;
		const keys = readLocaleKeys(locale);
		const missing = [...baseKeys].filter((k) => !keys.has(k));
		const extra = [...keys].filter((k) => !baseKeys.has(k));
		if (missing.length === 0 && extra.length === 0) {
			console.log(`✓ ${locale}: ${keys.size} keys, all present`);
			continue;
		}
		problems += missing.length + extra.length;
		if (missing.length > 0) {
			console.error(`✗ ${locale}: missing ${missing.length} key(s):`);
			for (const k of missing) console.error(`    - ${k}`);
		}
		if (extra.length > 0) {
			console.error(`✗ ${locale}: ${extra.length} extra key(s) not in ${baseLocale}:`);
			for (const k of extra) console.error(`    + ${k}`);
		}
	}
	if (problems > 0) {
		console.error(`\nTotal problems: ${problems}`);
		process.exit(1);
	}
	console.log(`\nAll ${locales.length} locales consistent (${baseKeys.size} keys each).`);
}

main();
```

### Step 2: package.json script

Add to `scripts`:

```json
"validate:locales": "node --import tsx scripts/validate-locales.ts"
```

### Step 3: i18n-validate.yml workflow

```yaml
name: i18n Validate

on:
  pull_request:
    paths:
      - 'messages/**'
      - 'project.inlang/**'
  push:
    branches: [main]
    paths:
      - 'messages/**'
      - 'project.inlang/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run validate:locales
```

### Step 4: Verify locally

```bash
npm run validate:locales
```

Expected output: `✓ es: NN keys, all present` for all 6 non-English locales, then a summary line. Exit 0.

If you skipped Task 5/6 properly, this should pass; if there's a mismatch, fix `messages/*.json` until all are aligned.

### Step 5: Commit

```bash
git add scripts/validate-locales.ts package.json .github/workflows/i18n-validate.yml
git commit -m "Add i18n-validate.yml CI: enforce all locales have all keys"
```

---

## Task 11: /translate page

**Goal**: a public page at `/translate` (and `/de/translate`, etc.) that shows per-locale completion percentages and links to Inlang Fink and Crowdin.

**Files:**
- Create: `src/routes/[[locale=locale]]/translate/+page.server.ts`
- Create: `src/routes/[[locale=locale]]/translate/+page.svelte`
- Modify: `messages/*.json` (add page-specific keys)

### Step 1: i18n keys

Add to `messages/en.json`:

```json
"translate_page_title": "Translate Booster Tracker",
"translate_page_subtitle": "Help make this site readable in your language.",
"translate_intro": "Booster Tracker is open source and translated by the community. Two paths are available — both result in PRs against the same message files in the GitHub repo.",
"translate_inlang_heading": "Inlang Fink",
"translate_inlang_body": "Inlang Fink is a web-based translation editor that pulls strings directly from this repository and submits PRs.",
"translate_inlang_cta": "Open in Fink",
"translate_crowdin_heading": "Crowdin",
"translate_crowdin_body": "Crowdin is a translation platform with a richer editor, glossary, and translation memory. Recommended for translators who already have a Crowdin account.",
"translate_crowdin_cta": "Open in Crowdin",
"translate_completion_heading": "Completion by locale",
"translate_completion_keys": "{translated} of {total} keys"
```

(And translate them into each locale.)

### Step 2: Load function

`src/routes/[[locale=locale]]/translate/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '$lib/i18n/locale-meta';

const messagesDir = 'messages';
const baseLocale = 'en';

type Completion = { code: string; total: number; translated: number; percentage: number };

function readKeys(locale: string): Set<string> {
	const data = JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as Record<
		string,
		unknown
	>;
	const out = new Set<string>();
	for (const k of Object.keys(data)) if (!k.startsWith('$')) out.add(k);
	return out;
}

function readMessages(locale: string): Record<string, string> {
	return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));
}

export const load: PageServerLoad = () => {
	const baseKeys = readKeys(baseLocale);
	const baseMessages = readMessages(baseLocale);

	const completions: Completion[] = [];
	for (const meta of LOCALES) {
		const code = meta.code;
		if (code === baseLocale) {
			completions.push({ code, total: baseKeys.size, translated: baseKeys.size, percentage: 100 });
			continue;
		}
		try {
			const messages = readMessages(code);
			let translated = 0;
			for (const k of baseKeys) {
				const v = messages[k];
				// Count "translated" only when the value is non-empty AND differs from
				// the English source (a placeholder copy that matches en doesn't count).
				if (v && v !== baseMessages[k]) translated += 1;
			}
			completions.push({
				code,
				total: baseKeys.size,
				translated,
				percentage: Math.round((translated / baseKeys.size) * 100)
			});
		} catch {
			completions.push({ code, total: baseKeys.size, translated: 0, percentage: 0 });
		}
	}

	return { completions };
};
```

### Step 3: Page component

`src/routes/[[locale=locale]]/translate/+page.svelte`:

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n/runtime';
	import { getLocaleMeta } from '$lib/i18n/locale-meta';

	let { data }: { data: PageData } = $props();

	const finkUrl = 'https://fink.inlang.com/github.com/ajthom90/booster-tracker';
	const crowdinUrl = 'https://crowdin.com/project/booster-tracker';
</script>

<svelte:head><title>{m.translate_page_title()} · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>{m.translate_page_title()}</h1>
	<p class="subtitle">{m.translate_page_subtitle()}</p>
</header>

<section class="intro">
	<p>{m.translate_intro()}</p>
</section>

<section class="paths">
	<div class="path-card">
		<h2>{m.translate_inlang_heading()}</h2>
		<p>{m.translate_inlang_body()}</p>
		<a class="cta" href={finkUrl} rel="external noopener" target="_blank">{m.translate_inlang_cta()} →</a>
	</div>
	<div class="path-card">
		<h2>{m.translate_crowdin_heading()}</h2>
		<p>{m.translate_crowdin_body()}</p>
		<a class="cta" href={crowdinUrl} rel="external noopener" target="_blank">{m.translate_crowdin_cta()} →</a>
	</div>
</section>

<section>
	<h2>{m.translate_completion_heading()}</h2>
	<ul class="completion">
		{#each data.completions as c (c.code)}
			{@const meta = getLocaleMeta(c.code)}
			<li>
				<span class="locale-name">
					<strong>{meta?.nativeLabel ?? c.code}</strong>
					<span class="muted">— {meta?.label ?? c.code}</span>
				</span>
				<span class="bar" aria-label="{c.percentage}% complete">
					<span class="fill" style="--p: {c.percentage}%"></span>
				</span>
				<span class="counts">
					{m.translate_completion_keys({ translated: c.translated, total: c.total })}
					({c.percentage}%)
				</span>
			</li>
		{/each}
	</ul>
</section>

<style>
	.page-header { padding-block-end: var(--space-3); }
	.subtitle { color: var(--text-muted); margin-block-start: 0.25rem; }
	.intro p { max-inline-size: 60ch; }
	.paths {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		padding-block: var(--space-4);
	}
	.path-card {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-4);
	}
	h2 {
		font-size: 1rem;
		margin-block: 0 var(--space-2);
	}
	.cta {
		display: inline-block;
		margin-block-start: var(--space-3);
		color: var(--accent);
		text-decoration: none;
		font-weight: 600;
	}
	.cta:hover { text-decoration: underline; }
	.completion {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.completion li {
		display: grid;
		grid-template-columns: 12rem 1fr 12rem;
		gap: var(--space-3);
		align-items: center;
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding-block: var(--space-2);
		padding-inline: var(--space-3);
	}
	.muted { color: var(--text-muted); font-weight: 400; }
	.bar {
		display: block;
		block-size: 8px;
		background: var(--surface);
		border-radius: 4px;
		overflow: hidden;
	}
	.fill {
		display: block;
		block-size: 100%;
		inline-size: var(--p);
		background: var(--accent);
	}
	.counts {
		font-size: 0.85rem;
		color: var(--text-muted);
		text-align: end;
		font-variant-numeric: tabular-nums;
	}
	@media (width <= 640px) {
		.paths { grid-template-columns: 1fr; }
		.completion li {
			grid-template-columns: 1fr;
			gap: var(--space-1);
		}
		.counts { text-align: start; }
	}
</style>
```

### Step 4: Verify

```bash
npm run check
npm run dev -- --port 5173 &
sleep 6
curl -s -o /dev/null -w "/translate=%{http_code}\n" http://localhost:5173/translate
curl -s -o /dev/null -w "/de/translate=%{http_code}\n" http://localhost:5173/de/translate
pkill -f 'vite dev' 2>/dev/null
```

Both 200.

### Step 5: Commit

```bash
git add 'src/routes/[[locale=locale]]/translate/' messages/*.json
git commit -m "Add /translate page with completion bars and Fink/Crowdin links"
```

---

## Task 12: Crowdin sync workflow

**Goal**: scheduled GH Action that pulls translation updates from Crowdin and opens a PR with the diff. Reverse direction: pushes new English source strings up to Crowdin.

**Files:**
- Create: `crowdin.yml` (Crowdin's per-project source-map config)
- Create: `.github/workflows/crowdin-sync.yml`

### Step 1: crowdin.yml

```yaml
project_id_env: CROWDIN_PROJECT_ID
api_token_env: CROWDIN_PERSONAL_TOKEN
preserve_hierarchy: true
files:
  - source: /messages/en.json
    translation: /messages/%two_letters_code%.json
    type: json
    languages_mapping:
      two_letters_code:
        zh-Hans: zh-Hans
```

(The `languages_mapping` overrides Crowdin's default `zh` → `zh-CN` codes; we want our `zh-Hans.json` filename preserved.)

### Step 2: workflow

```yaml
name: Crowdin Sync

on:
  schedule:
    - cron: '0 6 * * *'  # daily at 06:00 UTC
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: crowdin/github-action@v2
        with:
          upload_sources: true
          upload_translations: false
          download_translations: true
          localization_branch_name: l10n_main
          create_pull_request: true
          pull_request_title: 'chore(l10n): sync translations from Crowdin'
          pull_request_body: 'Automated translation sync from Crowdin.'
          pull_request_base_branch_name: main
          config: 'crowdin.yml'
        env:
          CROWDIN_PROJECT_ID: ${{ secrets.CROWDIN_PROJECT_ID }}
          CROWDIN_PERSONAL_TOKEN: ${{ secrets.CROWDIN_PERSONAL_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The workflow needs two repo secrets: `CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN`. **You set these via the GitHub repo Settings → Secrets and variables → Actions** after creating the Crowdin project at https://crowdin.com/. Until those secrets exist, the workflow will fail at the `crowdin/github-action` step — that's expected and not blocking for the rest of Phase 3.

### Step 3: Verify YAML

```bash
node -e "const yaml=require('yaml'); yaml.parse(require('fs').readFileSync('.github/workflows/crowdin-sync.yml','utf8')); yaml.parse(require('fs').readFileSync('crowdin.yml','utf8')); console.log('YAML OK')"
```

### Step 4: Commit

```bash
git add crowdin.yml .github/workflows/crowdin-sync.yml
git commit -m "Add Crowdin sync workflow (daily; opens PRs against main)"
```

---

## Task 13: Stylelint hardening

**Goal**: graduate from the existing 4-pattern restriction to a global ban on physical CSS properties.

**Files:**
- Modify: `.stylelintrc.json`

### Step 1: Update config

Replace `.stylelintrc.json` with:

```json
{
	"extends": ["stylelint-config-standard"],
	"rules": {
		"property-disallowed-list": [
			[
				"/^margin-(left|right)$/",
				"/^padding-(left|right)$/",
				"/^border-(left|right)/",
				"/^inset-(left|right)$/",
				"left",
				"right",
				"float",
				"clear"
			],
			{
				"message": "Use logical properties (margin-inline-*, padding-inline-*, border-inline-*, inset-inline-*) instead. Avoid 'left'/'right'/'float'/'clear' which are not direction-agnostic."
			}
		],
		"declaration-property-value-disallowed-list": {
			"text-align": ["left", "right"]
		}
	},
	"overrides": [
		{
			"files": ["**/*.svelte", "**/*.html"],
			"customSyntax": "postcss-html"
		}
	]
}
```

### Step 2: Run lint and address any new violations

```bash
npm run lint
```

If new violations appear in code we already wrote (Phase 1–2), fix them — the codebase is meant to be all-logical-properties already, so this should be a no-op or trivial.

If a specific rule needs a one-off allowance (e.g., a chart library's stylesheet that uses `left`), add a `stylelint-disable-next-line` comment with a clear reason, like the existing `LaunchStatusBadge.svelte` pattern.

### Step 3: Commit

```bash
git add .stylelintrc.json
git commit -m "Stylelint: ban physical CSS properties globally"
```

---

## Phase 3 acceptance checklist

- [ ] All 7 locales have `messages/<code>.json` files with all keys present (validate via `npm run validate:locales`)
- [ ] `/de/boosters`, `/ar/boosters`, `/he/boosters`, `/zh-Hans/stats`, etc. all return 200
- [ ] `<html>` carries the right `lang` and `dir` per locale (curl + grep)
- [ ] Language switcher visible in the header; clicking a language navigates to `/<code>/<current-path>`
- [ ] "Machine-translated" banner visible only on non-English pages
- [ ] `/translate` page renders with completion bars for all 7 locales
- [ ] `i18n-validate.yml` workflow passes locally via `npm run validate:locales`
- [ ] `crowdin-sync.yml` and `crowdin.yml` parse as valid YAML (the workflow itself fails until repo secrets are added — that's expected)
- [ ] `npm run lint` clean (post-stylelint hardening)
- [ ] `npm test` shows ~78–84 tests passing (depending on Task 9 sweep additions)
- [ ] `npm run check` 0 errors
- [ ] Docker image still builds: `docker build -t booster-tracker:dev -f docker/Dockerfile .`
- [ ] RTL visual check: visit `/ar/boosters` and confirm columns/icons mirror naturally (arrows flip, padding mirrors); table content is the same data, just reading right-to-left

## Notes for follow-up after Phase 3

- Add Crowdin project + Inlang Fink configuration on the hosted side; add secrets to GitHub. (Both are out-of-app; not code.)
- Capture community translation contributions via Fink+Crowdin → PRs → merged.
- Replace machine-translated values with human translations as PRs land. The "needs review" banner can be conditionally hidden once a locale crosses, say, 90% human-reviewed (out of scope for Phase 3).
- Consider a per-page `og:locale` and `og:locale:alternate` meta tag for SEO across locales (one-line addition in `+layout.svelte`).
