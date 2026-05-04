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
					<button class:active={loc.code === activeLocale} onclick={() => pickLocale(loc.code)}>
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
		box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
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
