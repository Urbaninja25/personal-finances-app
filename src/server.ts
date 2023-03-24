const dotenv = require('dotenv');
const mongoose = require('mongoose');
import app from './app';
mongoose.set('strictQuery', false);

process.on('uncaughtException', (err: Error) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message, err.stack);

  process.exit(1);
});

dotenv.config({ path: './config.env' });

//-------connect the database
const DB = process.env.DATABASE?.replace(
  '<password>',
  process.env.DATABASE_PASSWORD ?? ''
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  .then(console.log('db conecction sucsessfyl'));

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`app running on port ${port}...`);
});

process.on('unhandledRejection', (err: Error) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message, err.stack);

  server.close(() => {
    process.exit(1);
  });
});
