<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatDate } from '$lib/i18n/runtime';
	import LaunchStatusBadge from '$lib/components/LaunchStatusBadge.svelte';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	let l = $derived(data.launch);

	let imageFailed = $state(false);
	let imageOk = $derived(!!l.imageUrl && !imageFailed);

	function youtubeEmbedUrl(url: string | null | undefined): string | null {
		if (!url) return null;
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
		return match ? `https://www.youtube.com/embed/${match[1]}` : null;
	}
	let embedUrl = $derived(youtubeEmbedUrl(l.webcastUrl));

	function boosterHref(serial: string): ResolvedPathname {
		return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
	}

	function landingCellText(s: (typeof data.stages)[number]): string {
		if (s.landingAttempted == null) return '—';
		if (s.landingAttempted === false) return 'Not attempted';
		if (s.landingSuccess) return s.locationAbbrev ?? s.locationName ?? 'OK';
		return 'Failed';
	}

	function landingClass(s: (typeof data.stages)[number]): string {
		if (s.landingAttempted == null || s.landingAttempted === false) return 'landing-none';
		return s.landingSuccess ? 'landing-ok' : 'landing-fail';
	}
</script>

<svelte:head><title>{l.name} · {m.site_title()}</title></svelte:head>

<header class="header">
	<div class="hero-image">
		{#if imageOk && l.imageUrl}
			<img src={l.imageUrl} alt={l.name} onerror={() => (imageFailed = true)} />
		{:else}
			<div class="image-placeholder">
				<span class="rocket" aria-hidden="true">🚀</span>
				<span class="placeholder-name">{l.rocketName ?? 'Falcon'}</span>
			</div>
		{/if}
	</div>
	<div class="header-text">
		<span class="eyebrow">{l.rocketName ?? 'Falcon'}</span>
		<h1>
			<span class="title-text">{l.name}</span>
			<LaunchStatusBadge status={l.status} />
		</h1>
		<p class="net">{formatDate(l.net)}</p>
		{#if l.missionDescription}
			<p class="description">{l.missionDescription}</p>
		{/if}
	</div>
</header>

<section class="meta-grid">
	{#if l.missionName}
		<div class="meta-tile">
			<div class="meta-label">Mission</div>
			<div class="meta-value">{l.missionName}</div>
		</div>
	{/if}
	{#if l.missionType}
		<div class="meta-tile">
			<div class="meta-label">Type</div>
			<div class="meta-value">{l.missionType}</div>
		</div>
	{/if}
	{#if l.orbit}
		<div class="meta-tile">
			<div class="meta-label">Orbit</div>
			<div class="meta-value">{l.orbit}</div>
		</div>
	{/if}
	{#if data.pad}
		<div class="meta-tile">
			<div class="meta-label">Pad</div>
			<div class="meta-value">{data.pad.name}</div>
		</div>
	{/if}
</section>

<section>
	<h2>Boosters</h2>
	{#if data.stages.length === 0}
		<p class="empty">No booster data available for this launch.</p>
	{:else}
		<div class="booster-grid">
			{#each data.stages as s (s.boosterId + '-' + (s.role ?? ''))}
				<div class="booster-card">
					<div class="booster-card-head">
						<a class="mono" href={boosterHref(s.boosterSerial)}>{s.boosterSerial}</a>
						<BoosterStatusBadge status={s.boosterStatus ?? 'unknown'} />
						{#if s.role}<span class="role-tag">{s.role}</span>{/if}
					</div>
					<div class="booster-card-body">
						{#if s.configName}<div class="card-meta">{s.configName}</div>{/if}
						<div class="card-row">
							<span class="card-row-label">Flight #</span>
							<span class="card-row-value">{s.flightNumber ?? '—'}</span>
						</div>
						<div class="card-row">
							<span class="card-row-label">Landing</span>
							<span class="card-row-value landing {landingClass(s)}">{landingCellText(s)}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if embedUrl}
	<section>
		<h2>Webcast</h2>
		<div class="embed-wrap">
			<iframe
				src={embedUrl}
				title="webcast"
				allow="encrypted-media; fullscreen"
				referrerpolicy="strict-origin-when-cross-origin"
			></iframe>
		</div>
	</section>
{/if}

<style>
	.header {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: var(--space-5);
		align-items: start;
		padding-block: var(--space-4);
	}

	.hero-image {
		inline-size: 240px;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.hero-image img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		display: block;
	}

	.image-placeholder {
		inline-size: 100%;
		block-size: 100%;
		background: linear-gradient(180deg, var(--header-bg-1) 0%, var(--header-bg-2) 100%);
		color: var(--header-text);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
	}

	.image-placeholder .rocket {
		font-size: 3rem;
	}

	.placeholder-name {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		opacity: 0.85;
	}

	.eyebrow {
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		font-weight: 700;
		margin-block-end: var(--space-2);
	}

	h1 {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
		margin-block: 0;
	}

	.title-text {
		font-size: 1.875rem;
		line-height: 1.2;
	}

	.net {
		color: var(--text-muted);
		margin-block-start: var(--space-2);
	}

	.description {
		max-inline-size: 60ch;
		color: var(--text);
		margin-block-start: var(--space-3);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
		padding-block: var(--space-4);
	}

	.meta-tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}

	.meta-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.meta-value {
		font-weight: 600;
		margin-block-start: 0.25rem;
	}

	section {
		padding-block: var(--space-4);
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

	.booster-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: var(--space-3);
	}

	.booster-card {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}

	.booster-card-head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-block-end: var(--space-3);
	}

	.mono {
		font-family: var(--font-mono);
		color: var(--accent);
		text-decoration: none;
		font-weight: 700;
		font-size: 1rem;
	}

	.mono:hover {
		text-decoration: underline;
	}

	.role-tag {
		background: var(--surface);
		color: var(--text-muted);
		padding-block: 2px;
		padding-inline: 6px;
		border-radius: var(--radius-sm);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.card-meta {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-block-end: var(--space-2);
	}

	.card-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		padding-block: 2px;
		font-size: 0.9rem;
	}

	.card-row-label {
		color: var(--text-muted);
	}

	.landing {
		display: inline-block;
		font-weight: 600;
		padding-block: 2px;
		padding-inline: 6px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.landing-ok {
		background: #dcfce7;
		color: #166534;
	}

	.landing-fail {
		background: #fecaca;
		color: #991b1b;
	}

	.landing-none {
		background: var(--surface);
		color: var(--text-muted);
	}

	.embed-wrap {
		aspect-ratio: 16 / 9;
		max-inline-size: 800px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--border);
	}

	.embed-wrap iframe {
		inline-size: 100%;
		block-size: 100%;
		border: 0;
		display: block;
	}

	@media (width <= 720px) {
		.header {
			grid-template-columns: 1fr;
		}

		.hero-image {
			inline-size: 100%;
			max-inline-size: 320px;
		}

		.meta-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
