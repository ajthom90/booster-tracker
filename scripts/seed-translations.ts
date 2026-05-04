import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';

type MessageMap = Record<string, string>;

const SOURCE_LOCALE = 'EN';
const TARGETS: Record<string, string> = {
	es: 'ES',
	fr: 'FR',
	de: 'DE',
	ar: 'AR',
	he: 'HE',
	'zh-Hans': 'ZH-HANS'
};
const ENDPOINT = 'https://api-free.deepl.com/v2/translate';

async function translateBatch(authKey: string, target: string, texts: string[]): Promise<string[]> {
	const params = new URLSearchParams();
	params.set('source_lang', SOURCE_LOCALE);
	params.set('target_lang', target);
	for (const t of texts) params.append('text', t);
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${authKey}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params
	});
	if (!res.ok) throw new Error(`DeepL HTTP ${res.status}: ${await res.text()}`);
	const data = (await res.json()) as { translations: { text: string }[] };
	return data.translations.map((t) => t.text);
}

async function seedLocale(authKey: string, source: MessageMap, locale: string, target: string) {
	const keys = Object.keys(source).filter((k) => !k.startsWith('$'));
	const texts = keys.map((k) => source[k]);

	console.log(`[seed] translating ${keys.length} keys to ${locale} (${target})...`);
	const CHUNK = 40;
	const out: string[] = [];
	for (let i = 0; i < texts.length; i += CHUNK) {
		const chunk = texts.slice(i, i + CHUNK);
		const translated = await translateBatch(authKey, target, chunk);
		out.push(...translated);
	}

	const result: MessageMap = { $schema: source.$schema };
	for (let i = 0; i < keys.length; i++) result[keys[i]] = out[i];

	const path = `messages/${locale}.json`;
	writeFileSync(path, JSON.stringify(result, null, '\t') + '\n', 'utf8');
	console.log(`[seed] wrote ${path}`);
}

async function main() {
	const authKey = process.env.DEEPL_AUTH_KEY;
	if (!authKey) {
		console.error('DEEPL_AUTH_KEY must be set. Get a free key at https://www.deepl.com/pro-api');
		process.exit(1);
	}
	const source = JSON.parse(readFileSync('messages/en.json', 'utf8')) as MessageMap;
	for (const [locale, target] of Object.entries(TARGETS)) {
		await seedLocale(authKey, source, locale, target);
	}
	console.log('[seed] done');
}

main().catch((err) => {
	console.error('[seed] failed:', err);
	process.exit(1);
});
