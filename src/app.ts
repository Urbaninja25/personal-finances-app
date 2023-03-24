import path from 'path';
import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import AppError from '../src/utils/appError';
import userRouter from '../src/routes/userRoutes';
import categoryRouter from './routes/categoryRoutes';
import flowRouter from './routes/flowRoutes';
import globalErrorhandler from './controllers/errorController';

const app: Application = express();

app.set('view engine', 'pug');

app.set(
  'views',
  //./views
  path.join(__dirname, 'views')
);

//------------------impliment cors

app.use(cors());

app.options('*', cors());

// -----------------Set security HTTP headers
app.use(helmet());

// ----------------Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//------------------Limit requests from same API

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter);

//------------------parser

app.use(express.json());

app.use(cookieParser());

//---------------- Data sanitization against NoSQL query injection

app.use(mongoSanitize());

// ---------------Data sanitization against XSS

app.use(xss());

//---------------- Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['category', 'amount'],
  })
);
//------------------ so basically whenever we send a text response to a client ,no metter if thats json or html code with the compression package that text will then be dramatically compressed
app.use(compression());

//routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/finances', categoryRouter);
app.use('/api/v1/flow', flowRouter);
//------------------------------------------create unhandled error
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//----------------------------globalerrorhandler
app.use(globalErrorhandler);

export default app;
