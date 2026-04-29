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
  it('maps "In Flight" to in_flight', () => {
    expect(__statusTokenForTest('In Flight')).toBe('in_flight');
  });
  it('returns unknown for unrecognized status', () => {
    expect(__statusTokenForTest('Hold')).toBe('unknown');
  });
});
