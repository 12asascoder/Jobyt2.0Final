import pool from '../config/database';
import { PoolClient } from 'pg';
import { CreditModel } from '../models/credit.model';

const REGISTRATION_CREDITS = parseInt(process.env.REGISTRATION_CREDIT_AMOUNT || '150');
const JOB_POST_COST = parseInt(process.env.JOB_POSTING_CREDIT_COST || '10');
const REFERRAL_REWARD = 50; // configurable — move to DB/env
const REFERRAL_JOIN_BONUS = 25;

async function addCreditsTx(
  client: PoolClient,
  userId: string,
  amount: number,
  description: string,
  referenceId?: string,
): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (!description || description.trim() === '') throw new Error('Ledger description required');

  await client.query(`UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`, [
    amount,
    userId,
  ]);
  const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw new Error('User not found');
  await CreditModel.record(client, {
    user_id: userId,
    type: 'credit',
    amount,
    balance_after: rows[0].credit_balance,
    description,
    reference_id: referenceId,
  });
}

async function deductCreditsTx(
  client: PoolClient,
  userId: string,
  amount: number,
  description: string,
  referenceId?: string,
): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (!description || description.trim() === '') throw new Error('Ledger description required');

  const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [
    userId,
  ]);
  if (!rows[0]) throw new Error('User not found');
  const balance: number = rows[0].credit_balance;
  if (balance < amount) throw Object.assign(new Error('Insufficient credits'), { statusCode: 400 });
  const newBalance = balance - amount;
  await client.query(`UPDATE users SET credit_balance = $1 WHERE id = $2`, [newBalance, userId]);
  await CreditModel.record(client, {
    user_id: userId,
    type: 'debit',
    amount,
    balance_after: newBalance,
    description,
    reference_id: referenceId,
  });
}

export const CreditService = {
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ): Promise<void> {
    console.log(`[CREDIT] credit ${amount} for user ${userId}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await addCreditsTx(client, userId, amount, description, referenceId);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ): Promise<void> {
    console.log(`[CREDIT] debit ${amount} for user ${userId}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await deductCreditsTx(client, userId, amount, description, referenceId);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getBalance(userId: string): Promise<number> {
    return CreditModel.getBalance(userId);
  },

  async getLedger(userId: string, page = 1, limit = 20) {
    return CreditModel.getHistory(userId, page, limit);
  },

  async grantRegistrationCredits(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT 1 FROM credit_transactions
         WHERE user_id = $1
         AND description = 'Welcome bonus — account registration'`,
        [userId],
      );
      if (existing.rowCount && existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return;
      }
      await addCreditsTx(
        client,
        userId,
        REGISTRATION_CREDITS,
        'Welcome bonus — account registration',
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deductJobPostingCredits(userId: string): Promise<void> {
    await CreditService.deductCredits(userId, JOB_POST_COST, 'Job listing posted');
  },

  async grantReferralRewards(referrerId: string, referredId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Referrer reward
      await addCreditsTx(
        client,
        referrerId,
        REFERRAL_REWARD,
        'Referral reward — new user joined',
        referredId,
      );

      // Referred user join bonus
      await addCreditsTx(
        client,
        referredId,
        REFERRAL_JOIN_BONUS,
        'Referral join bonus',
        referrerId,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async grantPlanCredits(userId: string, credits: number, paymentId: string): Promise<void> {
    await CreditService.addCredits(userId, credits, 'Subscription plan credits', paymentId);
  },
};
