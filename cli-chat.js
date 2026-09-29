const axios = require('axios');
const readline = require('readline');

// We use the patient ID from our test seed
const PATIENT_ID = 'e00ff420-292e-4892-8fe0-2c6363a53fcf';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: '
});

console.log('===================================================');
console.log('Medi-Bot CLI Test (Orchestrator MVP)');
console.log(`Connected as Patient: ${PATIENT_ID}`);
console.log('Type "exit" to quit.');
console.log('===================================================\n');

rl.prompt();

rl.on('line', async (line) => {
  const message = line.trim();
  if (message.toLowerCase() === 'exit') {
    console.log('Goodbye!');
    process.exit(0);
  }

  if (!message) {
    rl.prompt();
    return;
  }

  try {
    const res = await axios.post('http://localhost:3003/chat', {
      patientId: PATIENT_ID,
      message: message
    });
    
    console.log(`\nMedi-Bot: ${res.data.response}\n`);
    if (res.data._metadata && res.data._metadata.toolsUsed.length > 0) {
      console.log(`[Tools Used: ${res.data._metadata.toolsUsed.join(', ')}]\n`);
    }
  } catch (error) {
    if (error.response) {
      console.error('\nError:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('\nError:', error.message);
    }
    console.log();
  }

  rl.prompt();
}).on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
