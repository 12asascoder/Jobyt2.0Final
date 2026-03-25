import fs from 'fs/promises';
import path from 'path';
import { deleteFromS3, uploadToS3 } from '../utils/s3';

export interface UploadResult {
  url: string;
}

function isLocalStorage(): boolean {
  return (process.env.STORAGE_TYPE || '').toLowerCase() === 'local';
}

async function localUploadResume(file: Express.Multer.File): Promise<UploadResult> {
  const uploadDir = path.join(__dirname, '../../uploads/resumes');
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_') || 'resume';
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer);

  return {
    url: `/uploads/resumes/${filename}`,
  };
}

async function s3UploadResume(file: Express.Multer.File): Promise<UploadResult> {
  const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'resumes');
  return { url };
}

export const StorageService = {
  async uploadResume(file: Express.Multer.File): Promise<UploadResult> {
    if (isLocalStorage()) {
      return localUploadResume(file);
    }
    return s3UploadResume(file);
  },

  async deleteByUrl(url: string): Promise<void> {
    if (!url) return;

    if (isLocalStorage()) {
      // URLs are served as /uploads/<relative path>; map them to backend/uploads/<relative path>.
      if (!url.startsWith('/uploads/')) return;
      const relativePath = url.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../../uploads', relativePath);
      await fs.unlink(fullPath).catch(() => undefined);
      return;
    }

    await deleteFromS3(url).catch(() => undefined);
  },
};
