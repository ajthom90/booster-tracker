<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';
	let { apiBase = '/api/boosters/export' }: { apiBase?: string } = $props();

	let open = $state(false);
	let v = $derived(page.url.searchParams.get('v') ?? '');
	let csvHref = $derived(`${apiBase}?format=csv${v ? `&v=${encodeURIComponent(v)}` : ''}`);
	let jsonHref = $derived(`${apiBase}?format=json${v ? `&v=${encodeURIComponent(v)}` : ''}`);
</script>

<div class="menu">
	<button class="menu-btn" onclick={() => (open = !open)}>{m.btn_export()} ▾</button>
	{#if open}
		<ul>
			<li><a href={csvHref} rel="external">{m.btn_export_csv()}</a></li>
			<li><a href={jsonHref} rel="external">{m.btn_export_json()}</a></li>
		</ul>
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-block;
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
		min-inline-size: 9rem;
		box-shadow: var(--shadow-md);
		margin: 0;
		z-index: 10;
	}

	li {
		padding: 0;
	}

	li a {
		display: block;
		padding-block: 6px;
		padding-inline: 8px;
		color: var(--text);
		text-decoration: none;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	li a:hover {
		background: var(--accent-soft);
		color: var(--accent-strong);
		text-decoration: none;
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
</style>
