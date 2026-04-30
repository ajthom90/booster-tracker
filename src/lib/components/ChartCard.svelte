<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables, type ChartConfiguration } from 'chart.js';
	Chart.register(...registerables);

	let {
		title,
		config
	}: {
		title: string;
		config: ChartConfiguration;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;

	onMount(() => {
		if (!canvas) return;
		chart = new Chart(canvas, config);
		return () => chart?.destroy();
	});
</script>

<div class="chart-card">
	<h3>{title}</h3>
	<div class="chart-wrap">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>

<style>
	.chart-card {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-4);
	}

	h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-block: 0 var(--space-3);
	}

	.chart-wrap {
		block-size: 220px;
		position: relative;
	}
</style>
