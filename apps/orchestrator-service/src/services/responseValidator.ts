export function validateResponse(response: string, toolsUsed: string[]): { isValid: boolean; reason?: string } {
  const normalized = response.toLowerCase();

  // If no tools were used, the LLM shouldn't be giving definitive medical facts (like diagnosing).
  // But we allow it to give general advice (which the intent classifier handles).
  if (toolsUsed.length === 0) {
    if (normalized.includes('diagnos') || normalized.includes('prescribe')) {
       return { 
         isValid: false, 
         reason: 'AI attempted to diagnose or prescribe without patient data context.' 
       };
    }
  }

  // Basic check for hallucinations (e.g. if the DB returned nothing, the AI shouldn't invent numbers)
  // For the MVP, we just do a basic string inspection
  if (normalized.includes('i am hallucinating') || normalized.includes('i made this up')) {
    return { isValid: false, reason: 'AI generated invalid text.' };
  }

  return { isValid: true };
}
