import type { ColumnDef } from './columns';
import type { FilterClause } from '../../url-state';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const NUMBER_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
const DATE_OPS = new Set(['eq', 'gt', 'gte', 'lt', 'lte', 'between']);
const TEXT_OPS = new Set(['contains', 'eq', 'startsWith']);
const ENUM_OPS = new Set(['in', 'eq']);
const BOOL_OPS = new Set(['eq']);

export function validateFilter(columns: readonly ColumnDef[], clause: FilterClause): ValidationResult {
  const col = columns.find((c) => c.id === clause.id);
  if (!col) return { ok: false, reason: `unknown column ${clause.id}` };
  if (!col.filter) return { ok: false, reason: `column ${col.id} is not filterable` };

  switch (col.filter.kind) {
    case 'enum':
      if (!ENUM_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for enum` };
      if (clause.op === 'in') {
        if (!Array.isArray(clause.value)) return { ok: false, reason: 'in requires array' };
        for (const v of clause.value) {
          if (typeof v !== 'string' || !col.filter.options.includes(v)) {
            return { ok: false, reason: `unknown enum value ${String(v)}` };
          }
        }
      } else {
        if (typeof clause.value !== 'string' || !col.filter.options.includes(clause.value)) {
          return { ok: false, reason: 'unknown enum value' };
        }
      }
      return { ok: true };

    case 'numberRange':
      if (!NUMBER_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for number` };
      if (typeof clause.value !== 'number' || !Number.isFinite(clause.value))
        return { ok: false, reason: 'number value required' };
      return { ok: true };

    case 'dateRange':
      if (!DATE_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for date` };
      if (clause.op === 'between') {
        if (!Array.isArray(clause.value) || clause.value.length !== 2)
          return { ok: false, reason: 'between requires [start, end]' };
        if (!clause.value.every((v) => typeof v === 'string')) return { ok: false, reason: 'date strings required' };
      } else if (typeof clause.value !== 'string') {
        return { ok: false, reason: 'date string required' };
      }
      return { ok: true };

    case 'text':
      if (!TEXT_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for text` };
      if (typeof clause.value !== 'string') return { ok: false, reason: 'string value required' };
      return { ok: true };

    case 'boolean':
      if (!BOOL_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for boolean` };
      if (typeof clause.value !== 'boolean') return { ok: false, reason: 'boolean value required' };
      return { ok: true };
  }
}

export function validateFilters(columns: readonly ColumnDef[], clauses: FilterClause[]): { valid: FilterClause[]; rejected: { clause: FilterClause; reason: string }[] } {
  const valid: FilterClause[] = [];
  const rejected: { clause: FilterClause; reason: string }[] = [];
  for (const c of clauses) {
    const result = validateFilter(columns, c);
    if (result.ok) valid.push(c);
    else rejected.push({ clause: c, reason: (result as { ok: false; reason: string }).reason });
  }
  return { valid, rejected };
}
