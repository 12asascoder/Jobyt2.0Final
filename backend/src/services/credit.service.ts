import pool from '../config/database';
import { PoolClient } from 'pg';
import { CreditModel } from '../models/credit.model';

const REGISTRATION_CREDITS = parseInt(process.env.REGISTRATION_CREDIT_AMOUNT || '150');
const JOB_POST_COST = parseInt(process.env.JOB_POSTING_CREDIT_COST || '10');
const REFERRAL_REWARD = 50; // configurable — move to DB/env
const REFERRAL_JOIN_BONUS = 25;

export const CreditService = {
  async grantRegistrationCredits(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`, [REGISTRATION_CREDITS, userId]);
      const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
      await CreditModel.record(client, {
        user_id: userId,
        type: 'credit',
        amount: REGISTRATION_CREDITS,
        balance_after: rows[0].credit_balance,
        description: 'Welcome bonus — account registration',
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deductJobPostingCredits(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const balance: number = rows[0].credit_balance;
      if (balance < JOB_POST_COST) throw new Error('Insufficient credits');
      const newBalance = balance - JOB_POST_COST;
      await client.query(`UPDATE users SET credit_balance = $1 WHERE id = $2`, [newBalance, userId]);
      await CreditModel.record(client, {
        user_id: userId,
        type: 'debit',
        amount: JOB_POST_COST,
        balance_after: newBalance,
        description: 'Job listing posted',
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async grantReferralRewards(referrerId: string, referredId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Referrer reward
      await client.query(`UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`, [REFERRAL_REWARD, referrerId]);
      const { rows: rRows } = await client.query('SELECT credit_balance FROM users WHERE id = $1', [referrerId]);
      await CreditModel.record(client, {
        user_id: referrerId,
        type: 'credit',
        amount: REFERRAL_REWARD,
        balance_after: rRows[0].credit_balance,
        description: 'Referral reward — new user joined',
        reference_id: referredId,
      });

      // Referred user join bonus
      await client.query(`UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`, [REFERRAL_JOIN_BONUS, referredId]);
      const { rows: dRows } = await client.query('SELECT credit_balance FROM users WHERE id = $1', [referredId]);
      await CreditModel.record(client, {
        user_id: referredId,
        type: 'credit',
        amount: REFERRAL_JOIN_BONUS,
        balance_after: dRows[0].credit_balance,
        description: 'Referral join bonus',
        reference_id: referrerId,
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async grantPlanCredits(userId: string, credits: number, paymentId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`, [credits, userId]);
      const { rows } = await client.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
      await CreditModel.record(client, {
        user_id: userId,
        type: 'credit',
        amount: credits,
        balance_after: rows[0].credit_balance,
        description: `Subscription plan credits`,
        reference_id: paymentId,
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
