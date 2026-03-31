import pool from '../config/database';
import { PoolClient } from 'pg';
import { CreditModel } from '../models/credit.model';
import { CreditStatus } from '../models/credit.model';

const REGISTRATION_CREDITS = parseInt(process.env.REGISTRATION_CREDIT_AMOUNT || '150');
const JOB_POST_COST = parseInt(process.env.JOB_POSTING_CREDIT_COST || '10');
const LOW_CREDIT_THRESHOLD = (() => {
  const n = parseInt(process.env.LOW_CREDIT_THRESHOLD ?? '10', 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
})();
const REFERRAL_REWARD = 50; // configurable — move to DB/env
const REFERRAL_JOIN_BONUS = 25;
const COMMUNITY_REFERRAL_REWARD = 20; // For referrer when code is redeemed
const COMMUNITY_REFERRAL_BONUS = 10; // For user redeeming code

async function addCreditsTx(
  client: PoolClient,
  userId: string,
  amount: number,
  description: string,
  referenceId?: string,
  status: CreditStatus = 'success',
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
    status,
    balance_after: rows[0].credit_balance,
    description,
    reference_id: referenceId,
  });
}

export type DeductCreditsResult = {
  transactionId: string;
  balanceAfter: number;
};

async function deductCreditsTx(
  client: PoolClient,
  userId: string,
  amount: number,
  description: string,
  referenceId?: string,
  status: CreditStatus = 'success',
): Promise<DeductCreditsResult> {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (!description || description.trim() === '') throw new Error('Ledger description required');

  const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [
    userId,
  ]);
  if (!rows[0]) throw new Error('User not found');
  const balance: number = rows[0].credit_balance;
  if (balance < amount)
    throw Object.assign(new Error('Insufficient credits'), {
      statusCode: 402,
      error: 'INSUFFICIENT_CREDITS',
      required: amount,
      available: balance,
    });
  const newBalance = balance - amount;
  await client.query(`UPDATE users SET credit_balance = $1 WHERE id = $2`, [newBalance, userId]);
  const recorded = await CreditModel.record(client, {
    user_id: userId,
    type: 'debit',
    amount,
    status,
    balance_after: newBalance,
    description,
    reference_id: referenceId,
  });
  return { transactionId: recorded.id, balanceAfter: recorded.balance_after };
}

export const CreditService = {
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    client?: PoolClient,
    status: CreditStatus = 'success',
  ): Promise<void> {
    console.log(`[CREDIT] credit ${amount} for user ${userId}`);
    const db = client ?? (await pool.connect());
    const shouldManageTx = !client;
    try {
      if (shouldManageTx) await db.query('BEGIN');

      await addCreditsTx(db, userId, amount, description, referenceId, status);

      if (shouldManageTx) await db.query('COMMIT');
    } catch (err) {
      if (shouldManageTx) await db.query('ROLLBACK');
      throw err;
    } finally {
      if (shouldManageTx) db.release();
    }
  },

  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    client?: PoolClient,
    status: CreditStatus = 'success',
  ): Promise<DeductCreditsResult> {
    console.log(`[CREDIT] debit ${amount} for user ${userId}`);
    const db = client ?? (await pool.connect());
    const shouldManageTx = !client;
    try {
      if (shouldManageTx) await db.query('BEGIN');

      const result = await deductCreditsTx(db, userId, amount, description, referenceId, status);

      if (shouldManageTx) await db.query('COMMIT');
      return result;
    } catch (err) {
      if (shouldManageTx) await db.query('ROLLBACK');
      throw err;
    } finally {
      if (shouldManageTx) db.release();
    }
  },

  async getBalance(userId: string): Promise<number> {
    const balance = await CreditModel.getBalance(userId);
    if (balance === null) {
      throw Object.assign(new Error('User not found'), {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    }
    return balance;
  },

  /** Balance plus low-credit flag for API consumers (threshold from LOW_CREDIT_THRESHOLD). */
  async getBalanceState(userId: string): Promise<{ balance: number; low_credit: boolean }> {
    const balance = await CreditService.getBalance(userId);
    return { balance, low_credit: balance < LOW_CREDIT_THRESHOLD };
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

  async grantCommunityReferralRewards(referrerId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Referrer reward
      await addCreditsTx(
        client,
        referrerId,
        COMMUNITY_REFERRAL_REWARD,
        'Community referral reward — code redeemed',
        userId,
      );

      // User redeeming code bonus
      await addCreditsTx(
        client,
        userId,
        COMMUNITY_REFERRAL_BONUS,
        'Community referral bonus — code redeemed',
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
