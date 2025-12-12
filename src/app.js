import fs from 'fs';

console.log(
  fs.existsSync(new URL('./routes/index.js', import.meta.url))
);

import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

export default app;
