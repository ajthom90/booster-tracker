import { describe, it, expect } from 'vitest';
import { validateFilter } from '../../src/lib/server/boosters/filters';
import { BOOSTER_COLUMNS } from '../../src/lib/server/boosters/columns';

describe('validateFilter (boosters)', () => {
	it('accepts an enum filter for status with valid values', () => {
		const result = validateFilter(BOOSTER_COLUMNS, {
			id: 'status',
			op: 'in',
			value: ['active', 'lost']
		});
		expect(result.ok).toBe(true);
	});

	it('rejects an enum filter with unknown values', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'status', op: 'in', value: ['nope'] });
		expect(result.ok).toBe(false);
	});

	it('accepts a number-range filter on flights', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'flights', op: 'gte', value: 10 });
		expect(result.ok).toBe(true);
	});

	it('rejects a number-range filter on a text column', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'serial_number', op: 'gte', value: 10 });
		expect(result.ok).toBe(false);
	});

	it('rejects unknown column IDs', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'made_up', op: 'in', value: [] });
		expect(result.ok).toBe(false);
	});
});
