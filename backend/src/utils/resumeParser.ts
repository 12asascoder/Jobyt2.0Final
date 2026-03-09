import pdfParse from 'pdf-parse';

export interface ParsedResume {
  rawText: string;
  skills: string[];
  emails: string[];
  phones: string[];
  name: string | null;
}

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP',
  'Azure', 'Git', 'GraphQL', 'REST', 'HTML', 'CSS', 'Tailwind', 'Next.js', 'Vue',
  'Angular', 'Spring', 'Django', 'FastAPI', 'C++', 'C#', 'Swift', 'Kotlin',
  'Flutter', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
];

export async function parseResume(buffer: Buffer): Promise<ParsedResume> {
  const data = await pdfParse(buffer);
  const text = data.text;

  // Extract emails
  const emails = [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];

  // Extract phones
  const phones = [...new Set(text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g) || [])];

  // Extract skills (case-insensitive match against known skills list)
  const upperText = text.toUpperCase();
  const skills = COMMON_SKILLS.filter(s => upperText.includes(s.toUpperCase()));

  // Try to extract name from first non-empty line under 50 chars
  const firstLine = text.split('\n').find(l => l.trim().length > 2 && l.trim().length < 50);
  const name = firstLine?.trim() || null;

  return { rawText: text, skills, emails, phones, name };
}
