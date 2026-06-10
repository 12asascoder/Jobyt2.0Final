import { Judge0Service } from './src/services/judge0.service';
import axios from 'axios';

async function verifyInfra() {
  console.log('--- JUDGE0 INFRASTRUCTURE VERIFICATION ---');

  console.log('\n1. Verifying http://localhost:2358/about ...');
  try {
    const res = await axios.get('http://localhost:2358/about');
    console.log(`[PASS] Judge0 API Response Status: ${res.status}`);
  } catch (err: any) {
    console.log(`[FAIL] Judge0 API Error: ${err.message}`);
    return;
  }

  const languages = [
    { name: 'Python', code: 'print("Hello from Python")', expected: 'Hello from Python\n' },
    { name: 'JavaScript', code: 'console.log("Hello from JavaScript");', expected: 'Hello from JavaScript\n' },
    { name: 'Java', code: 'public class Main { public static void main(String[] args) { System.out.println("Hello from Java"); } }', expected: 'Hello from Java\n' },
    { name: 'cpp', code: '#include <iostream>\nint main() { std::cout << "Hello from C++\\n"; return 0; }', expected: 'Hello from C++\n' },
  ];

  console.log('\n2. Executing Real Code Submissions:');
  for (const lang of languages) {
    console.log(`\nTesting ${lang.name}...`);
    try {
      const result = await Judge0Service.execute({
        language: lang.name.toLowerCase(),
        sourceCode: lang.code,
      });
      console.log(`  Stdout: ${result.stdout?.trim()}`);
      console.log(`  Time: ${result.time}s`);
      console.log(`  Memory: ${result.memory} KB`);
      if (result.stdout?.trim() === lang.expected.trim()) {
         console.log(`  [PASS] Execution Successful`);
      } else {
         console.log(`  [FAIL] Expected: ${lang.expected.trim()}, Got: ${result.stdout?.trim()}`);
      }
    } catch (err: any) {
      console.log(`  [FAIL] ${err.message}`);
    }
  }

  console.log('\n3. Executing Failure Scenarios:');
  
  // Compile Error (C++)
  console.log('\nTesting Compile Error (C++)...');
  try {
    const ceResult = await Judge0Service.execute({
      language: 'cpp',
      sourceCode: 'int main() { std::cout << "Missing include" return 0; }',
    });
    console.log(`  Status: ${ceResult.status?.description}`);
    console.log(`  Compile Output: ${ceResult.compile_output?.trim().substring(0, 50)}...`);
  } catch (err: any) {
    console.log(`  Error: ${err.message}`);
  }

  // Runtime Error (Python)
  console.log('\nTesting Runtime Error (Python)...');
  try {
    const reResult = await Judge0Service.execute({
      language: 'python',
      sourceCode: 'print(1 / 0)',
    });
    console.log(`  Status: ${reResult.status?.description}`);
    console.log(`  Stderr: ${reResult.stderr?.trim()}`);
  } catch (err: any) {
    console.log(`  Error: ${err.message}`);
  }

  // Infinite Loop Timeout (JavaScript)
  console.log('\nTesting Time Limit Exceeded (JavaScript)...');
  try {
    const tleResult = await Judge0Service.execute({
      language: 'javascript',
      sourceCode: 'while(true) {}',
      cpuTimeLimit: 1,
    });
    console.log(`  Status: ${tleResult.status?.description}`);
  } catch (err: any) {
    console.log(`  Error: ${err.message}`);
  }
}

verifyInfra();
