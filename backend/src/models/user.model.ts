import pool from '../config/database';
import { UserRole } from '../types';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_verified: boolean;
  verify_token: string | null;
  reset_token: string | null;
  reset_token_expires_at: Date | null;
  referral_code: string;
  credit_balance: number;
  banned_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findByVerifyToken(token: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE verify_token = $1', [token]);
    return rows[0] || null;
  },

  async findByResetToken(token: string): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > NOW()',
      [token]
    );
    return rows[0] || null;
  },

  async findByReferralCode(code: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE referral_code = $1', [code]);
    return rows[0] || null;
  },

  async create(data: {
    email: string;
    password_hash: string;
    role: UserRole;
    verify_token: string;
    referral_code: string;
  }): Promise<User> {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, role, verify_token, referral_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.email, data.password_hash, data.role, data.verify_token, data.referral_code]
    );
    return rows[0];
  },

  async verify(id: string): Promise<void> {
    await pool.query(
      `UPDATE users SET is_verified = TRUE, verify_token = NULL, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async setResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expires_at = $2, updated_at = NOW() WHERE id = $3`,
      [token, expiresAt, id]
    );
  },

  async updatePassword(id: string, password_hash: string): Promise<void> {
    await pool.query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW() WHERE id = $2`,
      [password_hash, id]
    );
  },

  async updateCreditBalance(id: string, newBalance: number, client?: typeof pool): Promise<void> {
    const db = client || pool;
    await db.query(`UPDATE users SET credit_balance = $1, updated_at = NOW() WHERE id = $2`, [newBalance, id]);
  },

  async ban(id: string): Promise<void> {
    await pool.query(`UPDATE users SET banned_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]);
  },

  async unban(id: string): Promise<void> {
    await pool.query(`UPDATE users SET banned_at = NULL, updated_at = NOW() WHERE id = $1`, [id]);
  },

  async adminList(filters: {
    search?: string;
    role?: UserRole;
    page: number;
    limit: number;
  }): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`email ILIKE $${idx}`);
      params.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.role) {
      conditions.push(`role = $${idx}`);
      params.push(filters.role);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
      pool.query(
        `SELECT id, email, role, is_verified, credit_balance, banned_at, created_at FROM users ${where}
         ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, filters.limit, offset]
      ),
    ]);

    return { users: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  async adminAdjustCredits(userId: string, newBalance: number): Promise<void> {
    await pool.query(`UPDATE users SET credit_balance = $1, updated_at = NOW() WHERE id = $2`, [newBalance, userId]);
  },

  async getPlatformMetrics(): Promise<{
    totalUsers: number;
    totalApplicants: number;
    totalRecruiters: number;
    totalJobs: number;
    totalApplications: number;
    totalRevenue: number;
    newUsersToday: number;
    activeJobsCount: number;
  }> {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS "totalUsers",
        (SELECT COUNT(*) FROM users WHERE role = 'applicant')::int AS "totalApplicants",
        (SELECT COUNT(*) FROM users WHERE role = 'recruiter')::int AS "totalRecruiters",
        (SELECT COUNT(*) FROM jobs WHERE deleted_at IS NULL)::int AS "totalJobs",
        (SELECT COUNT(*) FROM jobs WHERE status = 'active' AND deleted_at IS NULL)::int AS "activeJobsCount",
        (SELECT COUNT(*) FROM applications)::int AS "totalApplications",
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success') AS "totalRevenue",
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '1 day')::int AS "newUsersToday"
    `);
    return rows[0];
  },
};
