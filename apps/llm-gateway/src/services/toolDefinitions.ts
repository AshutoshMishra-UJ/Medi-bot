import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const medicalTools: FunctionDeclaration[] = [
  {
    name: 'get_patient_profile',
    description: 'Retrieves the demographic and basic profile information of the patient.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_medical_history',
    description: 'Retrieves the medical conditions and diagnoses history of the patient.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_current_medications',
    description: 'Retrieves the list of active medications the patient is currently taking.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_allergies',
    description: 'Retrieves the allergy profile of the patient.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_recent_labs',
    description: 'Retrieves recent laboratory test results for the patient.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
        testName: {
          type: SchemaType.STRING,
          description: 'Optional name of the specific lab test (e.g., HbA1c, Lipid Panel). If omitted, returns general recent labs.',
        },
        limit: {
          type: SchemaType.INTEGER,
          description: 'Maximum number of results to return. Default is 5.',
        },
      },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_wearable_summary',
    description: 'Retrieves trend summaries for wearable metrics (e.g., heart_rate, steps).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
        metric: {
          type: SchemaType.STRING,
          description: 'The metric to summarize (e.g., heart_rate).',
        },
        days: {
          type: SchemaType.INTEGER,
          description: 'Number of past days to summarize.',
        },
      },
      required: ['patientId', 'metric'],
    },
  },
  {
    name: 'get_symptom_history',
    description: 'Retrieves prior symptom encounters from the medical timeline.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
        days: {
          type: SchemaType.INTEGER,
          description: 'Number of past days to check for symptoms.',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_health_trends',
    description: 'Retrieves derived health trend signals for the patient.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientId: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the patient.',
        },
        metric: {
          type: SchemaType.STRING,
          description: 'The specific health trend metric to retrieve.',
        },
      },
      required: ['patientId', 'metric'],
    },
  },
  {
    name: 'get_relevant_documents',
    description: 'Search for matching health documents.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Search query for documents.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_medical_knowledge',
    description: 'Medical RAG retrieval for clinical knowledge.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Medical question or topic to search.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_drug_information',
    description: 'Look up authoritative drug facts and information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        drug_name: {
          type: SchemaType.STRING,
          description: 'Name of the drug.',
        },
      },
      required: ['drug_name'],
    },
  },
  {
    name: 'check_drug_interactions',
    description: 'Check for interactions between multiple drugs.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        drugs: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
          },
          description: 'List of drug names to check.',
        },
      },
      required: ['drugs'],
    },
  },
  {
    name: 'get_clinical_guidelines',
    description: 'Get evidence-based clinical guidelines for a condition.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        condition: {
          type: SchemaType.STRING,
          description: 'Medical condition name.',
        },
      },
      required: ['condition'],
    },
  },
];
