<script lang="ts">
	let {
		tiles
	}: {
		tiles: Array<{
			label: string;
			value: string | number;
			denom?: number;
			suffix?: string;
		}>;
	} = $props();
</script>

<div class="aggbar">
	{#each tiles as t (t.label)}
		<div class="tile">
			<div class="tile-label">{t.label}</div>
			<div class="tile-value">
				<strong>{t.value}</strong>
				{#if t.denom != null}<span class="denom">/ {t.denom}</span>{/if}
				{#if t.suffix}<span class="suffix">{t.suffix}</span>{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.aggbar {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
	}
	.tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.tile-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}
	.tile-value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-block-start: 0.25rem;
	}
	.denom,
	.suffix {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 500;
	}
	@media (width <= 640px) {
		.aggbar {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
