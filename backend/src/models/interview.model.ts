import pool from '../config/database';

export type InterviewStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  candidate_id: string;
  status: InterviewStatus;
  code_content: string | null;
  code_language: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  scheduled_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string;
  job_title?: string;
  candidate_name?: string;
  interviewer_name?: string;
  ai_interview_type?: string | null;
  ai_interview_rubric?: string | null;
  ai_interview_threshold?: number | null;
}

export const InterviewModel = {
  async createInterview(data: {
    application_id: string;
    interviewer_id: string;
    candidate_id: string;
    scheduled_at: Date;
  }): Promise<Interview> {
    const { rows } = await pool.query(
      `INSERT INTO interviews (application_id, interviewer_id, candidate_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
      [data.application_id, data.interviewer_id, data.candidate_id, data.scheduled_at],
    );
    return rows[0];
  },

  async getById(id: string): Promise<Interview | null> {
    const { rows } = await pool.query(
      `SELECT i.*, 
              j.title as job_title, 
              j.company_name,
              j.ai_interview_type,
              j.ai_interview_rubric,
              j.ai_interview_threshold,
              ap.name as candidate_name,
              rp.name as interviewer_name
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
       LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
       WHERE i.id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async getByApplicationId(applicationId: string): Promise<Interview[]> {
    const { rows } = await pool.query(
      `SELECT i.*, 
              j.title as job_title, 
              j.company_name
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE i.application_id = $1
       ORDER BY i.created_at DESC`,
      [applicationId],
    );
    return rows;
  },

  async updateInterview(id: string, data: Partial<Interview>): Promise<Interview> {
    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIndex = 1;

    // Filter fields to avoid raw SQL syntax issues
    const fieldsToUpdate = [
      'status',
      'code_content',
      'code_language',
      'notes',
      'feedback',
      'rating',
      'started_at',
      'ended_at',
    ];

    for (const key of fieldsToUpdate) {
      if (data[key as keyof Partial<Interview>] !== undefined) {
        fields.push(`${key} = $${placeholderIndex}`);
        values.push(data[key as keyof Partial<Interview>]);
        placeholderIndex++;
      }
    }

    if (fields.length === 0) {
      const { rows } = await pool.query(`SELECT * FROM interviews WHERE id = $1`, [id]);
      return rows[0];
    }

    // Always update the updated_at timestamp
    fields.push(`updated_at = NOW()`);

    values.push(id);
    const queryStr = `UPDATE interviews SET ${fields.join(', ')} WHERE id = $${placeholderIndex} RETURNING *`;
    
    const { rows } = await pool.query(queryStr, values);
    return rows[0];
  },

  async listUserInterviews(userId: string, role: string): Promise<Interview[]> {
    let queryStr = '';
    let params: any[] = [];

    if (role === 'admin') {
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        ORDER BY i.scheduled_at DESC`;
    } else if (role === 'recruiter') {
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        WHERE i.interviewer_id = $1
        ORDER BY i.scheduled_at DESC`;
      params = [userId];
    } else {
      // applicant
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        WHERE i.candidate_id = $1
        ORDER BY i.scheduled_at DESC`;
      params = [userId];
    }

    const { rows } = await pool.query(queryStr, params);
    return rows;
  },

  async isParticipant(interviewId: string, userId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM interviews 
       WHERE id = $1 AND (candidate_id = $2 OR interviewer_id = $3)
       LIMIT 1`,
      [interviewId, userId, userId],
    );
    return rows.length > 0;
  },
};
