<script lang="ts">
	import type { PageData } from './$types';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m, formatDate, formatDaysSince } from '$lib/i18n/runtime';
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
</script>

<svelte:head><title>{m.boosters_page_title()} · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>{m.boosters_page_title()}</h1>
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

<table>
	<thead>
		<tr>
			{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
				{@const sortInfo = data.sort.find((s) => s.id === col.id)}
				<th onclick={(e) => toggleSort(col.id, e)}>
					{col.label}
					{#if sortInfo}{sortInfo.desc ? '↓' : '↑'}{/if}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each data.rows as row (row.serialNumber)}
			<tr>
				{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
					<td>
						{#if col.id === 'serial_number'}
							{@const detailHref = (resolve('/boosters') +
								'/' +
								row.serialNumber) as ResolvedPathname}
							<a href={detailHref}>{row.serialNumber}</a>
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

{#if data.total > data.pageSize}
	<nav class="pager">
		<button disabled={data.page === 0} onclick={() => navigateWith({ page: data.page - 1 })}
			>← Prev</button
		>
		<span>Page {data.page + 1} of {Math.ceil(data.total / data.pageSize)}</span>
		<button
			disabled={(data.page + 1) * data.pageSize >= data.total}
			onclick={() => navigateWith({ page: data.page + 1 })}>Next →</button
		>
	</nav>
{/if}

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-block-end: 0.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
		margin-block-start: 0.5rem;
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
		cursor: pointer;
		user-select: none;
	}

	tbody tr:hover {
		background: #f9fafb;
	}

	.pager {
		display: flex;
		gap: 1rem;
		align-items: center;
		padding-block: 1rem;
	}

	.pager button {
		font: inherit;
		padding: 0.25rem 0.75rem;
	}
</style>
