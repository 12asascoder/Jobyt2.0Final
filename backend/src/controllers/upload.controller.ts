import { Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';

export const UploadController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const result = await StorageService.uploadAny(req.file);
      res.status(200).json({ url: result.url });
    } catch (err) {
      next(err);
    }
  },
};
