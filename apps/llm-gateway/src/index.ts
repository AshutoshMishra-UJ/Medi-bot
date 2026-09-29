import express from 'express';
import cors from 'cors';
import generateRoute from './routes/generate';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();
const PORT = process.env.LLM_GATEWAY_PORT || 3004;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'llm-gateway' });
});

app.use('/api', generateRoute);

app.listen(PORT, () => {
  console.log(`LLM Gateway running on http://localhost:${PORT}`);
});
