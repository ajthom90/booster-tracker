<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';
	import { m, localizedPath } from '$lib/i18n/runtime';

	let {
		storageKey = 'boosters',
		basePath = '/boosters',
		locale = 'en'
	}: {
		storageKey?: string;
		basePath?: string;
		locale?: string;
	} = $props();

	let STORAGE_KEY = $derived(`boosterTracker.presets.${storageKey}`);

	type Preset = { name: string; v: string };
	let presets: Preset[] = $state([]);
	let open = $state(false);

	onMount(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			try {
				presets = JSON.parse(raw);
			} catch {
				presets = [];
			}
		}
	});

	function save() {
		const v = page.url.searchParams.get('v') ?? '';
		if (!v) return;
		const name = prompt('Name this view');
		if (!name) return;
		presets = [...presets.filter((p) => p.name !== name), { name, v }];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}

	function load(p: Preset) {
		open = false;
		const dest = (localizedPath(locale, basePath) +
			`?v=${encodeURIComponent(p.v)}`) as ResolvedPathname;
		goto(dest);
	}

	function remove(name: string) {
		presets = presets.filter((p) => p.name !== name);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}
</script>

<div class="menu">
	<button class="menu-btn" onclick={save}>{m.btn_save_view()}</button>
	{#if presets.length > 0}
		<button class="menu-btn" onclick={() => (open = !open)}
			>{m.btn_views()} ({presets.length}) ▾</button
		>
		{#if open}
			<ul>
				{#each presets as p (p.name)}
					<li>
						<button class="link" onclick={() => load(p)}>{p.name}</button>
						<button class="x" onclick={() => remove(p.name)} aria-label="remove">×</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-flex;
		gap: var(--space-2);
	}

	ul {
		position: absolute;
		inset-block-start: calc(100% + 4px);
		inset-inline-end: 0;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		list-style: none;
		padding: 6px;
		min-inline-size: 13rem;
		box-shadow: var(--shadow-md);
		margin: 0;
		z-index: 10;
	}

	li {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		align-items: center;
	}

	.menu-btn {
		font: inherit;
		cursor: pointer;
		padding-block: 6px;
		padding-inline: 12px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.menu-btn:hover {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent-strong);
	}

	button.link {
		font: inherit;
		border: 0;
		background: transparent;
		padding-block: 6px;
		padding-inline: 8px;
		flex: 1;
		text-align: start;
		cursor: pointer;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		color: var(--text);
	}

	button.link:hover {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}

	button.x {
		font: inherit;
		border: 0;
		background: transparent;
		cursor: pointer;
		color: var(--text-soft);
		font-size: 1.05rem;
		padding: 0 6px;
	}

	button.x:hover {
		color: var(--accent-strong);
	}
</style>
