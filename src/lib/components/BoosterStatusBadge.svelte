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

<span class="badge badge-{status}">{label}</span>

<style>
	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.badge-active {
		background: #dcfce7;
		color: #166534;
	}

	.badge-inactive {
		background: #f3f4f6;
		color: #374151;
	}

	.badge-expended {
		background: #fef3c7;
		color: #854d0e;
	}

	.badge-lost {
		background: #fecaca;
		color: #991b1b;
	}

	.badge-retired {
		background: #e0e7ff;
		color: #3730a3;
	}

	.badge-unknown {
		background: #f3f4f6;
		color: #6b7280;
	}
</style>
