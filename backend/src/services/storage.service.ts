import fs from 'fs/promises';
import path from 'path';
import { deleteFromS3, uploadToS3 } from '../utils/s3';

export interface UploadResult {
  url: string;
}

function isLocalStorage(): boolean {
  const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
  return storageType !== 's3';
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

async function localUploadPhoto(file: Express.Multer.File, folder: string): Promise<UploadResult> {
  const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_') || 'photo';
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
  };
}

async function s3UploadPhoto(file: Express.Multer.File, folder: string): Promise<UploadResult> {
  const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, folder);
  return { url };
}

export const StorageService = {
  async uploadResume(file: Express.Multer.File): Promise<UploadResult> {
    if (isLocalStorage()) {
      return localUploadResume(file);
    }
    return s3UploadResume(file);
  },

  async uploadPhoto(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    if (isLocalStorage()) {
      return localUploadPhoto(file, folder);
    }
    return s3UploadPhoto(file, folder);
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
