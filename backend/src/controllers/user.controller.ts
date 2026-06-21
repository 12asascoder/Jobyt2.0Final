import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import pool from '../config/database';
import { DeviceTokenModel } from '../models/deviceToken.model';

export const UserController = {
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.getProfile(req.user!.userId, req.user!.role);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = await pool.query(
        'SELECT email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled FROM users WHERE id = $1',
        [req.user!.userId]
      );
      sendSuccess(res, rows[0]);
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled } = req.body;
      const { rows } = await pool.query(
        `UPDATE users 
         SET email_alerts_enabled = COALESCE($1, email_alerts_enabled),
             whatsapp_alerts_enabled = COALESCE($2, whatsapp_alerts_enabled),
             push_alerts_enabled = COALESCE($3, push_alerts_enabled)
         WHERE id = $4 RETURNING email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled`,
        [email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled, req.user!.userId]
      );
      sendSuccess(res, rows[0], 'Preferences updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, platform } = req.body;
      const deviceToken = await DeviceTokenModel.register(req.user!.userId, token, platform);
      
      // Automatically enable push alerts when registering device token successfully
      await pool.query(
        'UPDATE users SET push_alerts_enabled = TRUE WHERE id = $1',
        [req.user!.userId]
      );

      sendSuccess(res, deviceToken, 'Device token registered successfully');
    } catch (err) {
      next(err);
    }
  },

  async removeDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await DeviceTokenModel.deleteToken(token);
      sendSuccess(res, null, 'Device token removed successfully');
    } catch (err) {
      next(err);
    }
  },


  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, userId } = req.user!;
      const data =
        role === 'applicant'
          ? await UserService.updateApplicantProfile(userId, req.body)
          : await UserService.updateRecruiterProfile(userId, req.body);
      sendSuccess(res, data, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },

  async uploadResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const data = await UserService.uploadResume(req.user!.userId, req.file);
      sendSuccess(res, data, 'Resume uploaded');
    } catch (err) {
      next(err);
    }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const data = await UserService.uploadPhoto(req.user!.userId, req.user!.role, req.file);
      sendSuccess(res, data, 'Photo uploaded');
    } catch (err) {
      next(err);
    }
  },

  async getSavedJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await UserService.getSavedJobs(req.user!.userId);
      sendSuccess(res, jobs);
    } catch (err) {
      next(err);
    }
  },

  async saveJob(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.saveJob(req.user!.userId, req.params.jobId as string);
      sendSuccess(res, null, 'Job saved');
    } catch (err) {
      next(err);
    }
  },

  async unsaveJob(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.unsaveJob(req.user!.userId, req.params.jobId as string);
      sendSuccess(res, null, 'Job removed from saved list');
    } catch (err) {
      next(err);
    }
  },

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.getPublicProfile(req.params.userId as string);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async parseResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const { parseResume } = await import('../utils/resumeParser');
       const parsed = await parseResume(req.file.buffer, {
         filename: req.file.originalname,
         mimeType: req.file.mimetype,
       });
      await UserService.syncParsedResumeToProfile(req.user!.userId, parsed);
      sendSuccess(res, parsed, 'Resume parsed successfully');
    } catch (err) {
      next(err);
    }
  },

  async importLinkedInProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const { code, state } = req.body;

      if (!code) {
        res.status(400).json({ success: false, message: 'Authorization code is required' });
        return;
      }

      // Check if it's a mock import
      const isMockCode = typeof code === 'string' && code.startsWith('mock_code_');
      const hasLinkedInSecrets = process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET;

      let importedData: any = null;

      if (isMockCode || !hasLinkedInSecrets) {
        console.log(`[UserController.importLinkedInProfile] Executing sandbox import. Code: ${code}`);
        const selectedCode = mockLinkedInProfiles[code] ? code : 'mock_code_swe';
        importedData = mockLinkedInProfiles[selectedCode];
      } else {
        console.log(`[UserController.importLinkedInProfile] Executing production import. Code: ${code}`);
        const oauthUser = await OAuthService.verifyLinkedinToken(code);
        
        // Map available production userinfo properties to candidate profile
        importedData = {
          name: oauthUser.name,
          photo_url: oauthUser.avatar,
          linkedin_url: oauthUser.email ? `https://www.linkedin.com/in/${oauthUser.providerId}` : null,
          bio: 'Imported from LinkedIn profile.',
        };
      }

      // Update candidate profile fields in DB
      const result = await UserService.updateApplicantProfile(userId, {
        name: importedData.name,
        bio: importedData.bio,
        skills: importedData.skills || [],
        experience: importedData.experience || [],
        education: importedData.education || [],
        linkedin_url: importedData.linkedin_url,
        portfolio_url: importedData.portfolio_url || null,
        github_url: importedData.github_url || null,
        photo_url: importedData.photo_url || null,
        phone: importedData.phone || null,
      });

      sendSuccess(res, result, 'LinkedIn profile synchronized successfully');
    } catch (err) {
      next(err);
    }
  },
};
