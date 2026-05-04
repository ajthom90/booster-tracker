<script lang="ts">
	import type { PageData } from './$types';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatDate, formatNumber, localizedPath } from '$lib/i18n/runtime';
	import LaunchStatusBadge from '$lib/components/LaunchStatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	let pad = $derived(data.pad);
	let counts = $derived(data.counts);
	let decided = $derived((counts.successes ?? 0) + (counts.failures ?? 0));
	let successRate = $derived(decided === 0 ? 0 : (counts.successes ?? 0) / decided);

	function launchHref(slug: string): ResolvedPathname {
		return localizedPath(data.locale, `/launches/${slug}`) as ResolvedPathname;
	}
</script>

<svelte:head><title>{pad.name} · {m.site_title()}</title></svelte:head>

<header class="header">
	<div class="header-text">
		{#if pad.fullName && pad.fullName !== pad.name}
			<span class="eyebrow">{pad.fullName}</span>
		{/if}
		<h1>{pad.name}</h1>
		<p class="location">
			{pad.location ?? '—'}
			{#if pad.countryCode}
				<span class="country">{pad.countryCode}</span>
			{/if}
		</p>
	</div>
</header>

<section class="stats-grid">
	<div class="stat-tile">
		<div class="stat-label">Total launches</div>
		<div class="stat-value">{formatNumber(counts.total ?? 0)}</div>
	</div>
	<div class="stat-tile">
		<div class="stat-label">Successes</div>
		<div class="stat-value">{formatNumber(counts.successes ?? 0)}</div>
	</div>
	<div class="stat-tile">
		<div class="stat-label">Success rate</div>
		<div class="stat-value">{(successRate * 100).toFixed(1)}%</div>
	</div>
</section>

<section>
	<h2>Recent launches</h2>
	{#if data.launches.length === 0}
		<p class="empty">No launches at this pad yet.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Mission</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.launches as l (l.id)}
						<tr>
							<td class="date">{formatDate(l.net)}</td>
							<td><a class="mission-link" href={launchHref(l.slug)}>{l.name}</a></td>
							<td><LaunchStatusBadge status={l.status} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if (counts.total ?? 0) > data.launches.length}
			<p class="note">
				Showing the {data.launches.length} most recent launches of {counts.total} total.
			</p>
		{/if}
	{/if}
</section>

<style>
	.header {
		padding-block: var(--space-4);
	}

	.eyebrow {
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		font-weight: 700;
		margin-block-end: var(--space-2);
	}

	h1 {
		font-size: 1.875rem;
		line-height: 1.2;
		margin-block: 0;
	}

	.location {
		color: var(--text-muted);
		margin-block-start: var(--space-2);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.country {
		display: inline-block;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding-block: 1px;
		padding-inline: 6px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--text);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
		padding-block: var(--space-3);
	}

	.stat-tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}

	.stat-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-block-start: 0.25rem;
	}

	section {
		padding-block: var(--space-4);
	}

	h2 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-block-end: var(--space-3);
	}

	.empty {
		color: var(--text-muted);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-elevated);
		box-shadow: var(--shadow-sm);
	}

	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		border-block-end: 1px solid var(--border);
		text-align: start;
	}

	th {
		background: var(--surface);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	tbody tr:hover {
		background: var(--row-hover);
	}

	.date {
		color: var(--text-muted);
		white-space: nowrap;
	}

	a.mission-link {
		color: var(--accent);
		text-decoration: none;
	}

	a.mission-link:hover {
		text-decoration: underline;
	}

	.note {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-block-start: var(--space-3);
	}

	@media (width <= 720px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
