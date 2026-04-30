<script lang="ts">
	import { m, resolveLabel } from '$lib/i18n/runtime';
	import type { ColumnDef } from '$lib/server/boosters/columns';
	let {
		columns,
		visible,
		onChange
	}: {
		columns: readonly ColumnDef[];
		visible: string[];
		onChange: (next: string[]) => void;
	} = $props();

	let open = $state(false);

	function toggle(id: string) {
		if (visible.includes(id)) onChange(visible.filter((v) => v !== id));
		else onChange([...visible, id]);
	}
</script>

<div class="menu">
	<button class="menu-btn" onclick={() => (open = !open)}>{m.btn_columns()} ▾</button>
	{#if open}
		<ul>
			{#each columns as col (col.id)}
				<li>
					<label>
						<input
							type="checkbox"
							checked={visible.includes(col.id)}
							onchange={() => toggle(col.id)}
						/>
						{resolveLabel(col.label)}
					</label>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-block;
	}

	ul {
		position: absolute;
		inset-block-start: calc(100% + 4px);
		inset-inline-end: 0;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		list-style: none;
		padding: 6px;
		min-inline-size: 13rem;
		box-shadow: var(--shadow-md);
		margin: 0;
		z-index: 10;
	}

	li {
		padding: 0;
	}

	label {
		display: flex;
		gap: 8px;
		align-items: center;
		cursor: pointer;
		padding-block: 5px;
		padding-inline: 8px;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	label:hover {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}

	.menu-btn {
		font: inherit;
		cursor: pointer;
		padding-block: 6px;
		padding-inline: 12px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.menu-btn:hover {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent-strong);
	}
</style>
