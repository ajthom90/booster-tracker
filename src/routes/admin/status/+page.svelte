<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { m, formatDate, formatNumber } from '$lib/i18n/runtime';

	let { data }: { data: PageData } = $props();

	let triggering = $state(false);
	let triggerMessage = $state<string | null>(null);

	async function triggerSync() {
		triggering = true;
		triggerMessage = null;
		try {
			const res = await fetch(`/api/admin/sync?token=${encodeURIComponent(data.token)}`, {
				method: 'POST'
			});
			if (res.ok) {
				const body = await res.json();
				triggerMessage = `Sync ${body.status ?? 'started'}.`;
			} else {
				triggerMessage = `Sync failed: HTTP ${res.status}`;
			}
		} catch (err) {
			triggerMessage = `Sync error: ${err instanceof Error ? err.message : String(err)}`;
		} finally {
			triggering = false;
			// Refresh the load function so the sync_state table reflects the new run.
			await invalidateAll();
		}
	}

	function statusColor(s: string): string {
		if (s === 'ok') return 'badge-ok';
		if (s === 'in_progress') return 'badge-progress';
		if (s === 'error') return 'badge-error';
		return 'badge-unknown';
	}
</script>

<svelte:head><title>Admin Status · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>Admin Status</h1>
	<p class="subtitle">Per-resource sync state and manual sync trigger.</p>
</header>

<section class="counts-grid">
	<div class="tile">
		<div class="label">Boosters</div>
		<div class="value">{formatNumber(data.counts.boosters)}</div>
	</div>
	<div class="tile">
		<div class="label">Launches</div>
		<div class="value">{formatNumber(data.counts.launches)}</div>
	</div>
	<div class="tile">
		<div class="label">Launchpads</div>
		<div class="value">{formatNumber(data.counts.launchpads)}</div>
	</div>
	<div class="tile">
		<div class="label">Landing locations</div>
		<div class="value">{formatNumber(data.counts.landingLocations)}</div>
	</div>
</section>

<section class="actions-row">
	<button class="primary" onclick={triggerSync} disabled={triggering}>
		{triggering ? 'Triggering...' : 'Trigger incremental sync'}
	</button>
	{#if triggerMessage}
		<span class="trigger-msg">{triggerMessage}</span>
	{/if}
</section>

<section>
	<h2>Sync state</h2>
	{#if data.states.length === 0}
		<p class="empty">No sync state recorded yet.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Resource</th>
						<th>Status</th>
						<th>Last full sync</th>
						<th>Last incremental sync</th>
						<th>Error</th>
					</tr>
				</thead>
				<tbody>
					{#each data.states as s (s.resource)}
						<tr>
							<td class="mono">{s.resource}</td>
							<td><span class="status {statusColor(s.status)}">{s.status}</span></td>
							<td class="date">{s.lastFullSyncAt ? formatDate(s.lastFullSyncAt) : '—'}</td>
							<td class="date">
								{s.lastIncrementalSyncAt ? formatDate(s.lastIncrementalSyncAt) : '—'}
							</td>
							<td class="error">{s.errorMessage ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.page-header {
		padding-block-end: var(--space-3);
	}

	.subtitle {
		color: var(--text-muted);
		margin-block-start: 0.25rem;
	}

	.counts-grid {
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

	.actions-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-block: var(--space-3);
	}

	button.primary {
		background: var(--accent);
		color: white;
		border: 0;
		padding-block: 0.5rem;
		padding-inline: 1rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}

	button.primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.trigger-msg {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	section {
		padding-block: var(--space-3);
	}

	h2 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-block-end: var(--space-3);
	}

	.empty {
		color: var(--text-muted);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-elevated);
	}

	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		border-block-end: 1px solid var(--border);
		text-align: start;
	}

	th {
		background: var(--surface);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.mono {
		font-family: var(--font-mono);
	}

	.date {
		color: var(--text-muted);
		white-space: nowrap;
	}

	.error {
		color: var(--text-muted);
		max-inline-size: 30ch;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		padding-block: 2px;
		padding-inline: 6px;
		border-radius: var(--radius-sm);
	}

	.badge-ok {
		background: #dcfce7;
		color: #166534;
	}

	.badge-progress {
		background: #dbeafe;
		color: #1e40af;
	}

	.badge-error {
		background: #fecaca;
		color: #991b1b;
	}

	.badge-unknown {
		background: var(--surface);
		color: var(--text-muted);
	}

	@media (width <= 720px) {
		.counts-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
