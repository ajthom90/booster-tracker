<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	let { status }: { status: string } = $props();

	const labels: Record<string, () => string> = {
		success: m.launch_status_success,
		failure: m.launch_status_failure,
		partial_failure: m.launch_status_partial_failure,
		upcoming: m.launch_status_upcoming,
		in_flight: m.launch_status_in_flight,
		unknown: m.launch_status_unknown
	};
	let label = $derived((labels[status] ?? m.launch_status_unknown)());
</script>

<span class="badge badge-{status}">{label}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding-block: 0.125rem;
		padding-inline: 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid transparent;
	}

	.badge::before {
		content: '';
		inline-size: 6px;
		block-size: 6px;
		border-radius: 999px;
		background: currentcolor;
		opacity: 0.7;
	}

	.badge-success {
		background: #dcfce7;
		color: #166534;
		border-color: #bbf7d0;
	}

	.badge-failure {
		background: #fecaca;
		color: #991b1b;
		border-color: #fca5a5;
	}

	/* stylelint-disable-next-line selector-class-pattern -- match schema enum tokens */
	.badge-partial_failure {
		background: #fed7aa;
		color: #9a3412;
		border-color: #fdba74;
	}

	.badge-upcoming {
		background: #dbeafe;
		color: #1e40af;
		border-color: #bfdbfe;
	}

	/* stylelint-disable-next-line selector-class-pattern -- match schema enum tokens */
	.badge-in_flight {
		background: #fef3c7;
		color: #854d0e;
		border-color: #fde68a;
	}

	.badge-unknown {
		background: #f3f4f6;
		color: #6b7280;
		border-color: #e5e7eb;
	}
</style>
