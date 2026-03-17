import pool from '../config/database';

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

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null> {
    const { rows } = await pool.query(
      'SELECT * FROM applications WHERE job_id = $1 AND applicant_id = $2',
      [jobId, applicantId],
    );
    return rows[0] || null;
  },

  async create(data: {
    job_id: string;
    applicant_id: string;
    cover_letter?: string;
    resume_snapshot_url?: string;
  }): Promise<Application> {
    const { rows } = await pool.query(
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
};
