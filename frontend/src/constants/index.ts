export const APP_NAME = 'Hiring Platform';
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'remote', 'internship'] as const;

export const APPLICATION_STATUSES = [
  'applied', 'in_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected',
] as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  in_review: 'In Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  interview: 'bg-orange-100 text-orange-700',
  offer: 'bg-teal-100 text-teal-700',
  hired: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  // Applicant
  dashboard: '/dashboard',
  profile: '/profile',
  jobs: '/jobs',
  jobDetail: (id: string) => `/jobs/${id}`,
  applications: '/applications',
  savedJobs: '/saved-jobs',
  credits: '/credits',
  notifications: '/notifications',
  referral: '/referral',
  messages: '/messages',
  messageThread: (id: string) => `/messages/${id}`,
  // Recruiter
  recruiterDashboard: '/recruiter/dashboard',
  recruiterJobs: '/recruiter/jobs',
  recruiterNewJob: '/recruiter/jobs/new',
  recruiterJobDetail: (id: string) => `/recruiter/jobs/${id}`,
  recruiterJobApplications: (id: string) => `/recruiter/jobs/${id}/applications`,
  recruiterAnalytics: '/recruiter/analytics',
  recruiterCredits: '/recruiter/credits',
  // Admin
  adminDashboard: '/admin/dashboard',
  adminUsers: '/admin/users',
  adminJobs: '/admin/jobs',
  adminCredits: '/admin/credits',
};
