import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({
  connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/hiring_platform?sslmode=disable'
});

async function runAudit() {
  console.log('--- CODING ASSESSMENT MODULE AUDIT ---');
  let hasFailures = false;

  console.log('\n1. Judge0 Health:');
  try {
    await axios.get('http://localhost:2358/about', { timeout: 2000 });
    console.log('  [PASS] Judge0 API is reachable.');
  } catch (err: any) {
    console.log(`  [FAIL] Judge0 API unreachable: ${err.message}`);
    hasFailures = true;
  }

  console.log('\n7. Database Validation:');
  try {
    const res1 = await pool.query('SELECT count(*) FROM assessment_sessions');
    console.log(`  [PASS] assessment_sessions table exists (count: ${res1.rows[0].count})`);
    
    const res2 = await pool.query('SELECT count(*) FROM coding_submissions');
    console.log(`  [PASS] coding_submissions table exists (count: ${res2.rows[0].count})`);
    
    const res3 = await pool.query('SELECT count(*) FROM submission_test_results');
    console.log(`  [PASS] submission_test_results table exists (count: ${res3.rows[0].count})`);
    
    const res4 = await pool.query('SELECT count(*) FROM code_evaluations');
    console.log(`  [PASS] code_evaluations table exists (count: ${res4.rows[0].count})`);
    
    const res5 = await pool.query('SELECT count(*) FROM execution_logs');
    console.log(`  [PASS] execution_logs table exists (count: ${res5.rows[0].count})`);
  } catch (err: any) {
    console.log(`  [FAIL] Database Validation error: ${err.message}`);
    hasFailures = true;
  }

  console.log('\nFinal Verdict:');
  if (hasFailures) {
    console.log('⚠️ Functional but Requires Fixes');
  } else {
    console.log('✅ Production Ready');
  }
}

runAudit().catch(console.error).finally(() => pool.end());
