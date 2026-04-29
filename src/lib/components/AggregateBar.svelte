<script lang="ts">
	import { m, formatNumber } from '$lib/i18n/runtime';
	import type { BoosterAggregates } from '$lib/server/boosters/aggregates';

	let {
		aggregates,
		total,
		filtered
	}: { aggregates: BoosterAggregates; total: number; filtered: number } = $props();
</script>

<div class="aggbar">
	<span><strong>{formatNumber(filtered)}</strong> / {formatNumber(total)}</span>
	<span>· {m.agg_avg_flights()}: <strong>{aggregates.avgFlights.toFixed(1)}</strong></span>
	<span>· {m.agg_total_landings()}: <strong>{formatNumber(aggregates.totalLandings)}</strong></span>
	<span
		>· {m.agg_landing_success_rate()}:
		<strong>{(aggregates.successRate * 100).toFixed(1)}%</strong></span
	>
</div>

<style>
	.aggbar {
		position: sticky;
		inset-block-start: 0;
		z-index: 5;
		background: #f8fafc;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
