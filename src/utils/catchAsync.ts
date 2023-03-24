import { Request, Response, NextFunction } from 'express';

export interface CategoryRequest extends Request {
  user: {
    _id: string;
  };
}

export const catchAsync =
  (
    fn: (
      req: CategoryRequest,
      res: Response,
      next: NextFunction
    ) => Promise<any>
  ) =>
  (req: CategoryRequest, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
