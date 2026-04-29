<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/i18n/runtime';
</script>

<h1>{m.site_title()}</h1>
<p>
	<a href={resolve('/boosters')}>{m.nav_boosters()} →</a>
</p>
