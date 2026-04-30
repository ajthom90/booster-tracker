<script lang="ts">
	import type { PageData } from './$types';
	import { m, formatDate, formatDaysSince, formatNumber } from '$lib/i18n/runtime';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	let b = $derived(data.booster);
	let imageFailed = $state(false);
	let imageOk = $derived(!!b.imageUrl && !imageFailed);

	function landingCellText(h: (typeof data.history)[number]) {
		if (h.landingAttempted == null) return '—';
		if (h.landingAttempted === false) return m.detail_landing_not_attempted();
		if (h.landingSuccess)
			return h.landingLocationAbbrev ?? h.landingLocationName ?? m.detail_landing_ok();
		return m.detail_landing_failed();
	}

	function landingCellClass(h: (typeof data.history)[number]) {
		if (h.landingAttempted == null) return 'land-none';
		if (h.landingAttempted === false) return 'land-none';
		if (h.landingSuccess) return 'land-ok';
		return 'land-fail';
	}

	let daysSince = $derived(formatDaysSince(b.lastLaunchDate));
</script>

<svelte:head><title>{b.serialNumber} · {m.site_title()}</title></svelte:head>

<header class="detail-header">
	<div class="detail-image">
		{#if imageOk && b.imageUrl}
			<img
				src={b.imageUrl}
				alt={b.serialNumber}
				onerror={() => (imageFailed = true)}
				loading="lazy"
			/>
		{:else}
			<div class="image-placeholder" aria-hidden="true">
				<span class="placeholder-mark">🚀</span>
				<span class="placeholder-text">{b.serialNumber}</span>
			</div>
		{/if}
	</div>
	<div class="detail-info">
		<div class="detail-eyebrow">
			{#if data.config}<span>{data.config.name}</span>{:else}<span>SpaceX booster</span>{/if}
		</div>
		<div class="detail-title-row">
			<h1 class="serial">{b.serialNumber}</h1>
			<BoosterStatusBadge status={b.status ?? 'unknown'} />
		</div>
		<dl class="meta-grid">
			<div class="meta-item">
				<dt>{m.col_flights()}</dt>
				<dd>{formatNumber(b.flights)}</dd>
			</div>
			<div class="meta-item">
				<dt>{m.col_first_launch_date()}</dt>
				<dd>{formatDate(b.firstLaunchDate) || '—'}</dd>
			</div>
			<div class="meta-item">
				<dt>{m.col_last_launch_date()}</dt>
				<dd>{formatDate(b.lastLaunchDate) || '—'}</dd>
			</div>
			<div class="meta-item">
				<dt>{m.col_days_since_last_flight()}</dt>
				<dd>{daysSince || '—'}</dd>
			</div>
		</dl>
		{#if b.details}<p class="details">{b.details}</p>{/if}
	</div>
</header>

<section class="panel">
	<h2>{m.detail_landing_breakdown()}</h2>
	{#if data.landingBreakdown.length === 0}
		<p class="empty">—</p>
	{:else}
		<div class="landing-grid">
			{#each data.landingBreakdown as row (row.locationName ?? '_unknown')}
				{@const successes = row.successes ?? 0}
				{@const rate = row.attempts > 0 ? successes / row.attempts : 0}
				<div class="landing-card">
					<div class="landing-loc">{row.abbrev ?? row.locationName ?? '—'}</div>
					<div class="landing-stat">
						<span class="landing-num">{successes}</span>
						<span class="landing-denom">/ {row.attempts}</span>
					</div>
					<div class="landing-rate">{(rate * 100).toFixed(0)}% success</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<section class="panel">
	<h2>{m.detail_flight_history()}</h2>
	{#if data.history.length === 0}
		<p class="empty">{m.detail_no_flights()}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="numeric">{m.detail_col_flight()}</th>
						<th>{m.detail_col_date()}</th>
						<th>{m.detail_col_mission()}</th>
						<th>{m.detail_col_pad()}</th>
						<th>{m.detail_col_role()}</th>
						<th>{m.detail_col_landing()}</th>
						<th class="numeric">{m.detail_col_turnaround()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.history as h, i (h.launchId)}
						<tr>
							<td class="numeric mono">{i + 1}</td>
							<td>{formatDate(h.launchDate)}</td>
							<td>{h.launchName}</td>
							<td class="mono">{h.launchpadName ?? '—'}</td>
							<td>{h.role || '—'}</td>
							<td>
								<span class="land-pill {landingCellClass(h)}">{landingCellText(h)}</span>
							</td>
							<td class="numeric">{h.turnaroundDays != null ? `${h.turnaroundDays}d` : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.detail-header {
		display: flex;
		gap: var(--space-5);
		align-items: stretch;
		padding-block: var(--space-4) var(--space-5);
		flex-wrap: wrap;
	}

	.detail-image img,
	.image-placeholder {
		inline-size: 200px;
		block-size: 200px;
		border-radius: var(--radius-md);
		display: block;
	}

	.detail-image img {
		object-fit: cover;
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--border);
	}

	.image-placeholder {
		background: linear-gradient(135deg, #0b1220 0%, #1e293b 100%);
		color: rgb(255 255 255 / 85%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: 1.4rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		box-shadow: var(--shadow-sm);
	}

	.placeholder-mark {
		font-size: 2rem;
		opacity: 0.6;
	}

	.placeholder-text {
		font-family: var(--font-mono);
	}

	.detail-info {
		flex: 1 1 320px;
		min-inline-size: 0;
	}

	.detail-eyebrow {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--accent-strong);
		font-weight: 600;
		margin-block-end: var(--space-2);
	}

	.detail-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
		margin-block-end: var(--space-4);
	}

	.serial {
		margin: 0;
		font-family: var(--font-mono);
		font-size: clamp(1.8rem, 4vw, 2.4rem);
		font-weight: 700;
		letter-spacing: 0.01em;
		color: var(--text);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-3);
		margin: 0;
	}

	.meta-item {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding-block: var(--space-2);
		padding-inline: var(--space-3);
	}

	.meta-item dt {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-soft);
		font-weight: 600;
	}

	.meta-item dd {
		margin: 2px 0 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text);
	}

	.details {
		margin-block-start: var(--space-4);
		color: var(--text-muted);
		max-inline-size: 65ch;
		line-height: 1.6;
	}

	.panel {
		padding-block: var(--space-5);
	}

	.panel h2 {
		margin: 0 0 var(--space-3);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.empty {
		color: var(--text-soft);
	}

	.landing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--space-3);
	}

	.landing-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding-block: var(--space-3);
		padding-inline: var(--space-4);
		box-shadow: var(--shadow-sm);
	}

	.landing-loc {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--text-soft);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.landing-stat {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-block-start: 4px;
	}

	.landing-num {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1;
	}

	.landing-denom {
		color: var(--text-soft);
		font-size: 1rem;
	}

	.landing-rate {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin-block-start: 4px;
	}

	.table-wrap {
		overflow-x: auto;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding-block: 11px;
		padding-inline: 14px;
		border-block-end: 1px solid var(--border);
		text-align: start;
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-block-end: 0;
	}

	th {
		background: var(--surface-muted);
		font-weight: 600;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-soft);
	}

	td.numeric,
	th.numeric {
		text-align: end;
		font-variant-numeric: tabular-nums;
	}

	td.mono {
		font-family: var(--font-mono);
		font-size: 0.88rem;
	}

	tbody tr:hover {
		background: var(--accent-soft);
	}

	.land-pill {
		display: inline-block;
		padding-block: 2px;
		padding-inline: 8px;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		border: 1px solid transparent;
		font-family: var(--font-mono);
	}

	.land-ok {
		background: #ecfdf5;
		color: #047857;
		border-color: #a7f3d0;
	}

	.land-fail {
		background: #fef2f2;
		color: #b91c1c;
		border-color: #fecaca;
	}

	.land-none {
		background: #f1f5f9;
		color: #64748b;
		border-color: #e2e8f0;
	}

	@media (width <= 640px) {
		.detail-image img,
		.image-placeholder {
			inline-size: 140px;
			block-size: 140px;
		}

		.serial {
			font-size: 1.6rem;
		}
	}
</style>
