<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';
	let { children } = $props();

	const boostersHref = resolve('/boosters');
	const homeHref = resolve('/');
	let onBoosters = $derived(page.url.pathname.startsWith('/boosters'));
</script>

<div class="app-shell">
	<header class="site-header">
		<div class="site-header-inner">
			<a href={homeHref} class="brand">
				<span class="brand-mark" aria-hidden="true">🚀</span>
				<span class="brand-text">{m.site_title()}</span>
			</a>
			<nav class="site-nav">
				<a href={boostersHref} class="nav-link" class:active={onBoosters}>{m.nav_boosters()}</a>
			</nav>
		</div>
	</header>

	<main class="site-main">
		{@render children?.()}
	</main>

	<footer class="site-footer">
		<div class="site-footer-inner">
			<span class="footer-item">
				{m.footer_data_source_prefix()}
				<a href="https://thespacedevs.com/llapi" rel="external noopener" target="_blank"
					>{m.footer_data_source_link_text()}</a
				>
			</span>
			<span class="footer-sep" aria-hidden="true">·</span>
			<a
				class="footer-item"
				href="https://github.com/ajthom90/booster-tracker"
				rel="external noopener"
				target="_blank">{m.footer_repo()}</a
			>
			<span class="footer-sep" aria-hidden="true">·</span>
			<span class="footer-item">{m.footer_built_with()}</span>
		</div>
	</footer>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-block-size: 100vh;
	}

	.site-header {
		background: linear-gradient(180deg, var(--header-bg-1) 0%, var(--header-bg-2) 100%);
		color: var(--header-text);
		border-block-end: 1px solid #0b1220;
		box-shadow: 0 1px 0 rgb(255 255 255 / 4%) inset;
	}

	.site-header-inner {
		max-inline-size: 1200px;
		margin-inline: auto;
		display: flex;
		align-items: center;
		gap: var(--space-5);
		padding-block: var(--space-3);
		padding-inline: var(--space-5);
	}

	.brand {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		color: var(--header-text);
		text-decoration: none;
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.01em;
	}

	.brand:hover {
		text-decoration: none;
	}

	.brand-mark {
		font-size: 1.2rem;
		transform: translateY(2px);
	}

	.brand-text {
		color: var(--header-text);
	}

	.site-nav {
		display: flex;
		gap: var(--space-1);
		margin-inline-start: auto;
	}

	.nav-link {
		color: var(--header-text-muted);
		text-decoration: none;
		padding-block: 6px;
		padding-inline: 12px;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.nav-link:hover {
		color: var(--header-text);
		background: rgb(255 255 255 / 6%);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--header-text);
		background: rgb(255 255 255 / 8%);
		box-shadow: inset 0 -2px 0 var(--accent);
	}

	.site-main {
		flex: 1 1 auto;
		max-inline-size: 1200px;
		inline-size: 100%;
		margin-inline: auto;
		padding-block: var(--space-6);
		padding-inline: var(--space-5);
	}

	.site-footer {
		background: var(--surface);
		border-block-start: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.site-footer-inner {
		max-inline-size: 1200px;
		margin-inline: auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		padding-block: var(--space-4);
		padding-inline: var(--space-5);
	}

	.footer-item {
		color: var(--text-muted);
	}

	.footer-sep {
		color: var(--border-strong);
	}

	@media (width <= 640px) {
		.site-header-inner {
			padding-inline: var(--space-4);
			gap: var(--space-3);
		}

		.site-main {
			padding-block: var(--space-5);
			padding-inline: var(--space-4);
		}

		.site-footer-inner {
			padding-inline: var(--space-4);
		}
	}
</style>
