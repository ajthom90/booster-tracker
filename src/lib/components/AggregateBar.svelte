<script lang="ts">
	import { m, formatNumber } from '$lib/i18n/runtime';
	import type { BoosterAggregates } from '$lib/server/boosters/aggregates';

	let {
		aggregates,
		total,
		filtered
	}: { aggregates: BoosterAggregates; total: number; filtered: number } = $props();

	let successPct = $derived((aggregates.successRate * 100).toFixed(1));
	let avgFlights = $derived(aggregates.avgFlights.toFixed(1));
</script>

<div class="aggbar" role="group" aria-label="Aggregate stats">
	<div class="stat">
		<div class="stat-label">{m.agg_showing()}</div>
		<div class="stat-value">
			<span class="stat-num">{formatNumber(filtered)}</span>
			<span class="stat-denom">/ {formatNumber(total)}</span>
		</div>
	</div>
	<div class="stat">
		<div class="stat-label">{m.agg_avg_flights()}</div>
		<div class="stat-value">
			<span class="stat-num">{avgFlights}</span>
		</div>
	</div>
	<div class="stat">
		<div class="stat-label">{m.agg_total_landings()}</div>
		<div class="stat-value">
			<span class="stat-num">{formatNumber(aggregates.totalLandings)}</span>
		</div>
	</div>
	<div class="stat">
		<div class="stat-label">{m.agg_landing_success_rate()}</div>
		<div class="stat-value">
			<span class="stat-num">{successPct}<span class="stat-unit">%</span></span>
		</div>
	</div>
</div>

<style>
	.aggbar {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-3);
		margin-block: var(--space-4);
	}

	.stat {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding-block: var(--space-3);
		padding-inline: var(--space-4);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-inline-size: 0;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.stat-value {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-inline-size: 0;
	}

	.stat-num {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.stat-denom {
		font-size: 0.95rem;
		color: var(--text-soft);
		font-weight: 500;
	}

	.stat-unit {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-soft);
		margin-inline-start: 2px;
	}

	@media (width <= 640px) {
		.aggbar {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.stat-num {
			font-size: 1.45rem;
		}
	}
</style>
