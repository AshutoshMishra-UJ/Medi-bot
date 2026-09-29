import axios from 'axios';

const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:3001/api';
const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3002/api';
const CONTEXT_ENGINE_URL = process.env.CONTEXT_ENGINE_URL || 'http://localhost:3003/api';
const CLINICAL_RULES_URL = process.env.CLINICAL_RULES_URL || 'http://localhost:3005/api';

export async function executeTool(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case 'get_patient_profile':
        const profile = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}`);
        return profile.data;
        
      case 'get_medical_history':
        const history = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/conditions`);
        return history.data;
        
      case 'get_current_medications':
        const meds = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/medications`);
        return meds.data;
        
      case 'get_allergies':
        const allergies = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/allergies`);
        return allergies.data;
        
      case 'get_recent_labs':
        const labs = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/labs`, {
          params: { testName: args.testName, limit: args.limit }
        });
        return labs.data;
        
      case 'get_wearable_summary':
        const wearables = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/wearables/trends`, {
          params: { metric: args.metric, days: args.days }
        });
        return wearables.data;
        
      case 'get_symptom_history':
        // For MVP, we fetch from timeline/encounters API (assuming endpoint exists, stubbing gracefully if not)
        try {
          const symptoms = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/timeline`);
          return symptoms.data;
        } catch {
          return { data: "No symptom history found in timeline." };
        }
        
      case 'get_health_trends':
        try {
           const trends = await axios.get(`${PATIENT_SERVICE_URL}/patients/${args.patientId}/wearables/trends`);
           return trends.data;
        } catch {
           return { data: "No trends found." };
        }
        
      case 'get_relevant_documents':
        try {
          const docs = await axios.get(`${DOCUMENT_SERVICE_URL}/documents/search`, {
            params: { patientId: args.patientId, query: args.query }
          });
          return docs.data;
        } catch {
          return { data: "No relevant documents found." };
        }
        
      case 'search_medical_knowledge':
        try {
          const knowledge = await axios.get(`${CONTEXT_ENGINE_URL}/rag/search`, {
            params: { query: args.query }
          });
          return knowledge.data;
        } catch {
          return { data: "Medical knowledge retrieval failed." };
        }
        
      case 'search_drug_information':
        try {
          const drugInfo = await axios.get(`${CLINICAL_RULES_URL}/drugs/info`, {
            params: { drug_name: args.drug_name }
          });
          return drugInfo.data;
        } catch {
          return { data: "Drug information not found." };
        }
        
      case 'check_drug_interactions':
        try {
          const interactions = await axios.post(`${CLINICAL_RULES_URL}/drugs/interactions`, {
            drugs: args.drugs
          });
          return interactions.data;
        } catch {
          return { data: "Failed to check drug interactions." };
        }
        
      case 'get_clinical_guidelines':
        try {
          const guidelines = await axios.get(`${CONTEXT_ENGINE_URL}/guidelines/search`, {
            params: { condition: args.condition }
          });
          return guidelines.data;
        } catch {
          return { data: "No clinical guidelines found for this condition." };
        }
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error.message);
    return { error: `Failed to execute ${name}. Make sure the patient ID is valid and the service is running.` };
  }
}
