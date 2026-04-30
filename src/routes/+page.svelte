<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/i18n/runtime';

	const boostersHref = resolve('/boosters');
</script>

<svelte:head><title>{m.site_title()}</title></svelte:head>

<section class="hero">
	<p class="eyebrow">SpaceX flight history</p>
	<h1 class="hero-title">{m.site_title()}</h1>
	<p class="hero-tagline">{m.home_tagline()}</p>
	<div class="hero-actions">
		<a class="cta-primary" href={boostersHref}>{m.home_cta_browse()}</a>
	</div>
</section>

<style>
	.hero {
		max-inline-size: 720px;
		padding-block: var(--space-7);
	}

	.eyebrow {
		margin: 0 0 var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--accent-strong);
	}

	.hero-title {
		margin: 0 0 var(--space-4);
		font-size: clamp(2.2rem, 5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--text);
	}

	.hero-tagline {
		margin: 0 0 var(--space-5);
		font-size: 1.15rem;
		color: var(--text-muted);
		max-inline-size: 56ch;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
		margin-block-start: var(--space-5);
	}

	.cta-primary {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--accent);
		color: var(--accent-contrast);
		padding-block: 12px;
		padding-inline: 20px;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.95rem;
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition:
			background-color 120ms ease,
			transform 120ms ease,
			box-shadow 120ms ease;
	}

	.cta-primary:hover {
		background: var(--accent-strong);
		text-decoration: none;
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.cta-primary:active {
		transform: translateY(0);
	}
</style>
