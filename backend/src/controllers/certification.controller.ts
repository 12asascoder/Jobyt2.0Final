import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/appError';

export const CertificationController = {
  /**
   * Get all certifications for the current user or a target user.
   */
  async getCertifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.params.userId as string) || (req.user?.userId as string);
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const certifications = await prisma.applicant_certifications.findMany({
        where: { user_id: userId },
        orderBy: { issue_date: 'desc' },
      });

      sendSuccess(res, certifications, 'Certifications retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add a new certification.
   */
  async addCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const { name, issuer, issue_date, credential_url, file_url } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new AppError('Certification name is required', 400);
      }
      if (!issuer || typeof issuer !== 'string' || !issuer.trim()) {
        throw new AppError('Issuer is required', 400);
      }

      const parsedDate = issue_date ? new Date(issue_date) : null;

      const certification = await prisma.applicant_certifications.create({
        data: {
          user_id: userId,
          name: name.trim(),
          issuer: issuer.trim(),
          issue_date: parsedDate,
          credential_url: credential_url || null,
          file_url: file_url || null,
        },
      });

      sendSuccess(res, certification, 'Certification added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing certification.
   */
  async updateCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const id = req.params.id as string;
      const { name, issuer, issue_date, credential_url, file_url } = req.body;

      // Verify ownership
      const existing = await prisma.applicant_certifications.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        throw new AppError('Certification not found or unauthorized', 404);
      }

      const parsedDate = issue_date !== undefined ? (issue_date ? new Date(issue_date) : null) : undefined;

      const updated = await prisma.applicant_certifications.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          issuer: issuer !== undefined ? issuer.trim() : undefined,
          issue_date: parsedDate,
          credential_url: credential_url !== undefined ? (credential_url || null) : undefined,
          file_url: file_url !== undefined ? (file_url || null) : undefined,
        },
      });

      sendSuccess(res, updated, 'Certification updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a certification.
   */
  async deleteCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const id = req.params.id as string;

      // Verify ownership
      const existing = await prisma.applicant_certifications.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        throw new AppError('Certification not found or unauthorized', 404);
      }

      await prisma.applicant_certifications.delete({
        where: { id },
      });

      sendSuccess(res, null, 'Certification deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
