import pool from '../config/database';
import { PoolClient } from 'pg';

export type ApplicationStatus =
  | 'applied'
  | 'in_review'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_snapshot_url: string | null;
  status: ApplicationStatus;
  status_updated_at: Date;
  created_at: Date;
}

export const ApplicationModel = {
  async findById(id: string): Promise<Application | null> {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByJobAndApplicant(
    jobId: string,
    applicantId: string,
    client?: PoolClient,
  ): Promise<Application | null> {
    const db = client ?? pool;
    const { rows } = await db.query('SELECT * FROM applications WHERE job_id = $1 AND applicant_id = $2', [
      jobId,
      applicantId,
    ]);
    return rows[0] || null;
  },

  async create(
    data: {
      job_id: string;
      applicant_id: string;
      cover_letter?: string;
      resume_snapshot_url?: string;
    },
    client?: PoolClient,
  ): Promise<Application> {
    const db = client ?? pool;
    const { rows } = await db.query(
      `INSERT INTO applications (job_id, applicant_id, cover_letter, resume_snapshot_url)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [data.job_id, data.applicant_id, data.cover_letter || null, data.resume_snapshot_url || null],
    );
    return rows[0];
  },

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const { rows } = await pool.query(
      `UPDATE applications SET status = $1, status_updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return rows[0];
  },

  async findByApplicant(
    applicantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ applications: Application[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM applications WHERE applicant_id = $1', [applicantId]),
      pool.query(
        `SELECT a.*, j.title as job_title, j.location, rp.company_name
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
         WHERE a.applicant_id = $1
         ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [applicantId, limit, offset],
      ),
    ]);
    return { applications: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  async findByJob(
    jobId: string,
    page = 1,
    limit = 20,
  ): Promise<{ applications: Application[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM applications WHERE job_id = $1', [jobId]),
      pool.query(
        `SELECT a.*, ap.name, ap.photo_url, ap.skills
         FROM applications a
         JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
         WHERE a.job_id = $1
         ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [jobId, limit, offset],
      ),
    ]);
    return { applications: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  async findByApplicantWithFilters(
    applicantId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string },
    page = 1,
    limit = 20,
  ): Promise<{ applications: any[]; total: number }> {
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, j.title as job_title, j.location, j.type, j.salary_min, j.salary_max,
             rp.company_name, rp.industry
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
      WHERE a.applicant_id = $1
    `;
    const params: any[] = [applicantId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.jobTitle) {
      query += ` AND j.title ILIKE $${paramIndex}`;
      params.push(`%${filters.jobTitle}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const countQuery = query.replace(/LIMIT \$\d+ OFFSET \$\d+$/, '');
    const countSql = `SELECT COUNT(*) FROM (${countQuery}) as counted`;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countSql, params.slice(-2)),
      pool.query(query, params),
    ]);

    return { applications: dataRes.rows, total: Number.parseInt(countRes.rows[0].count) };
  },

  async getApplicationStats(applicantId: string): Promise<{
    total: number;
    applied: number;
    in_review: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  }> {
    const { rows } = await pool.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
         SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
         SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted,
         SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
         SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offer,
         SUM(CASE WHEN status = 'hired' THEN 1 ELSE 0 END) as hired,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM applications
       WHERE applicant_id = $1`,
      [applicantId],
    );
    return {
      total: Number.parseInt(rows[0].total || 0),
      applied: Number.parseInt(rows[0].applied || 0),
      in_review: Number.parseInt(rows[0].in_review || 0),
      shortlisted: Number.parseInt(rows[0].shortlisted || 0),
      interview: Number.parseInt(rows[0].interview || 0),
      offer: Number.parseInt(rows[0].offer || 0),
      hired: Number.parseInt(rows[0].hired || 0),
      rejected: Number.parseInt(rows[0].rejected || 0),
    };
  },

  async findByRecruiter(
    recruiterId: string,
    page = 1,
    limit = 20,
  ): Promise<{ applications: any[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.recruiter_id = $1`,
        [recruiterId],
      ),
      pool.query(
        `SELECT a.*, ap.name, ap.photo_url, ap.skills, ap.experience_level,
                j.title as job_title, j.location as job_location
         FROM applications a
         JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
         JOIN jobs j ON j.id = a.job_id
         WHERE j.recruiter_id = $1
         ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [recruiterId, limit, offset],
      ),
    ]);
    return { applications: dataRes.rows, total: Number.parseInt(countRes.rows[0].count) };
  },

  async findByRecruiterWithFilters(
    recruiterId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string; applicantName?: string },
    page = 1,
    limit = 20,
  ): Promise<{ applications: any[]; total: number }> {
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, ap.name, ap.photo_url, ap.skills, ap.experience_level,
             j.title as job_title, j.location as job_location
      FROM applications a
      JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
      JOIN jobs j ON j.id = a.job_id
      WHERE j.recruiter_id = $1
    `;
    const params: any[] = [recruiterId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.jobTitle) {
      query += ` AND j.title ILIKE $${paramIndex}`;
      params.push(`%${filters.jobTitle}%`);
      paramIndex++;
    }

    if (filters.applicantName) {
      query += ` AND ap.name ILIKE $${paramIndex}`;
      params.push(`%${filters.applicantName}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const countQuery = query.replace(/LIMIT \$\d+ OFFSET \$\d+$/, '');
    const countSql = `SELECT COUNT(*) FROM (${countQuery}) as counted`;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countSql, params.slice(0, paramIndex - 2)),
      pool.query(query, params),
    ]);

    return { applications: dataRes.rows, total: Number.parseInt(countRes.rows[0].count) };
  },

  async getRecruiterApplicationStats(recruiterId: string): Promise<{
    total: number;
    applied: number;
    in_review: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  }> {
    const { rows } = await pool.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN a.status = 'applied' THEN 1 ELSE 0 END) as applied,
         SUM(CASE WHEN a.status = 'in_review' THEN 1 ELSE 0 END) as in_review,
         SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted,
         SUM(CASE WHEN a.status = 'interview' THEN 1 ELSE 0 END) as interview,
         SUM(CASE WHEN a.status = 'offer' THEN 1 ELSE 0 END) as offer,
         SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) as hired,
         SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = $1`,
      [recruiterId],
    );
    return {
      total: Number.parseInt(rows[0].total || 0),
      applied: Number.parseInt(rows[0].applied || 0),
      in_review: Number.parseInt(rows[0].in_review || 0),
      shortlisted: Number.parseInt(rows[0].shortlisted || 0),
      interview: Number.parseInt(rows[0].interview || 0),
      offer: Number.parseInt(rows[0].offer || 0),
      hired: Number.parseInt(rows[0].hired || 0),
      rejected: Number.parseInt(rows[0].rejected || 0),
    };
  },
};
