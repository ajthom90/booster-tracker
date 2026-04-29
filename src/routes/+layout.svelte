<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/i18n/runtime';
	let { children } = $props();
</script>

<header class="site-header">
	<a href={resolve('/')} class="brand">{m.site_title()}</a>
	<nav>
		<a href={resolve('/boosters')}>{m.nav_boosters()}</a>
	</nav>
</header>

<main>
	{@render children?.()}
</main>

<style>
	.site-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding-block: 0.75rem;
		padding-inline: 1.5rem;
		border-block-end: 1px solid #e5e7eb;
	}

	.brand {
		font-weight: 600;
		text-decoration: none;
		color: inherit;
	}

	nav a {
		color: inherit;
		text-decoration: none;
		margin-inline-end: 1rem;
	}

	main {
		padding: 1.5rem;
	}
</style>
