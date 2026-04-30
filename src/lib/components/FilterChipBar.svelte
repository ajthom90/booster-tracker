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
					class="chip-input"
					value={Array.isArray(filter.value) ? filter.value[0] : filter.value}
					onchange={(e) => updateAt(i, { value: [(e.currentTarget as HTMLSelectElement).value] })}
				>
					{#each col.filter.options as opt (opt)}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
			{:else if col?.filter?.kind === 'numberRange'}
				<select
					class="chip-input chip-op"
					value={filter.op}
					onchange={(e) => updateAt(i, { op: (e.currentTarget as HTMLSelectElement).value })}
				>
					<option value="eq">=</option>
					<option value="gte">≥</option>
					<option value="lte">≤</option>
				</select>
				<input
					class="chip-input chip-num"
					type="number"
					value={filter.value as number}
					oninput={(e) =>
						updateAt(i, { value: Number((e.currentTarget as HTMLInputElement).value) })}
				/>
			{:else if col?.filter?.kind === 'text'}
				<input
					class="chip-input"
					type="text"
					value={filter.value as string}
					placeholder={m.filter_placeholder_search()}
					oninput={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{:else if col?.filter?.kind === 'dateRange'}
				<input
					class="chip-input"
					type="date"
					value={filter.value as string}
					oninput={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{/if}
			<button class="chip-x" onclick={() => removeAt(i)} aria-label="remove">×</button>
		</span>
	{/each}

	<button class="add" onclick={() => (pickerOpen = !pickerOpen)}>+ {m.btn_add_filter()}</button>
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
		gap: var(--space-2);
		align-items: center;
		padding-block: var(--space-3);
		position: relative;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		padding-inline: 10px;
		padding-block: 4px;
		font-size: 0.85rem;
		box-shadow: var(--shadow-sm);
		transition: border-color 120ms ease;
	}

	.chip:hover {
		border-color: var(--accent);
	}

	.chip-label {
		font-weight: 600;
		color: var(--text);
	}

	.chip-input {
		font: inherit;
		font-size: 0.85rem;
		padding-block: 2px;
		padding-inline: 6px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-muted);
		color: var(--text);
	}

	.chip-input:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
		border-color: var(--accent);
	}

	.chip-num {
		inline-size: 6em;
	}

	.chip-x,
	.add,
	.clear {
		font-family: inherit;
		cursor: pointer;
	}

	.chip-x {
		background: transparent;
		border: 0;
		font-size: 1.05rem;
		line-height: 1;
		color: var(--text-soft);
		padding: 0 2px;
		border-radius: 999px;
	}

	.chip-x:hover {
		color: var(--accent-strong);
	}

	.add,
	.clear {
		background: var(--surface);
		border: 1px solid var(--border-strong);
		padding-block: 5px;
		padding-inline: 12px;
		border-radius: 999px;
		font-size: 0.85rem;
		color: var(--text);
		font-weight: 500;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.add:hover,
	.clear:hover {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent-strong);
	}

	.picker {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-start: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		box-shadow: var(--shadow-md);
		z-index: 10;
		min-inline-size: 12rem;
	}

	.picker button {
		background: transparent;
		border: 0;
		text-align: start;
		padding-block: 6px;
		padding-inline: 8px;
		cursor: pointer;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		color: var(--text);
	}

	.picker button:hover {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
</style>
