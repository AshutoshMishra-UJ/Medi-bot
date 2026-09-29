const axios = require('axios');

const PATIENT_ID = 'e00ff420-292e-4892-8fe0-2c6363a53fcf';

async function testChat(message, description) {
  console.log(`\n===================================================`);
  console.log(`[TEST] ${description}`);
  console.log(`Message: "${message}"`);
  console.log(`===================================================`);
  try {
    const res = await axios.post('http://localhost:3003/chat', {
      patientId: PATIENT_ID,
      message: message
    });
    console.log(`Response: ${res.data.response}`);
    console.log(`Tools Used: ${res.data._metadata?.toolsUsed || 'None'}`);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

async function runTests() {
  // Test 1: Emergency Safety Check
  await testChat("I am having severe chest pain right now.", "Emergency Pre-check");
  
  // Test 2: Factual Record Query (Allergies)
  await testChat("Do I have any allergies on record?", "Factual Retrieval (Allergies)");
  
  // Test 3: Symptom Assessment (Initial)
  await testChat("I've had a headache for 2 days.", "Adaptive Symptom Questioning");
  
  // Test 4: General Knowledge
  await testChat("Is water wet?", "Out of Scope / General Knowledge");
}

runTests();
