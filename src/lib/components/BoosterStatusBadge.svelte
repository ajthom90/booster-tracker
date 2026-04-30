<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	let { status }: { status: string } = $props();

	const labels: Record<string, () => string> = {
		active: m.status_active,
		inactive: m.status_inactive,
		expended: m.status_expended,
		lost: m.status_lost,
		retired: m.status_retired,
		unknown: m.status_unknown
	};
	let label = $derived((labels[status] ?? m.status_unknown)());
</script>

<span class="badge badge-{status}">
	<span class="dot" aria-hidden="true"></span>
	{label}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding-block: 2px;
		padding-inline: 8px;
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1.3;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.dot {
		inline-size: 6px;
		block-size: 6px;
		border-radius: 999px;
		background: currentcolor;
		opacity: 0.8;
	}

	.badge-active {
		background: #ecfdf5;
		color: #047857;
		border-color: #a7f3d0;
	}

	.badge-inactive {
		background: #f1f5f9;
		color: #475569;
		border-color: #cbd5e1;
	}

	.badge-expended {
		background: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}

	.badge-lost {
		background: #fef2f2;
		color: #b91c1c;
		border-color: #fecaca;
	}

	.badge-retired {
		background: #eef2ff;
		color: #4338ca;
		border-color: #c7d2fe;
	}

	.badge-unknown {
		background: #f3f4f6;
		color: #6b7280;
		border-color: #e5e7eb;
	}
</style>
