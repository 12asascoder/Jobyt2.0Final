import { UserModel } from '../models/user.model';
import { JobModel } from '../models/job.model';
import { CreditModel } from '../models/credit.model';
import { AdminAuditLogModel } from '../models/adminAuditLog.model';
import { NotificationModel } from '../models/notification.model';
import { CreditService } from './credit.service';
import { AppError } from '../utils/appError';
import pool from '../config/database';
import { PoolClient } from 'pg';

export const AdminService = {
  // ── Users ───────────────────────────────────────────────────────────────────

  async listUsers(filters: { search?: string; role?: string; page: number; limit: number }) {
    return UserModel.adminList({
      search: filters.search,
      role: filters.role as 'applicant' | 'recruiter' | 'admin' | undefined,
      page: filters.page,
      limit: filters.limit,
    });
  },

  async getUserById(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async banUser(adminId: string, userId: string, reason: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.banned_at) throw new AppError('User is already banned', 400);

    await UserModel.ban(userId);
    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'BAN_USER',
      target_type: 'user',
      target_id: userId,
      reason,
    });
  },

  async unbanUser(adminId: string, userId: string, reason?: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.banned_at) throw new AppError('User is not banned', 400);

    await UserModel.unban(userId);
    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'UNBAN_USER',
      target_type: 'user',
      target_id: userId,
      reason,
    });
  },

  async deleteUser(adminId: string, userId: string, reason: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'DELETE_USER',
      target_type: 'user',
      target_id: userId,
      reason,
    });
  },

  // ── Jobs ─────────────────────────────────────────────────────────────────────

  async listJobs(filters: { status?: string; search?: string; page: number; limit: number }) {
    return JobModel.adminList(filters);
  },

  async closeJob(adminId: string, jobId: string, reason: string) {
    const job = await JobModel.findById(jobId);
    if (!job) throw new AppError('Job not found', 404);

    await JobModel.update(jobId, { status: 'closed' });
    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'CLOSE_JOB',
      target_type: 'job',
      target_id: jobId,
      reason,
    });
  },

  async deleteJob(adminId: string, jobId: string, reason: string) {
    const job = await JobModel.findById(jobId);
    if (!job) throw new AppError('Job not found', 404);

    await JobModel.softDelete(jobId);
    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'DELETE_JOB',
      target_type: 'job',
      target_id: jobId,
      reason,
    });
  },

  // ── Credits ──────────────────────────────────────────────────────────────────

  async getAllTransactions(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM credit_transactions'),
      pool.query(
        `SELECT ct.*, u.email FROM credit_transactions ct
         JOIN users u ON u.id = ct.user_id
         ORDER BY ct.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
    ]);
    return { transactions: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  async adjustCredits(adminId: string, userId: string, amount: number, reason: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (amount < 0 && user.credit_balance + amount < 0) {
      throw new AppError('Adjustment would result in negative balance', 400);
    }

    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      const newBalance = user.credit_balance + amount;
      await client.query(`UPDATE users SET credit_balance = $1, updated_at = NOW() WHERE id = $2`, [
        newBalance,
        userId,
      ]);
      await CreditModel.record(client, {
        user_id: userId,
        type: amount > 0 ? 'credit' : 'debit',
        amount: Math.abs(amount),
        balance_after: newBalance,
        description: `Admin adjustment: ${reason}`,
        reference_id: adminId,
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await AdminAuditLogModel.create({
      admin_id: adminId,
      action: 'ADJUST_CREDITS',
      target_type: 'user',
      target_id: userId,
      reason: `Amount: ${amount}, Reason: ${reason}`,
    });

    await NotificationModel.create({
      user_id: userId,
      type: amount > 0 ? 'payment_success' : 'low_credit',
      title: 'Credit balance adjusted',
      body: `An admin has ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits. Reason: ${reason}`,
      action_url: '/credits',
    });
  },

  // ── Metrics ──────────────────────────────────────────────────────────────────

  async getPlatformMetrics() {
    return UserModel.getPlatformMetrics();
  },

  async getDailyStats(days = 30) {
    const { rows } = await pool.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) FILTER (WHERE role = 'applicant')::int AS new_applicants,
         COUNT(*) FILTER (WHERE role = 'recruiter')::int AS new_recruiters
       FROM users
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
    );
    return rows;
  },

  // ── Audit Log ─────────────────────────────────────────────────────────────────

  async getAuditLog(page: number, limit: number) {
    return AdminAuditLogModel.findAll(page, limit);
  },
};
