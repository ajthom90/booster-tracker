<script lang="ts">
	import type { PageData } from './$types';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m, formatDate, formatDaysSince, resolveLabel } from '$lib/i18n/runtime';
	import { encodeViewState, type FilterClause, type SortClause } from '$lib/url-state';
	import AggregateBar from '$lib/components/AggregateBar.svelte';
	import FilterChipBar from '$lib/components/FilterChipBar.svelte';
	import ColumnsMenu from '$lib/components/ColumnsMenu.svelte';
	import ExportMenu from '$lib/components/ExportMenu.svelte';
	import PresetsMenu from '$lib/components/PresetsMenu.svelte';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	type BoosterRow = PageData['rows'][number];

	let { data }: { data: PageData } = $props();

	function navigateWith(patch: {
		filters?: FilterClause[];
		sort?: SortClause[];
		visibleCols?: string[];
		page?: number;
	}) {
		const next = encodeViewState({
			filters: patch.filters ?? data.filters,
			sort: patch.sort ?? data.sort,
			visibleCols: patch.visibleCols ?? data.visibleCols,
			page: patch.page ?? data.page
		});
		const url = new URL(page.url);
		url.searchParams.set('v', next);
		const target = (resolve('/boosters') + url.search) as ResolvedPathname;
		goto(target, { keepFocus: true, noScroll: true });
	}

	function toggleSort(id: string, e: MouseEvent) {
		const existing = data.sort.find((s) => s.id === id);
		let next: SortClause[];
		if (e.shiftKey) {
			if (!existing) next = [...data.sort, { id, desc: false }];
			else if (!existing.desc)
				next = data.sort.map((s) => (s.id === id ? { ...s, desc: true } : s));
			else next = data.sort.filter((s) => s.id !== id);
		} else {
			if (!existing) next = [{ id, desc: false }];
			else if (!existing.desc) next = [{ id, desc: true }];
			else next = [];
		}
		navigateWith({ sort: next, page: 0 });
	}

	let visible = $derived(new Set(data.visibleCols));

	function cellValue(row: BoosterRow, colId: string) {
		switch (colId) {
			case 'serial_number':
				return row.serialNumber;
			case 'status':
				return null; // rendered specially via BoosterStatusBadge
			case 'flights':
				return row.flights;
			case 'first_launch_date':
				return formatDate(row.firstLaunchDate);
			case 'last_launch_date':
				return formatDate(row.lastLaunchDate);
			case 'days_since_last_flight':
				return formatDaysSince(row.lastLaunchDate);
			case 'successful_landings':
				return row.successfulLandings;
			case 'attempted_landings':
				return row.attemptedLandings;
			case 'block':
				return ''; // requires launcher_config join — Phase 1 leaves blank if not loaded
			default:
				return '';
		}
	}

	let totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head><title>{m.boosters_page_title()} · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<div class="page-header-text">
		<h1>{m.boosters_page_title()}</h1>
		<p class="subtitle">{m.boosters_page_subtitle()}</p>
	</div>
	<div class="actions">
		<ExportMenu />
		<ColumnsMenu
			columns={data.columns}
			visible={data.visibleCols}
			onChange={(next) => navigateWith({ visibleCols: next })}
		/>
		<PresetsMenu />
	</div>
</header>

<FilterChipBar
	columns={data.columns}
	filters={data.filters}
	onChange={(next) => navigateWith({ filters: next, page: 0 })}
/>

<AggregateBar aggregates={data.aggregates} total={data.total} filtered={data.aggregates.count} />

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
					{@const sortInfo = data.sort.find((s) => s.id === col.id)}
					<th
						onclick={(e) => toggleSort(col.id, e)}
						class:sorted={!!sortInfo}
						class:numeric={col.id === 'flights' ||
							col.id === 'successful_landings' ||
							col.id === 'attempted_landings' ||
							col.id === 'days_since_last_flight'}
					>
						<span class="th-content">
							<span class="th-label">{resolveLabel(col.label)}</span>
							<span class="th-sort" aria-hidden="true">
								{#if sortInfo}
									<span class="th-sort-active">{sortInfo.desc ? '▼' : '▲'}</span>
								{:else}
									<span class="th-sort-idle">▾</span>
								{/if}
							</span>
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (row.serialNumber)}
				<tr>
					{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
						<td
							class:numeric={col.id === 'flights' ||
								col.id === 'successful_landings' ||
								col.id === 'attempted_landings' ||
								col.id === 'days_since_last_flight'}
							class:mono={col.id === 'serial_number'}
						>
							{#if col.id === 'serial_number'}
								{@const detailHref = (resolve('/boosters') +
									'/' +
									row.serialNumber) as ResolvedPathname}
								<a class="serial-link" href={detailHref}>{row.serialNumber}</a>
							{:else if col.id === 'status'}
								<BoosterStatusBadge status={row.status ?? 'unknown'} />
							{:else}
								{cellValue(row, col.id) ?? ''}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.total > data.pageSize}
	<nav class="pager">
		<button
			class="pager-btn"
			disabled={data.page === 0}
			onclick={() => navigateWith({ page: data.page - 1 })}
		>
			← {m.btn_prev()}
		</button>
		<span class="pager-info">{m.pager_page_of({ page: data.page + 1, total: totalPages })}</span>
		<button
			class="pager-btn"
			disabled={(data.page + 1) * data.pageSize >= data.total}
			onclick={() => navigateWith({ page: data.page + 1 })}
		>
			{m.btn_next()} →
		</button>
	</nav>
{/if}

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: var(--space-4);
		flex-wrap: wrap;
		padding-block-end: var(--space-3);
		border-block-end: 1px solid var(--border);
		margin-block-end: var(--space-2);
	}

	.page-header-text h1 {
		margin: 0;
		font-size: 1.85rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text);
	}

	.subtitle {
		margin: 4px 0 0;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.actions {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
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
		padding-block: 12px;
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
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-soft);
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
		position: sticky;
		inset-block-start: 0;
		z-index: 1;
		transition: color 120ms ease;
	}

	th:hover {
		color: var(--accent-strong);
	}

	th.sorted {
		color: var(--accent-strong);
	}

	.th-content {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.th-sort {
		font-size: 0.7rem;
		display: inline-flex;
		align-items: center;
	}

	.th-sort-idle {
		color: var(--border-strong);
	}

	.th-sort-active {
		color: var(--accent-strong);
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

	.serial-link {
		color: var(--accent-strong);
		font-weight: 600;
		text-decoration: none;
	}

	.serial-link:hover {
		text-decoration: underline;
	}

	tbody tr {
		transition: background-color 80ms ease;
	}

	tbody tr:hover {
		background: var(--accent-soft);
	}

	.pager {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: flex-end;
		padding-block: var(--space-4);
	}

	.pager-info {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.pager-btn {
		font: inherit;
		cursor: pointer;
		padding-block: 6px;
		padding-inline: 14px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.pager-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pager-btn:hover:not(:disabled) {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent-strong);
	}

	@media (width <= 640px) {
		.page-header {
			align-items: flex-start;
		}

		.page-header-text h1 {
			font-size: 1.5rem;
		}
	}
</style>
