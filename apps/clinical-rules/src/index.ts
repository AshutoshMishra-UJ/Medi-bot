import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3006;

/**
 * POST /validate
 * Validates a drug action against patient context using OpenFDA.
 */
app.post('/validate', async (req: Request, res: Response) => {
  const { action, drug, context } = req.body;
  
  if (!drug || !context) {
    return res.status(400).json({ error: 'Missing drug or patient context' });
  }

  const { activeMedications = [], allergies = [], conditions = [] } = context;

  const reasons: string[] = [];
  const sources: string[] = [];
  let status = 'SAFE';

  const drugLower = String(drug).toLowerCase();

  // 1. Check Allergies
  for (const allergy of allergies) {
    if (drugLower.includes(String(allergy.substance).toLowerCase())) {
      status = 'UNSAFE';
      reasons.push(`Patient has a documented allergy to ${allergy.substance}.`);
      sources.push('Patient Profile: Allergies');
    }
  }

  // 2. OpenFDA Drug-Drug Interactions Check
  for (const activeMed of activeMedications) {
    try {
      const activeMedName = String(activeMed.name).toLowerCase();
      
      // Query OpenFDA for interactions between the proposed drug and the active medication
      // We search the 'interactions' field in the drug label
      const fdaRes = await axios.get(`https://api.fda.gov/drug/label.json`, {
        params: {
          search: `(interactions:"${drugLower}"+AND+"${activeMedName}")`,
          limit: 1
        }
      });

      if (fdaRes.data.results && fdaRes.data.results.length > 0) {
        status = 'UNSAFE';
        reasons.push(`SEVERE INTERACTION: OpenFDA warns against combining ${drug} and ${activeMed.name}.`);
        sources.push('OpenFDA Drug Interactions API');
      }
    } catch (err: any) {
      // 404 from OpenFDA means no interaction label found for that specific search, which is fine.
      if (err.response?.status !== 404) {
        console.error(`[Clinical Rules] OpenFDA API Error:`, err.message);
      }
    }
  }

  // 3. Fallback Deterministic Rule (e.g. NSAIDs & Hypertension)
  if (drugLower.includes('ibuprofen') || drugLower.includes('nsaid')) {
    const hasHTN = conditions.some((c: any) => String(c.name).toLowerCase().includes('hypertension'));
    if (hasHTN) {
      status = status === 'UNSAFE' ? 'UNSAFE' : 'CAUTION';
      reasons.push('NSAIDs can increase blood pressure. Caution advised for patients with Hypertension.');
      sources.push('Clinical Guidelines: Hypertension Management');
    }
  }

  return res.json({
    status,
    reasons,
    sources,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[Clinical Rules] Service running on port ${PORT}`);
});
