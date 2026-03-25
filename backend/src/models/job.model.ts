import pool from '../config/database';
import { PoolClient } from 'pg';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
export type JobStatus = 'draft' | 'active' | 'closed';

export interface Job {
  id: string;
  recruiter_id: string;
  company_name?: string | null;
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  type: JobType;
  skills: string[];
  description: string;
  status: JobStatus;
  is_boosted: boolean;
  views_count: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JobFilters {
  keyword?: string;
  location?: string;
  type?: JobType;
  skills?: string[];
  salary_min?: number;
  salary_max?: number;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'salary';
}

export const JobModel = {
  async findById(id: string): Promise<Job | null> {
    const { rows } = await pool.query(
      `SELECT
        jobs.*,
        recruiter_profiles.company_name
       FROM jobs
       LEFT JOIN recruiter_profiles ON recruiter_profiles.user_id = jobs.recruiter_id
       WHERE jobs.id = $1
         AND jobs.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async checkDuplicate(recruiterId: string, title: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM jobs WHERE recruiter_id = $1 AND title ILIKE $2 AND status IN ('active', 'draft') AND deleted_at IS NULL`,
      [recruiterId, title]
    );
    return rows.length > 0;
  },

  async create(data: {
    recruiter_id: string;
    title: string;
    description: string;
    type?: JobType;
    location?: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string[];
    status?: JobStatus;
  }): Promise<Job> {
    const hasType = data.type !== undefined;
    const { rows } = hasType
      ? await pool.query(
          `INSERT INTO jobs (recruiter_id, title, description, type, location, salary_min, salary_max, skills, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            data.recruiter_id,
            data.title,
            data.description,
            data.type,
            data.location || null,
            data.salary_min || null,
            data.salary_max || null,
            data.skills || [],
            data.status || 'draft',
          ],
        )
      : await pool.query(
          `INSERT INTO jobs (recruiter_id, title, description, location, salary_min, salary_max, skills, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            data.recruiter_id,
            data.title,
            data.description,
            data.location || null,
            data.salary_min || null,
            data.salary_max || null,
            data.skills || [],
            data.status || 'draft',
          ],
        );
    return rows[0];
  },

  async update(
    id: string,
    data: Partial<
      Omit<Job, 'id' | 'recruiter_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'views_count'>
    >,
  ): Promise<Job> {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw Object.assign(new Error('Job not found'), { statusCode: 404 });
      }
      return existing;
    }

    const values = Object.values(data);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE jobs SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} AND deleted_at IS NULL RETURNING *`,
      [...values, id],
    );
    return rows[0];
  },

  async closeJob(id: string): Promise<void> {
    await pool.query(
      `UPDATE jobs SET status = 'closed', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  },

  async approveJob(id: string): Promise<Job> {
    const { rows } = await pool.query(
      `UPDATE jobs SET status = 'active', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id],
    );
    return rows[0];
  },

  async softDelete(id: string): Promise<void> {
    await pool.query(`UPDATE jobs SET deleted_at = NOW() WHERE id = $1`, [id]);
  },

  async incrementViews(id: string): Promise<void> {
    await pool.query(`UPDATE jobs SET views_count = views_count + 1 WHERE id = $1`, [id]);
  },

  async search(filters: JobFilters): Promise<{ jobs: Job[]; total: number }> {
    const limit = filters.limit || 20;
    const page = filters.page || 1;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`j.status = 'active'`, `j.deleted_at IS NULL`];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.keyword) {
      conditions.push(`j.search_vector @@ plainto_tsquery('english', $${idx})`);
      params.push(filters.keyword);
      idx++;
    }
    if (filters.location) {
      conditions.push(`j.location ILIKE $${idx}`);
      params.push(`%${filters.location}%`);
      idx++;
    }
    if (filters.type) {
      conditions.push(`j.type = $${idx}`);
      params.push(filters.type);
      idx++;
    }
    if (filters.salary_min) {
      conditions.push(`j.salary_max >= $${idx}`);
      params.push(filters.salary_min);
      idx++;
    }
    if (filters.salary_max) {
      conditions.push(`j.salary_min <= $${idx}`);
      params.push(filters.salary_max);
      idx++;
    }
    if (filters.skills?.length) {
      conditions.push(`j.skills && $${idx}`);
      params.push(filters.skills);
      idx++;
    }

    const where = conditions.join(' AND ');
    const orderBy =
      filters.sort === 'salary'
        ? 'j.salary_max DESC NULLS LAST'
        : filters.sort === 'relevance' && filters.keyword
          ? `ts_rank(j.search_vector, plainto_tsquery('english', $1)) DESC`
          : 'j.created_at DESC';

    const countQuery = `SELECT COUNT(*) FROM jobs j WHERE ${where}`;
    const dataQuery = `SELECT j.*, rp.company_name FROM jobs j
      LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
      WHERE ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(dataQuery, [...params, limit, offset]),
    ]);

    return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  },

  async findAll(filters: {
    status?: JobStatus;
    type?: JobType;
    keyword?: string;
    location?: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string[];
    limit: number;
    offset: number;
  }): Promise<{ rows: Job[]; total: number }> {
    // Build WHERE clause once and reuse in both COUNT and SELECT queries.
    const conditions: string[] = ['jobs.deleted_at IS NULL'];
    const values: unknown[] = [];
    let index = 1;

    if (filters.status) {
      conditions.push(`jobs.status = $${index++}`);
      values.push(filters.status);
    }

    if (filters.type) {
      conditions.push(`jobs.type = $${index++}`);
      values.push(filters.type);
    }

    if (filters.keyword) {
      conditions.push(`(jobs.title ILIKE $${index} OR jobs.description ILIKE $${index})`);
      values.push(`%${filters.keyword}%`);
      index++;
    }

    if (filters.location) {
      conditions.push(`jobs.location ILIKE $${index++}`);
      values.push(`%${filters.location}%`);
    }

    if (filters.salary_min !== undefined) {
      // SQL three-valued logic: rows with salary_min = NULL do not satisfy >= comparisons.
      conditions.push(`jobs.salary_min >= $${index++}`);
      values.push(filters.salary_min);
    }

    if (filters.salary_max !== undefined) {
      // SQL three-valued logic: rows with salary_max = NULL do not satisfy <= comparisons.
      conditions.push(`jobs.salary_max <= $${index++}`);
      values.push(filters.salary_max);
    }

    // Guard against empty skills arrays so we never emit jobs.skills @> '{}' (which matches all rows).
    if (filters.skills && filters.skills.length > 0) {
      conditions.push(`jobs.skills @> $${index++}::text[]`);
      values.push(filters.skills);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) FROM jobs ${whereClause}`;
    const selectQuery = `SELECT jobs.*, recruiter_profiles.company_name
      FROM jobs
      LEFT JOIN recruiter_profiles ON recruiter_profiles.user_id = jobs.recruiter_id
      ${whereClause}
      ORDER BY jobs.created_at DESC, jobs.id DESC
      LIMIT $${index++} OFFSET $${index++}`;

    const [countResult, selectResult] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(selectQuery, [...values, filters.limit, filters.offset]),
    ]);

    return { rows: selectResult.rows, total: Number(countResult.rows[0].count) };
  },

  async findByRecruiter(recruiterId: string): Promise<Job[]> {
    const { rows } = await pool.query(
      `SELECT j.*,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)::int AS application_count
       FROM jobs j
       WHERE j.recruiter_id = $1 AND j.deleted_at IS NULL ORDER BY j.created_at DESC`,
      [recruiterId],
    );
    return rows;
  },

  // ── Saved Jobs ──────────────────────────────────────────────────────────────

  async saveJob(applicantId: string, jobId: string): Promise<void> {
    await pool.query(
      `INSERT INTO saved_jobs (applicant_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [applicantId, jobId],
    );
  },

  async unsaveJob(applicantId: string, jobId: string): Promise<void> {
    await pool.query(`DELETE FROM saved_jobs WHERE applicant_id = $1 AND job_id = $2`, [
      applicantId,
      jobId,
    ]);
  },

  async getSavedJobs(applicantId: string): Promise<Job[]> {
    const { rows } = await pool.query(
      `SELECT j.*, rp.company_name, sj.saved_at
       FROM saved_jobs sj
       JOIN jobs j ON j.id = sj.job_id
       LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
       WHERE sj.applicant_id = $1 AND j.deleted_at IS NULL
       ORDER BY sj.saved_at DESC`,
      [applicantId],
    );
    return rows;
  },

  async isSaved(applicantId: string, jobId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM saved_jobs WHERE applicant_id = $1 AND job_id = $2`,
      [applicantId, jobId],
    );
    return rows.length > 0;
  },

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminList(filters: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ jobs: Job[]; total: number }> {
    const conditions: string[] = ['j.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`j.status = $${idx}`);
      params.push(filters.status);
      idx++;
    }
    if (filters.search) {
      conditions.push(`j.title ILIKE $${idx}`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const offset = (filters.page - 1) * filters.limit;

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM jobs j WHERE ${where}`, params),
      pool.query(
        `SELECT j.*, rp.company_name FROM jobs j
         LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
         WHERE ${where} ORDER BY j.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, filters.limit, offset],
      ),
    ]);

    return { jobs: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },
};
