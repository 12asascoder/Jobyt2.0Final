import axios from 'axios';

const JUDGE0_API = 'http://localhost:2358';

async function runTest(name: string, payload: any) {
  try {
    payload.enable_per_process_and_thread_time_limit = true;
    payload.enable_per_process_and_thread_memory_limit = true;
    if (!payload.memory_limit) payload.memory_limit = 10240000;
    if (!payload.cpu_time_limit) payload.cpu_time_limit = 15;
    const res = await axios.post(`${JUDGE0_API}/submissions?wait=true`, payload);
    const data = res.data;
    console.log(`\n--- ${name} ---`);
    console.log(`Status: ${data.status?.description ?? 'Unknown'} (ID: ${data.status?.id ?? 'Unknown'})`);
    console.log(`Stdout: ${data.stdout ? data.stdout.trim() : 'null'}`);
    console.log(`Stderr: ${data.stderr ? data.stderr.trim() : 'null'}`);
    console.log(`Compile Output: ${data.compile_output ? data.compile_output.trim() : 'null'}`);
    console.log(`Time: ${data.time}s`);
    console.log(`Memory: ${data.memory} KB`);
  } catch (error: any) {
    console.log(`\n--- ${name} FAILED ---`);
    console.log(error.message);
    if (error.response?.data) {
      console.log('Response data:', error.response.data);
    }
  }
}

async function main() {
  console.log("Testing Judge0 directly...");

  // 1. Python Success
  await runTest("Python Success", {
    source_code: "print('Hello Python')",
    language_id: 71
  });

  // 2. JavaScript Success
  await runTest("JavaScript Success", {
    source_code: "console.log('Hello JS');",
    language_id: 63
  });

  // 3. Java Success
  await runTest("Java Success", {
    source_code: "public class Main { public static void main(String[] args) { System.out.println(\"Hello Java\"); } }",
    language_id: 62
  });

  // 4. C++ Success
  await runTest("C++ Success", {
    source_code: "#include <iostream>\nint main() { std::cout << \"Hello C++\" << std::endl; return 0; }",
    language_id: 54
  });

  // 5. Compilation Error Test (C++)
  await runTest("Compilation Error (C++)", {
    source_code: "#include <iostream>\nint main() { std::cout << 'Missing quote; return 0; }",
    language_id: 54
  });

  // 6. Runtime Error Test (Python)
  await runTest("Runtime Error (Python)", {
    source_code: "x = 1 / 0",
    language_id: 71
  });

  // 7. Infinite Loop Timeout Test (Python)
  await runTest("Infinite Loop Timeout (Python)", {
    source_code: "while True: pass",
    language_id: 71,
    cpu_time_limit: 2,
    enable_per_process_and_thread_time_limit: true,
    enable_per_process_and_thread_memory_limit: true
  });

  // 8. Memory Limit Exceeded Test (Python)
  await runTest("Memory Limit Exceeded (Python)", {
    source_code: "a = [1] * (10**8)",
    language_id: 71,
    memory_limit: 10000,
    enable_per_process_and_thread_time_limit: true,
    enable_per_process_and_thread_memory_limit: true
  });
}

main();
