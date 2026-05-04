<script lang="ts">
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
