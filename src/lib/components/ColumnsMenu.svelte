<script lang="ts">
	import { m } from '$lib/i18n/runtime';
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
	<button onclick={() => (open = !open)}>{m.btn_columns()}</button>
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
						{col.label}
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
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 12rem;
		box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
	}

	li {
		padding: 0.125rem 0;
	}

	label {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		cursor: pointer;
	}

	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
</style>
