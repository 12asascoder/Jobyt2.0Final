import pool from '../config/database';
import { PoolClient } from 'pg';

export type CreditType = 'credit' | 'debit';

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditType;
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: Date;
}

export const CreditModel = {
  async getBalance(userId: string): Promise<number> {
    const { rows } = await pool.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
    return rows[0]?.credit_balance ?? 0;
  },

  async getHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
    ]);
    return { transactions: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  // Atomically debit/credit and record transaction — must be called inside a DB transaction
  async record(
    client: PoolClient,
    data: {
      user_id: string;
      type: CreditType;
      amount: number;
      balance_after: number;
      description: string;
      reference_id?: string;
    },
  ): Promise<CreditTransaction> {
    const { rows } = await client.query(
      `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        data.user_id,
        data.type,
        data.amount,
        data.balance_after,
        data.description,
        data.reference_id || null,
      ],
    );
    return rows[0];
  },
};
