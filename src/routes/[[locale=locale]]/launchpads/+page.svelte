<script lang="ts">
	import type { PageData } from './$types';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m, formatNumber, resolveLabel, localizedPath } from '$lib/i18n/runtime';
	import { encodeViewState, type FilterClause, type SortClause } from '$lib/url-state';
	import AggregateBar from '$lib/components/AggregateBar.svelte';
	import FilterChipBar from '$lib/components/FilterChipBar.svelte';
	import ColumnsMenu from '$lib/components/ColumnsMenu.svelte';
	import ExportMenu from '$lib/components/ExportMenu.svelte';
	import PresetsMenu from '$lib/components/PresetsMenu.svelte';

	type LaunchpadRow = PageData['rows'][number];

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
		const target = (localizedPath(data.locale, '/launchpads') + url.search) as ResolvedPathname;
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

	function cellValue(row: LaunchpadRow, colId: string): string {
		switch (colId) {
			case 'name':
				return ''; // rendered specially as a link
			case 'full_name':
				return row.fullName ?? '';
			case 'location':
				return row.location ?? '';
			case 'country_code':
				return row.countryCode ?? '';
			case 'total_launches':
				return formatNumber(row.totalLaunches ?? 0);
			default:
				return '';
		}
	}

	function launchpadHref(slug: string): ResolvedPathname {
		return localizedPath(data.locale, `/launchpads/${slug}`) as ResolvedPathname;
	}

	let totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head><title>{m.launchpads_page_title()} · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<div class="page-header-text">
		<h1>{m.launchpads_page_title()}</h1>
		<p class="subtitle">{m.launchpads_page_subtitle()}</p>
	</div>
	<div class="actions">
		<ExportMenu apiBase="/api/launchpads/export" />
		<ColumnsMenu
			columns={data.columns}
			visible={data.visibleCols}
			onChange={(next) => navigateWith({ visibleCols: next })}
		/>
		<PresetsMenu storageKey="launchpads" basePath="/launchpads" locale={data.locale} />
	</div>
</header>

<FilterChipBar
	columns={data.columns}
	filters={data.filters}
	onChange={(next) => navigateWith({ filters: next, page: 0 })}
/>

<AggregateBar
	tiles={[
		{ label: m.agg_showing(), value: data.aggregates.count, denom: data.total },
		{ label: m.agg_launchpads_total_launches(), value: data.aggregates.totalLaunches }
	]}
/>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
					{@const sortInfo = data.sort.find((s) => s.id === col.id)}
					<th
						onclick={(e) => toggleSort(col.id, e)}
						class:sorted={!!sortInfo}
						class:numeric={col.id === 'total_launches'}
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
			{#each data.rows as row (row.id)}
				<tr>
					{#each data.columns.filter((c) => visible.has(c.id)) as col (col.id)}
						<td class:numeric={col.id === 'total_launches'}>
							{#if col.id === 'name'}
								<a class="launchpad-link" href={launchpadHref(row.slug)}>{row.name}</a>
							{:else}
								{cellValue(row, col.id)}
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

	.launchpad-link {
		color: var(--accent);
		text-decoration: none;
	}

	.launchpad-link:hover {
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
