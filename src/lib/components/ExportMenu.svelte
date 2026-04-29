<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';

	let open = $state(false);

	let v = $derived(page.url.searchParams.get('v') ?? '');
	let csvHref: string = $derived(
		`/api/boosters/export?format=csv${v ? `&v=${encodeURIComponent(v)}` : ''}`
	);
	let jsonHref: string = $derived(
		`/api/boosters/export?format=json${v ? `&v=${encodeURIComponent(v)}` : ''}`
	);
</script>

<div class="menu">
	<button onclick={() => (open = !open)}>Export ▾</button>
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
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 8rem;
	}

	li a {
		display: block;
		padding: 0.25rem 0.5rem;
		color: inherit;
		text-decoration: none;
	}

	li a:hover {
		background: #f1f5f9;
	}

	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
</style>
