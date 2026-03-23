import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role, referralCode } = req.body;
      const data = await AuthService.register(email, password, role, referralCode);
      sendSuccess(res, data, 'Registration successful. Please verify your email.', 201);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.verifyEmail(req.query.token as string);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await AuthService.login(email, password);
      sendSuccess(res, data, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const data = await AuthService.refreshToken(refreshToken);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.forgotPassword(req.body.email);
      sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, null, 'Password reset successful');
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, req.user);
    } catch (err) {
      next(err);
    }
  },
};
