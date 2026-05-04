<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatDate, formatNumber } from '$lib/i18n/runtime';

	let { data }: { data: PageData } = $props();
	let loc = $derived(data.location);

	let attempted = $derived(loc.attemptedLandings ?? 0);
	let successful = $derived(loc.successfulLandings ?? 0);
	let successRate = $derived(attempted === 0 ? 0 : successful / attempted);

	function launchHref(slug: string): ResolvedPathname {
		return (resolve('/launches') + '/' + slug) as ResolvedPathname;
	}
	function boosterHref(serial: string): ResolvedPathname {
		return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
	}

	function locTypeKey(t: string | null | undefined): string {
		const v = (t ?? '').toLowerCase();
		if (v.includes('drone ship') || v === 'asds') return 'asds';
		if (v.includes('return to launch') || v === 'rtls') return 'rtls';
		if (v === 'ocean' || v.includes('ocean')) return 'ocean';
		if (v === 'expended') return 'expended';
		return 'unknown';
	}
	function locTypeShortLabel(t: string | null | undefined): string {
		const v = (t ?? '').toLowerCase();
		if (v.includes('drone ship') || v === 'asds') return 'ASDS';
		if (v.includes('return to launch') || v === 'rtls') return 'RTLS';
		if (v === 'ocean' || v.includes('ocean')) return 'Ocean';
		if (v === 'expended') return 'Expended';
		return t ?? '—';
	}

	function attemptResultClass(a: (typeof data.attempts)[number]): string {
		if (a.landingAttempted == null || a.landingAttempted === false) return 'res-none';
		if (a.landingSuccess == null) return 'res-pending';
		return a.landingSuccess ? 'res-ok' : 'res-fail';
	}
	function attemptResultLabel(a: (typeof data.attempts)[number]): string {
		if (a.landingAttempted == null) return '—';
		if (a.landingAttempted === false) return 'Not attempted';
		if (a.landingSuccess == null) return 'Pending';
		return a.landingSuccess ? 'Landed' : 'Failed';
	}
</script>

<svelte:head><title>{loc.name} · {m.site_title()}</title></svelte:head>

<header class="header">
	<div class="header-text">
		<h1>
			<span class="title-text">{loc.name}</span>
			{#if loc.abbrev}<span class="abbrev mono">{loc.abbrev}</span>{/if}
		</h1>
		<div class="meta-row">
			<span class="loc-type loc-type-{locTypeKey(loc.locationType)}"
				>{locTypeShortLabel(loc.locationType)}</span
			>
			{#if loc.description}<p class="description">{loc.description}</p>{/if}
		</div>
	</div>
</header>

<section class="stats-grid">
	<div class="stat-tile">
		<div class="stat-label">Successful</div>
		<div class="stat-value">{formatNumber(successful)}</div>
	</div>
	<div class="stat-tile">
		<div class="stat-label">Attempted</div>
		<div class="stat-value">{formatNumber(attempted)}</div>
	</div>
	<div class="stat-tile">
		<div class="stat-label">Success rate</div>
		<div class="stat-value">{(successRate * 100).toFixed(1)}%</div>
	</div>
</section>

<section>
	<h2>Attempts</h2>
	{#if data.attempts.length === 0}
		<p class="empty">No landing attempts recorded at this location yet.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Mission</th>
						<th>Booster</th>
						<th>Result</th>
					</tr>
				</thead>
				<tbody>
					{#each data.attempts as a (a.launchId + '-' + a.boosterId + '-' + (a.role ?? ''))}
						<tr>
							<td class="date">{formatDate(a.launchDate)}</td>
							<td><a class="mission-link" href={launchHref(a.launchSlug)}>{a.launchName}</a></td>
							<td><a class="mono" href={boosterHref(a.boosterSerial)}>{a.boosterSerial}</a></td>
							<td>
								<span class="result {attemptResultClass(a)}">{attemptResultLabel(a)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.header {
		padding-block: var(--space-4);
	}

	h1 {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		flex-wrap: wrap;
		margin-block: 0;
	}

	.title-text {
		font-size: 1.875rem;
		line-height: 1.2;
	}

	.abbrev {
		color: var(--text-muted);
		font-size: 1rem;
		font-weight: 600;
	}

	.mono {
		font-family: var(--font-mono);
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
		margin-block-start: var(--space-3);
	}

	.description {
		color: var(--text);
		max-inline-size: 60ch;
		margin: 0;
	}

	.loc-type {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 600;
		padding-block: 0.125rem;
		padding-inline: 0.5rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border: 1px solid transparent;
	}

	.loc-type-asds {
		background: #dbeafe;
		color: #1e40af;
		border-color: #bfdbfe;
	}

	.loc-type-rtls {
		background: #fed7aa;
		color: #9a3412;
		border-color: #fdba74;
	}

	.loc-type-ocean {
		background: #f1f5f9;
		color: #475569;
		border-color: #e2e8f0;
	}

	.loc-type-expended {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}

	.loc-type-unknown {
		background: #f3f4f6;
		color: #6b7280;
		border-color: #e5e7eb;
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

	a.mono {
		color: var(--accent);
		text-decoration: none;
		font-family: var(--font-mono);
		font-weight: 700;
	}

	a.mono:hover {
		text-decoration: underline;
	}

	.result {
		display: inline-block;
		font-weight: 600;
		padding-block: 2px;
		padding-inline: 6px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.res-ok {
		background: #dcfce7;
		color: #166534;
	}

	.res-fail {
		background: #fecaca;
		color: #991b1b;
	}

	.res-pending {
		background: #dbeafe;
		color: #1e40af;
	}

	.res-none {
		background: var(--surface);
		color: var(--text-muted);
	}

	@media (width <= 720px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
