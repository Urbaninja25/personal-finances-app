import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../controllers/authController';
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
//--------------------------------
router.use(
  authController.protect as (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => Promise<any>
);

router.get('/', userController.getAllUsers);
router.get('/me', userController.getMe, userController.getOne);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto as (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => Promise<any>,
  userController.updateMe as (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => Promise<any>
);

router.patch(
  '/updateMyPassword',
  authController.updatePassword as (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => Promise<any>
);

router.delete(
  '/deleteMe',
  userController.deleteMe as (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => Promise<any>
);
export default router;
