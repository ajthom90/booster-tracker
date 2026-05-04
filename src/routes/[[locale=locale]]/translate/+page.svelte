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
		<a class="cta" href={finkUrl} rel="external noopener" target="_blank"
			>{m.translate_inlang_cta()} →</a
		>
	</div>
	<div class="path-card">
		<h2>{m.translate_crowdin_heading()}</h2>
		<p>{m.translate_crowdin_body()}</p>
		<a class="cta" href={crowdinUrl} rel="external noopener" target="_blank"
			>{m.translate_crowdin_cta()} →</a
		>
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
					<span
						class="fill"
						style="

--p: {c.percentage}%"
					></span>
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
	.page-header {
		padding-block-end: var(--space-3);
	}

	.subtitle {
		color: var(--text-muted);
		margin-block-start: 0.25rem;
	}

	.intro p {
		max-inline-size: 60ch;
	}

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

	.cta:hover {
		text-decoration: underline;
	}

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

	.muted {
		color: var(--text-muted);
		font-weight: 400;
	}

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
		.paths {
			grid-template-columns: 1fr;
		}

		.completion li {
			grid-template-columns: 1fr;
			gap: var(--space-1);
		}

		.counts {
			text-align: start;
		}
	}
</style>
