<script lang="ts">
	import type { PageData } from './$types';
	import { m, formatDate, formatNumber } from '$lib/i18n/runtime';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	let b = $derived(data.booster);

	function landingCellText(h: (typeof data.history)[number]) {
		if (h.landingAttempted == null) return '—';
		if (h.landingAttempted === false) return 'Not attempted';
		if (h.landingSuccess) return h.landingLocationAbbrev ?? h.landingLocationName ?? 'OK';
		return 'Failed';
	}
</script>

<svelte:head><title>{b.serialNumber} · {m.site_title()}</title></svelte:head>

<header class="header">
	{#if b.imageUrl}
		<img src={b.imageUrl} alt={b.serialNumber} />
	{/if}
	<div>
		<h1>{b.serialNumber} <BoosterStatusBadge status={b.status ?? 'unknown'} /></h1>
		<p class="meta">
			{#if data.config}<span><strong>{data.config.name}</strong></span>{/if}
			<span>· {m.col_flights()}: {formatNumber(b.flights)}</span>
			<span>· {m.col_first_launch_date()}: {formatDate(b.firstLaunchDate)}</span>
			<span>· {m.col_last_launch_date()}: {formatDate(b.lastLaunchDate)}</span>
		</p>
		{#if b.details}<p class="details">{b.details}</p>{/if}
	</div>
</header>

<section>
	<h2>{m.detail_landing_breakdown()}</h2>
	{#if data.landingBreakdown.length === 0}
		<p>—</p>
	{:else}
		<ul>
			{#each data.landingBreakdown as row (row.locationName ?? '_unknown')}
				<li>
					{row.abbrev ?? row.locationName ?? '—'}: {row.successes ?? 0} / {row.attempts}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h2>{m.detail_flight_history()}</h2>
	{#if data.history.length === 0}
		<p>{m.detail_no_flights()}</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>#</th>
					<th>Date</th>
					<th>Mission</th>
					<th>Pad</th>
					<th>Role</th>
					<th>Landing</th>
					<th>Turnaround</th>
				</tr>
			</thead>
			<tbody>
				{#each data.history as h, i (h.launchId)}
					<tr>
						<td>{i + 1}</td>
						<td>{formatDate(h.launchDate)}</td>
						<td>{h.launchName}</td>
						<td>{h.launchpadName ?? '—'}</td>
						<td>{h.role || '—'}</td>
						<td>{landingCellText(h)}</td>
						<td>{h.turnaroundDays != null ? `${h.turnaroundDays}d` : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.header {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		padding-block: 1rem;
	}
	.header img {
		inline-size: 200px;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.5rem;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		color: #475569;
		font-size: 0.9rem;
	}
	.details {
		color: #334155;
		max-width: 60ch;
	}
	section {
		padding-block: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		padding: 0.5rem 0.75rem;
		border-block-end: 1px solid #e5e7eb;
		text-align: start;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
	}
</style>
