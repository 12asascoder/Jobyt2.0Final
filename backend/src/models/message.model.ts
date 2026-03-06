import pool from '../config/database';

export interface Conversation {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  last_message_at: Date;
  created_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: Date | null;
  created_at: Date;
}

export const MessageModel = {
  async findOrCreateConversation(recruiterId: string, applicantId: string, jobId?: string): Promise<Conversation> {
    const { rows: existing } = await pool.query(
      `SELECT * FROM conversations WHERE recruiter_id = $1 AND applicant_id = $2 AND job_id IS NOT DISTINCT FROM $3`,
      [recruiterId, applicantId, jobId || null]
    );
    if (existing[0]) return existing[0];
    const { rows } = await pool.query(
      `INSERT INTO conversations (recruiter_id, applicant_id, job_id) VALUES ($1,$2,$3) RETURNING *`,
      [recruiterId, applicantId, jobId || null]
    );
    return rows[0];
  },

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    const { rows } = await pool.query(
      `SELECT c.*, m.body AS last_message, m.created_at AS last_message_at
       FROM conversations c
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) m ON TRUE
       WHERE c.recruiter_id = $1 OR c.applicant_id = $1
       ORDER BY c.last_message_at DESC`,
      [userId]
    );
    return rows;
  },

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return rows;
  },

  async createMessage(data: { conversation_id: string; sender_id: string; body: string }): Promise<Message> {
    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [data.conversation_id, data.sender_id, data.body]
    );
    await pool.query(`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, [data.conversation_id]);
    return rows[0];
  },
};
