import { describe, it, expect } from 'vitest';
import { __statusTokenForTest } from '../../src/lib/server/sync/launches';

describe('statusToken', () => {
	it('maps "Launch Successful" to success', () => {
		expect(__statusTokenForTest('Launch Successful')).toBe('success');
	});
	it('maps "Launch Failure" to failure', () => {
		expect(__statusTokenForTest('Launch Failure')).toBe('failure');
	});
	it('maps "Partial Failure" to partial_failure (not failure)', () => {
		expect(__statusTokenForTest('Partial Failure')).toBe('partial_failure');
	});
	it('maps "Go for Launch" / "TBD" to upcoming', () => {
		expect(__statusTokenForTest('Go for Launch')).toBe('upcoming');
		expect(__statusTokenForTest('TBD')).toBe('upcoming');
	});
	it('maps "To Be Determined" to upcoming', () => {
		expect(__statusTokenForTest('To Be Determined')).toBe('upcoming');
	});
	it('maps "To Be Confirmed" to upcoming', () => {
		expect(__statusTokenForTest('To Be Confirmed')).toBe('upcoming');
	});
	it('maps "In Flight" to in_flight', () => {
		expect(__statusTokenForTest('In Flight')).toBe('in_flight');
	});
	it('uses abbrev when supplied (TBD => upcoming)', () => {
		expect(__statusTokenForTest('Some Future Status Name', 'TBD')).toBe('upcoming');
	});
	it('uses abbrev when supplied (Hold => upcoming)', () => {
		expect(__statusTokenForTest('Whatever', 'Hold')).toBe('upcoming');
	});
	it('uses abbrev when supplied (Success => success)', () => {
		expect(__statusTokenForTest('Some Long Display Name', 'Success')).toBe('success');
	});
	it('falls back to unknown for truly unrecognized status', () => {
		expect(__statusTokenForTest('Mystery State')).toBe('unknown');
	});
});
