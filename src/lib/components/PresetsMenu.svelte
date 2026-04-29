<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';

	const STORAGE_KEY = 'boosterTracker.presets.boosters';

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
		const target = `${resolve('/boosters')}?v=${encodeURIComponent(p.v)}` as ResolvedPathname;
		goto(target);
	}

	function remove(name: string) {
		presets = presets.filter((p) => p.name !== name);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}
</script>

<div class="menu">
	<button onclick={save}>{m.btn_save_view()}</button>
	{#if presets.length > 0}
		<button onclick={() => (open = !open)}>Views ({presets.length})</button>
		{#if open}
			<ul>
				{#each presets as p (p.name)}
					<li>
						<button class="link" onclick={() => load(p)}>{p.name}</button>
						<button class="x" onclick={() => remove(p.name)}>×</button>
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
		gap: 0.5rem;
	}

	ul {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 12rem;
	}

	li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}

	button.link {
		border: 0;
		background: transparent;
		padding: 0.25rem;
		flex: 1;
		text-align: start;
	}

	button.link:hover {
		background: #f1f5f9;
	}

	button.x {
		border: 0;
		background: transparent;
	}
</style>
