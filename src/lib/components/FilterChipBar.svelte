<script lang="ts">
	import { m, resolveLabel } from '$lib/i18n/runtime';
	import type { FilterClause } from '$lib/url-state';
	import type { ColumnDef } from '$lib/server/boosters/columns';

	let {
		columns,
		filters,
		onChange
	}: {
		columns: readonly ColumnDef[];
		filters: FilterClause[];
		onChange: (next: FilterClause[]) => void;
	} = $props();

	let pickerOpen = $state(false);

	function removeAt(i: number) {
		const next = filters.slice();
		next.splice(i, 1);
		onChange(next);
	}

	function addFilter(col: ColumnDef) {
		pickerOpen = false;
		if (!col.filter) return;
		let initial: FilterClause;
		switch (col.filter.kind) {
			case 'enum':
				initial = { id: col.id, op: 'in', value: [col.filter.options[0]] };
				break;
			case 'numberRange':
				initial = { id: col.id, op: 'gte', value: 0 };
				break;
			case 'dateRange':
				initial = { id: col.id, op: 'gte', value: '2020-01-01' };
				break;
			case 'text':
				initial = { id: col.id, op: 'contains', value: '' };
				break;
			case 'boolean':
				initial = { id: col.id, op: 'eq', value: true };
				break;
		}
		onChange([...filters, initial]);
	}

	function updateAt(i: number, patch: Partial<FilterClause>) {
		const next = filters.slice();
		next[i] = { ...next[i], ...patch };
		onChange(next);
	}

	function describeColumn(id: string) {
		const col = columns.find((c) => c.id === id);
		const label = col?.label ?? id;
		return resolveLabel(label);
	}
</script>

<div class="chips">
	{#each filters as filter, i (i)}
		{@const col = columns.find((c) => c.id === filter.id)}
		<span class="chip">
			<span class="chip-label">{describeColumn(filter.id)}</span>
			{#if col?.filter?.kind === 'enum'}
				<select
					value={Array.isArray(filter.value) ? filter.value[0] : filter.value}
					onchange={(e) => updateAt(i, { value: [(e.currentTarget as HTMLSelectElement).value] })}
				>
					{#each col.filter.options as opt (opt)}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
			{:else if col?.filter?.kind === 'numberRange'}
				<select
					value={filter.op}
					onchange={(e) => updateAt(i, { op: (e.currentTarget as HTMLSelectElement).value })}
				>
					<option value="eq">=</option>
					<option value="gte">≥</option>
					<option value="lte">≤</option>
				</select>
				<input
					type="number"
					value={filter.value as number}
					oninput={(e) =>
						updateAt(i, { value: Number((e.currentTarget as HTMLInputElement).value) })}
				/>
			{:else if col?.filter?.kind === 'text'}
				<input
					type="text"
					value={filter.value as string}
					placeholder={m.filter_placeholder_search()}
					oninput={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{:else if col?.filter?.kind === 'dateRange'}
				<input
					type="date"
					value={filter.value as string}
					oninput={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{/if}
			<button class="x" onclick={() => removeAt(i)} aria-label="remove">×</button>
		</span>
	{/each}

	<button class="add" onclick={() => (pickerOpen = !pickerOpen)}>{m.btn_add_filter()}</button>
	{#if pickerOpen}
		<div class="picker">
			{#each columns.filter((c) => !!c.filter && !filters.some((f) => f.id === c.id)) as col (col.id)}
				<button onclick={() => addFilter(col)}>{resolveLabel(col.label)}</button>
			{/each}
		</div>
	{/if}

	{#if filters.length > 0}
		<button class="clear" onclick={() => onChange([])}>{m.btn_clear_filters()}</button>
	{/if}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding-block: 0.5rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		padding-inline: 0.5rem;
		padding-block: 0.25rem;
		font-size: 0.875rem;
	}

	.chip-label {
		font-weight: 500;
	}

	.chip select,
	.chip input {
		font: inherit;
		padding: 0.125rem 0.25rem;
	}

	.x,
	.add,
	.clear {
		font-family: inherit;
		cursor: pointer;
	}

	.x {
		background: transparent;
		border: 0;
		font-size: 1rem;
		line-height: 1;
	}

	.add,
	.clear {
		background: white;
		border: 1px solid #cbd5e1;
		padding-block: 0.25rem;
		padding-inline: 0.75rem;
		border-radius: 999px;
		font-size: 0.875rem;
	}

	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}

	.picker button {
		background: transparent;
		border: 0;
		text-align: start;
		padding: 0.25rem;
		cursor: pointer;
	}

	.picker button:hover {
		background: #f1f5f9;
	}
</style>
