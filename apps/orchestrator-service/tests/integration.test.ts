import request from 'supertest';
import app from '../src/index';

// We mock the LLM and the Context Engine to avoid actual DB and HTTP calls during basic integration test
jest.mock('axios');
import axios from 'axios';

jest.mock('@medibot/db', () => ({
  prisma: {
    patientProfile: {
      findUnique: jest.fn().mockResolvedValue({ patientId: '123e4567-e89b-12d3-a456-426614174000' }),
    },
    encounter: {
      create: jest.fn().mockResolvedValue({ encounterId: '123e4567-e89b-12d3-a456-426614174001' }),
    }
  }
}));

describe('Orchestrator End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run a successful health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Safety Engine: should intercept emergency keywords and bypass LLM', async () => {
    const res = await request(app)
      .post('/chat')
      .send({
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        message: 'I am experiencing crushing chest pain right now.'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('EMERGENCY');
    // Ensure axios was NOT called (meaning the LLM was bypassed)
    expect(axios.post).not.toHaveBeenCalled();
  });

  // Note: For full End-to-End Grounded Q&A and Medication testing, 
  // we would need a test DB environment and unmocked axios calls
  // pointing to our local microservices.
});
