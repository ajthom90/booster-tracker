import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const messagesDir = 'messages';
const baseLocale = 'en';

function readLocaleKeys(locale: string): Set<string> {
	const path = join(messagesDir, `${locale}.json`);
	const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
	const out = new Set<string>();
	for (const k of Object.keys(data)) {
		if (k.startsWith('$')) continue;
		out.add(k);
	}
	return out;
}

function listLocales(): string[] {
	return readdirSync(messagesDir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace(/\.json$/, ''));
}

function main() {
	const locales = listLocales();
	if (!locales.includes(baseLocale)) {
		console.error(`Base locale ${baseLocale} not found in ${messagesDir}/`);
		process.exit(1);
	}
	const baseKeys = readLocaleKeys(baseLocale);
	let problems = 0;
	for (const locale of locales) {
		if (locale === baseLocale) continue;
		const keys = readLocaleKeys(locale);
		const missing = [...baseKeys].filter((k) => !keys.has(k));
		const extra = [...keys].filter((k) => !baseKeys.has(k));
		if (missing.length === 0 && extra.length === 0) {
			console.log(`✓ ${locale}: ${keys.size} keys, all present`);
			continue;
		}
		problems += missing.length + extra.length;
		if (missing.length > 0) {
			console.error(`✗ ${locale}: missing ${missing.length} key(s):`);
			for (const k of missing) console.error(`    - ${k}`);
		}
		if (extra.length > 0) {
			console.error(`✗ ${locale}: ${extra.length} extra key(s) not in ${baseLocale}:`);
			for (const k of extra) console.error(`    + ${k}`);
		}
	}
	if (problems > 0) {
		console.error(`\nTotal problems: ${problems}`);
		process.exit(1);
	}
	console.log(`\nAll ${locales.length} locales consistent (${baseKeys.size} keys each).`);
}

main();
