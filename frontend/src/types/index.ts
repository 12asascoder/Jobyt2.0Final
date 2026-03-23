// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'applicant' | 'recruiter' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export interface ApplicantProfile {
  user_id: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  resume_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
  is_current: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface RecruiterProfile {
  user_id: string;
  name: string | null;
  company_name: string | null;
  industry: string | null;
  description: string | null;
  company_size: string | null;
  logo_url: string | null;
  website: string | null;
  location: string | null;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
export type JobStatus = 'draft' | 'active' | 'closed';

export interface Job {
  id: string;
  recruiter_id: string;
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
  company_name?: string;
  created_at: string;
}

// ── Applications ─────────────────────────────────────────────────────────────
export type ApplicationStatus =
  | 'APPLIED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'HIRED' | 'REJECTED';

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_snapshot_url: string | null;
  status: ApplicationStatus;
  status_updated_at: string;
  created_at: string;
  // joined fields
  job_title?: string;
  location?: string;
  company_name?: string;
}

export interface PipelineEvent {
  id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  changed_by: {
    id: string;
    role: string;
    name: string | null;
  } | null;
}

// ── Credits ───────────────────────────────────────────────────────────────────
export type CreditType = 'credit' | 'debit';

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditType;
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

// ── Messages ──────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  last_message_at: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType =
  | 'job_match' | 'application_status' | 'new_message'
  | 'referral_joined' | 'low_credit' | 'payment_success' | 'payment_failed' | 'application_submitted';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

// ── Payments ──────────────────────────────────────────────────────────────────
export interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
