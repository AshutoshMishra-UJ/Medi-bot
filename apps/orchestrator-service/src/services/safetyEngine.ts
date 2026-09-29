// Deterministic safety pre-check rules
// This bypasses the LLM entirely for critical emergencies

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'can\'t breathe',
  'cannot breathe',
  'shortness of breath',
  'suicide',
  'kill myself',
  'want to die',
  'bleeding heavily',
  'stroke',
  'face drooping',
  'arm weakness',
  'severe bleeding',
  'coughing blood',
  'vomiting blood'
];

export function runSafetyPreCheck(message: string): { isSafe: boolean; response?: string; riskLevel: 'LOW' | 'HIGH' } {
  const normalizedMessage = message.toLowerCase();

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (normalizedMessage.includes(keyword)) {
      return {
        isSafe: false,
        riskLevel: 'HIGH',
        response: `⚠️ **EMERGENCY ESCALATION** ⚠️\n\nYou have reported symptoms ("${keyword}") that may require immediate medical attention. \n\nPlease call your local emergency services (e.g., 911) immediately or go to the nearest emergency room. I am an AI and cannot provide emergency medical care.`
      };
    }
  }

  return { isSafe: true, riskLevel: 'LOW' };
}
