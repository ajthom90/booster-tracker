<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatNumber } from '$lib/i18n/runtime';
	import ChartCard from '$lib/components/ChartCard.svelte';

	let { data }: { data: PageData } = $props();

	const accent = '#ff6a13';
	const accentLight = 'rgba(255,106,19,0.18)';
	const muted = '#94a3b8';

	const launchesPerYearConfig = $derived({
		type: 'bar' as const,
		data: {
			labels: data.perYear.map((r) => r.year),
			datasets: [
				{
					label: 'Launches',
					data: data.perYear.map((r) => r.count),
					backgroundColor: accent,
					borderRadius: 4
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
				x: { grid: { display: false } }
			}
		}
	});

	const perMonthConfig = $derived({
		type: 'line' as const,
		data: {
			labels: data.perMonth.map((r) => r.month),
			datasets: [
				{
					label: 'Launches',
					data: data.perMonth.map((r) => r.count),
					borderColor: accent,
					backgroundColor: accentLight,
					fill: true,
					tension: 0.4,
					pointRadius: 0,
					borderWidth: 2
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
				x: { grid: { display: false } }
			}
		}
	});

	const rollingConfig = $derived({
		type: 'line' as const,
		data: {
			labels: data.rolling.map((r) => r.monthEnd),
			datasets: [
				{
					label: 'Success rate',
					data: data.rolling.map((r) => Number((r.successRate * 100).toFixed(1))),
					borderColor: accent,
					tension: 0.3,
					pointRadius: 0,
					borderWidth: 2
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				y: {
					min: 0,
					max: 100,
					ticks: { callback: (v: string | number) => `${v}%` },
					grid: { color: 'rgba(0,0,0,0.05)' }
				},
				x: { grid: { display: false } }
			}
		}
	});

	const histogramConfig = $derived({
		type: 'bar' as const,
		data: {
			labels: data.histogram.map((r) => `${r.flights}`),
			datasets: [
				{
					label: 'Boosters',
					data: data.histogram.map((r) => r.boosters),
					backgroundColor: muted,
					borderRadius: 4
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
				x: {
					title: { display: true, text: 'Flights' },
					grid: { display: false }
				}
			}
		}
	});

	function boosterHref(serial: string): ResolvedPathname {
		return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
	}
</script>

<svelte:head><title>Stats · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>Stats</h1>
	<p class="subtitle">Fleet-wide aggregates and trends.</p>
</header>

<section class="glance-grid">
	<div class="tile">
		<div class="label">Total boosters</div>
		<div class="value">{formatNumber(data.glance.totalBoosters)}</div>
	</div>
	<div class="tile">
		<div class="label">Active</div>
		<div class="value">{formatNumber(data.glance.activeBoosters)}</div>
	</div>
	<div class="tile">
		<div class="label">Total launches</div>
		<div class="value">{formatNumber(data.glance.totalLaunches)}</div>
	</div>
	<div class="tile">
		<div class="label">Landing success rate</div>
		<div class="value">{(data.glance.landingSuccessRate * 100).toFixed(1)}%</div>
	</div>
</section>

<section class="charts-grid">
	<ChartCard title="Launches per year" config={launchesPerYearConfig} />
	<ChartCard title="Launches per month (last 24)" config={perMonthConfig} />
	<ChartCard title="Rolling 12-month landing success rate" config={rollingConfig} />
	<ChartCard title="Booster flight-count distribution" config={histogramConfig} />
</section>

<section class="records-section">
	<h2>Records</h2>
	<ul class="records">
		{#if data.records.mostFlownBooster}
			<li>
				<span class="record-label">Most-flown booster</span>
				<span class="record-value">
					<a class="mono" href={boosterHref(data.records.mostFlownBooster.serial)}>
						{data.records.mostFlownBooster.serial}
					</a>
					— {data.records.mostFlownBooster.flights} flights
				</span>
			</li>
		{/if}
		{#if data.records.mostUsedLaunchpad}
			<li>
				<span class="record-label">Most-used launchpad</span>
				<span class="record-value">
					{data.records.mostUsedLaunchpad.name} — {data.records.mostUsedLaunchpad.total} launches
				</span>
			</li>
		{/if}
		{#if data.records.mostUsedDroneship}
			<li>
				<span class="record-label">Most-used droneship</span>
				<span class="record-value">
					{data.records.mostUsedDroneship.name} — {data.records.mostUsedDroneship.successes} successful
					landings
				</span>
			</li>
		{/if}
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

	.glance-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
		margin-block: var(--space-4);
	}

	.tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}

	.label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-block-start: 0.25rem;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	.records-section {
		padding-block: var(--space-5);
	}

	h2 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-block-end: var(--space-3);
	}

	.records {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.records li {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.record-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		font-weight: 600;
	}

	.record-value {
		color: var(--text);
	}

	.mono {
		font-family: var(--font-mono);
		color: var(--accent);
		text-decoration: none;
		font-weight: 700;
	}

	.mono:hover {
		text-decoration: underline;
	}

	@media (width <= 640px) {
		.glance-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
