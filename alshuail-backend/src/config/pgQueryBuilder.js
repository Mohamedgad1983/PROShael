import dotenv from "dotenv";
dotenv.config();

/**
 * PostgreSQL Query Builder with Supabase-Compatible API
 * Allows existing controllers to work unchanged while using direct PostgreSQL
 */

import pg from 'pg';
import { log } from '../utils/logger.js';

const { Pool } = pg;

// Connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'alshuail_db',
  user: process.env.DB_USER || 'alshuail',
  password: process.env.DB_PASSWORD,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Pool event handlers
pool.on('error', (err) => {
  log.error('[PG Pool] Unexpected error', { error: err.message });
});

pool.on('connect', () => {
  log.debug('[PG Pool] New client connected');
});

/**
 * Query Builder Class - Mimics Supabase API
 */
class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.selectColumns = '*';
    this.whereConditions = [];
    this.whereParams = [];
    this.paramIndex = 1;
    this.orderByClause = '';
    this.limitClause = '';
    this.offsetClause = '';
    this.operation = 'SELECT';
    this.insertData = null;
    this.updateData = null;
    this.returningSingle = false;
    this.returningMaybeSingle = false;
    this.upsertConflict = null;
    this.countType = null;
    // Join support for Supabase syntax
    this.joins = [];
    this.joinAliases = {};
  }

  /**
   * SELECT columns
   * Note: When called after insert/update/upsert, this just modifies what columns to return
   * (the RETURNING clause already handles this, so we don't change the operation)
   */
  select(columns = '*', options = {}) {
    // Don't override INSERT/UPDATE/UPSERT operations - they already have RETURNING *
    if (this.operation !== 'INSERT' && this.operation !== 'UPDATE' && this.operation !== 'UPSERT') {
      this.operation = 'SELECT';
    }

    if (options.count) {
      this.countType = options.count;
    }

    if (options.head) {
      this.headOnly = true;
    }

    if (columns !== '*') {
      this.selectColumns = this._parseSelectColumns(columns);
    } else {
      this.selectColumns = `${this.tableName}.*`;
    }
    return this;
  }

  /**
   * Split columns string respecting parentheses
   */
  _splitColumns(str) {
    const result = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(') { depth++; }
      else if (char === ')') { depth--; }

      if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }
    return result;
  }

  /**
   * Parse select columns including joins
   * Handles patterns like:
   * - payer:members!payer_id(full_name, phone) - aliased join with explicit FK
   * - members!payer_id(full_name, phone) - join with explicit FK
   * - family_branches(branch_name) - implicit join
   */
  _parseSelectColumns(columns) {
    // Normalize whitespace - replace newlines and multiple spaces with single space
    const normalizedColumns = columns.replace(/\s+/g, ' ').trim();
    const parts = this._splitColumns(normalizedColumns);
    const cleanColumns = [];

    for (let part of parts) {
      // Trim whitespace from each part
      part = part.trim();
      if (!part) { continue; }

      // Pattern 1: alias:table!fk(columns)
      let match = part.match(/^(\w+):(\w+)!(\w+)\((.+)\)$/);
      if (match) {
        const [, alias, table, fk, cols] = match;
        this._addJoin(alias, table, fk, cols);
        continue;
      }

      // Pattern 2: table!fk(columns)
      match = part.match(/^(\w+)!(\w+)\((.+)\)$/);
      if (match) {
        const [, table, fk, cols] = match;
        this._addJoin(table, table, fk, cols);
        continue;
      }

      // Pattern 3: alias:table(columns)
      match = part.match(/^(\w+):(\w+)\((.+)\)$/);
      if (match) {
        const [, alias, table, cols] = match;
        const inferredFk = `${table.replace(/s$/, '')}_id`;
        this._addJoin(alias, table, inferredFk, cols);
        continue;
      }

      // Pattern 4: table(columns)
      match = part.match(/^(\w+)\((.+)\)$/);
      if (match) {
        const [, table, cols] = match;
        const inferredFk = `${table.replace(/s$/, '')}_id`;
        this._addJoin(table, table, inferredFk, cols);
        continue;
      }

      // Regular column handling
      const aliasMatch = part.match(/^(\w+):(\w+)$/);
      if (aliasMatch) {
        cleanColumns.push(`${this.tableName}.${aliasMatch[1]} AS ${aliasMatch[2]}`);
      } else if (part === '*') {
        cleanColumns.push(`${this.tableName}.*`);
      } else {
        if (!part.includes('.')) {
          cleanColumns.push(`${this.tableName}.${part}`);
        } else {
          cleanColumns.push(part);
        }
      }
    }

    // Combine base columns with join columns
    const baseColumns = cleanColumns.length > 0 ? cleanColumns.join(', ') : `${this.tableName}.*`;

    // If we have joins, add their select parts
    if (this.joins.length > 0) {
      const joinSelectParts = [];
      for (const join of this.joins) {
        for (const col of join.columns) {
          joinSelectParts.push(`${join.alias}.${col} AS "${join.resultAlias}.${col}"`);
        }
      }
      return `${baseColumns}, ${joinSelectParts.join(', ')}`;
    }

    return baseColumns;
  }

  /**
   * Add a JOIN clause
   */
  _addJoin(alias, table, fk, columnsStr) {
    const joinAlias = `${alias}_join`;
    const columns = columnsStr.split(',').map(c => c.trim());

    this.joins.push({
      alias: joinAlias,
      table: table,
      fk: fk,
      columns: columns,
      resultAlias: alias
    });

    this.joinAliases[alias] = {
      table: table,
      columns: columns
    };
    // Note: selectColumns are now built in _parseSelectColumns after all joins are registered
  }

  insert(data) {
    this.operation = 'INSERT';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.operation = 'UPDATE';
    this.updateData = data;
    return this;
  }

  delete() {
    this.operation = 'DELETE';
    return this;
  }

  upsert(data, options = {}) {
    this.operation = 'UPSERT';
    this.insertData = Array.isArray(data) ? data : [data];
    this.upsertConflict = options.onConflict || 'id';
    return this;
  }

  eq(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    if (value === null) {
      this.whereConditions.push(`${qCol} IS NULL`);
    } else {
      this.whereConditions.push(`${qCol} = $${this.paramIndex}`);
      this.whereParams.push(value);
      this.paramIndex++;
    }
    return this;
  }

  neq(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    if (value === null) {
      this.whereConditions.push(`${qCol} IS NOT NULL`);
    } else {
      this.whereConditions.push(`${qCol} != $${this.paramIndex}`);
      this.whereParams.push(value);
      this.paramIndex++;
    }
    return this;
  }

  gt(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} > $${this.paramIndex}`);
    this.whereParams.push(value);
    this.paramIndex++;
    return this;
  }

  gte(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} >= $${this.paramIndex}`);
    this.whereParams.push(value);
    this.paramIndex++;
    return this;
  }

  lt(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} < $${this.paramIndex}`);
    this.whereParams.push(value);
    this.paramIndex++;
    return this;
  }

  lte(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} <= $${this.paramIndex}`);
    this.whereParams.push(value);
    this.paramIndex++;
    return this;
  }

  like(column, pattern) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} LIKE $${this.paramIndex}`);
    this.whereParams.push(pattern);
    this.paramIndex++;
    return this;
  }

  ilike(column, pattern) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} ILIKE $${this.paramIndex}`);
    this.whereParams.push(pattern);
    this.paramIndex++;
    return this;
  }

  is(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    if (value === null) {
      this.whereConditions.push(`${qCol} IS NULL`);
    } else if (value === true) {
      this.whereConditions.push(`${qCol} IS TRUE`);
    } else if (value === false) {
      this.whereConditions.push(`${qCol} IS FALSE`);
    }
    return this;
  }

  in(column, values) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    if (!values || values.length === 0) {
      this.whereConditions.push('FALSE');
    } else {
      const placeholders = values.map(() => {
        const ph = `$${this.paramIndex}`;
        this.paramIndex++;
        return ph;
      });
      this.whereConditions.push(`${qCol} IN (${placeholders.join(', ')})`);
      this.whereParams.push(...values);
    }
    return this;
  }

  not(column, operator, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    if (operator === 'in') {
      if (!value || value.length === 0) { return this; }
      const placeholders = value.map(() => {
        const ph = `$${this.paramIndex}`;
        this.paramIndex++;
        return ph;
      });
      this.whereConditions.push(`${qCol} NOT IN (${placeholders.join(', ')})`);
      this.whereParams.push(...value);
    } else if (operator === 'is' && value === null) {
      this.whereConditions.push(`${qCol} IS NOT NULL`);
    }
    return this;
  }

  contains(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} @> $${this.paramIndex}`);
    this.whereParams.push(JSON.stringify(value));
    this.paramIndex++;
    return this;
  }

  containedBy(column, value) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    this.whereConditions.push(`${qCol} <@ $${this.paramIndex}`);
    this.whereParams.push(JSON.stringify(value));
    this.paramIndex++;
    return this;
  }

  or(conditions) {
    const orParts = [];
    const parts = conditions.split(',');

    for (const part of parts) {
      const match = part.match(/^(\w+)\.(\w+)\.(.+)$/);
      if (match) {
        const [, column, op, value] = match;
        const qCol = `${this.tableName}.${column}`;
        switch (op) {
          case 'eq':
            orParts.push(`${qCol} = $${this.paramIndex}`);
            this.whereParams.push(value);
            this.paramIndex++;
            break;
          case 'neq':
            orParts.push(`${qCol} != $${this.paramIndex}`);
            this.whereParams.push(value);
            this.paramIndex++;
            break;
          case 'like':
            orParts.push(`${qCol} LIKE $${this.paramIndex}`);
            this.whereParams.push(value);
            this.paramIndex++;
            break;
          case 'ilike':
            orParts.push(`${qCol} ILIKE $${this.paramIndex}`);
            this.whereParams.push(value);
            this.paramIndex++;
            break;
        }
      }
    }

    if (orParts.length > 0) {
      this.whereConditions.push(`(${orParts.join(' OR ')})`);
    }
    return this;
  }

  filter(column, operator, value) {
    switch (operator) {
      case 'eq': return this.eq(column, value);
      case 'neq': return this.neq(column, value);
      case 'gt': return this.gt(column, value);
      case 'gte': return this.gte(column, value);
      case 'lt': return this.lt(column, value);
      case 'lte': return this.lte(column, value);
      case 'like': return this.like(column, value);
      case 'ilike': return this.ilike(column, value);
      case 'is': return this.is(column, value);
      case 'in': return this.in(column, value);
      default: return this;
    }
  }

  order(column, options = {}) {
    const qCol = column.includes('.') ? column : `${this.tableName}.${column}`;
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    const nulls = options.nullsFirst ? 'NULLS FIRST' : '';

    if (this.orderByClause) {
      this.orderByClause += `, ${qCol} ${direction} ${nulls}`;
    } else {
      this.orderByClause = `ORDER BY ${qCol} ${direction} ${nulls}`;
    }
    return this;
  }

  limit(count) {
    this.limitClause = `LIMIT ${parseInt(count)}`;
    return this;
  }

  range(from, to) {
    this.offsetClause = `OFFSET ${parseInt(from)}`;
    this.limitClause = `LIMIT ${parseInt(to - from + 1)}`;
    return this;
  }

  single() {
    this.returningSingle = true;
    this.limitClause = 'LIMIT 1';
    return this;
  }

  maybeSingle() {
    this.returningMaybeSingle = true;
    this.limitClause = 'LIMIT 1';
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Transform flat row data into nested objects for joins
   */
  _nestJoinedData(rows) {
    if (!rows || rows.length === 0 || Object.keys(this.joinAliases).length === 0) {
      return rows;
    }

    return rows.map(row => {
      const result = {};
      const joinData = {};

      for (const alias of Object.keys(this.joinAliases)) {
        joinData[alias] = {};
      }

      for (const [key, value] of Object.entries(row)) {
        const dotIndex = key.indexOf('.');
        if (dotIndex > 0) {
          const alias = key.substring(0, dotIndex);
          const column = key.substring(dotIndex + 1);
          if (joinData[alias] !== undefined) {
            joinData[alias][column] = value;
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }

      for (const [alias, data] of Object.entries(joinData)) {
        const allNull = Object.values(data).every(v => v === null);
        result[alias] = allNull ? null : data;
      }

      return result;
    });
  }

  async _execute() {
    let sql, params, result;

    try {
      switch (this.operation) {
        case 'SELECT':
          ({ sql, params } = this._buildSelect());
          break;
        case 'INSERT':
          ({ sql, params } = this._buildInsert());
          break;
        case 'UPDATE':
          ({ sql, params } = this._buildUpdate());
          break;
        case 'DELETE':
          ({ sql, params } = this._buildDelete());
          break;
        case 'UPSERT':
          ({ sql, params } = this._buildUpsert());
          break;
        default:
          throw new Error(`Unknown operation: ${this.operation}`);
      }

      log.debug('[PG Query]', { sql: sql.substring(0, 300), paramCount: params.length });

      result = await pool.query(sql, params);

      let data = result.rows;
      let count = null;

      // Transform joined data
      if (this.operation === 'SELECT' && Object.keys(this.joinAliases).length > 0) {
        data = this._nestJoinedData(data);
      }

      if (this.countType) {
        count = result.rowCount;
      }

      if (this.returningSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
        }
        data = data[0];
      } else if (this.returningMaybeSingle) {
        data = data.length > 0 ? data[0] : null;
      }

      if (this.headOnly) {
        data = null;
      }

      return { data, error: null, count };

    } catch (error) {
      log.error('[PG Query Error]', {
        error: error.message,
        sql: sql?.substring(0, 300),
        table: this.tableName
      });
      return { data: null, error: { message: error.message, code: error.code } };
    }
  }

  _buildSelect() {
    let sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;

    // Add JOIN clauses
    for (const join of this.joins) {
      sql += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.${join.fk} = ${join.alias}.id`;
    }

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }

    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }

    if (this.offsetClause) {
      sql += ` ${this.offsetClause}`;
    }

    return { sql, params: this.whereParams };
  }

  _buildInsert() {
    if (!this.insertData || this.insertData.length === 0) {
      throw new Error('No data to insert');
    }

    const firstRow = this.insertData[0];
    const columns = Object.keys(firstRow);
    const allParams = [];
    const valueSets = [];

    for (const row of this.insertData) {
      const placeholders = columns.map(() => {
        const ph = `$${this.paramIndex}`;
        this.paramIndex++;
        return ph;
      });
      valueSets.push(`(${placeholders.join(', ')})`);
      columns.forEach(col => allParams.push(row[col]));
    }

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${valueSets.join(', ')} RETURNING *`;

    return { sql, params: allParams };
  }

  _buildUpdate() {
    if (!this.updateData) {
      throw new Error('No data to update');
    }

    const setClauses = [];
    const updateParams = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(this.updateData)) {
      setClauses.push(`${key} = $${paramIdx}`);
      updateParams.push(value);
      paramIdx++;
    }

    const adjustedWhereParams = this.whereParams;
    const adjustedWhereConditions = this.whereConditions.map(cond => {
      return cond.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + paramIdx - 1}`);
    });

    let sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')}`;

    if (adjustedWhereConditions.length > 0) {
      sql += ` WHERE ${adjustedWhereConditions.join(' AND ')}`;
    }

    sql += ' RETURNING *';

    return { sql, params: [...updateParams, ...adjustedWhereParams] };
  }

  _buildDelete() {
    let sql = `DELETE FROM ${this.tableName}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    sql += ' RETURNING *';

    return { sql, params: this.whereParams };
  }

  _buildUpsert() {
    if (!this.insertData || this.insertData.length === 0) {
      throw new Error('No data to upsert');
    }

    const firstRow = this.insertData[0];
    const columns = Object.keys(firstRow);
    const allParams = [];
    const valueSets = [];

    for (const row of this.insertData) {
      const placeholders = columns.map(() => {
        const ph = `$${this.paramIndex}`;
        this.paramIndex++;
        return ph;
      });
      valueSets.push(`(${placeholders.join(', ')})`);
      columns.forEach(col => allParams.push(row[col]));
    }

    const updateClauses = columns
      .filter(col => col !== this.upsertConflict)
      .map(col => `${col} = EXCLUDED.${col}`);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')})
                 VALUES ${valueSets.join(', ')}
                 ON CONFLICT (${this.upsertConflict})
                 DO UPDATE SET ${updateClauses.join(', ')}
                 RETURNING *`;

    return { sql, params: allParams };
  }
}

async function rpc(functionName, params = {}) {
  try {
    const paramNames = Object.keys(params);
    const paramValues = Object.values(params);
    const placeholders = paramNames.map((_, i) => `$${i + 1}`);

    let sql;
    if (paramNames.length > 0) {
      sql = `SELECT * FROM ${functionName}(${placeholders.join(', ')})`;
    } else {
      sql = `SELECT * FROM ${functionName}()`;
    }

    const result = await pool.query(sql, paramValues);
    return { data: result.rows, error: null };
  } catch (error) {
    log.error('[PG RPC Error]', { function: functionName, error: error.message });
    return { data: null, error: { message: error.message, code: error.code } };
  }
}

const supabase = {
  from: (tableName) => new QueryBuilder(tableName),
  rpc: rpc,

  storage: {
    from: (_bucket) => ({
      upload: () => ({ data: null, error: { message: 'Storage not implemented' } }),
      download: () => ({ data: null, error: { message: 'Storage not implemented' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: () => ({ data: null, error: { message: 'Storage not implemented' } }),
    })
  },

  auth: {
    getUser: () => ({ data: { user: null }, error: null }),
    signOut: () => ({ error: null }),
  }
};

export const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    log.info('[PG] Database connected successfully', {
      time: result.rows[0].now,
      host: process.env.DB_HOST
    });
    return true;
  } catch (error) {
    log.error('[PG] Database connection failed', { error: error.message });
    return false;
  }
};

export const getPool = () => pool;

export const closePool = async () => {
  await pool.end();
  log.info('[PG] Pool closed');
};

export { supabase, pool };
export default supabase;
