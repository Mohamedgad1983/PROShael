#!/usr/bin/env node

/**
 * Security Test Suite Runner
 * Runs all security tests and generates a comprehensive report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const SECURITY_TEST_FILES = [
  'authentication.test.js',
  'authorization.test.js',
  'sql-injection.test.js'
];

const TEST_CATEGORIES = {
  'authentication.test.js': {
    name: 'Authentication Security',
    requiredTests: 16,
    critical: true
  },
  'authorization.test.js': {
    name: 'RBAC Authorization',
    requiredTests: 20,
    critical: true
  },
  'sql-injection.test.js': {
    name: 'SQL Injection Prevention',
    requiredTests: 12,
    critical: true
  }
};

class SecurityTestRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalFailures: [],
      testDetails: {},
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test'
    };
  }

  async runTests() {
    console.log('🔒 Starting Security Test Suite...\n');
    console.log('=' .repeat(60));

    for (const testFile of SECURITY_TEST_FILES) {
      await this.runTestFile(testFile);
    }

    await this.generateReport();
    return this.results;
  }

  async runTestFile(testFile) {
    const category = TEST_CATEGORIES[testFile];
    console.log(`\n📋 Running ${category.name} Tests...`);
    console.log('-'.repeat(40));

    try {
      const testPath = path.join('__tests__', 'security', testFile);
      const { stdout, stderr } = await execAsync(
        `npx jest ${testPath} --json --outputFile=test-results-temp.json`,
        { cwd: process.cwd() }
      );

      // Read the JSON results
      const resultsJson = await fs.readFile('test-results-temp.json', 'utf8');
      const testResults = JSON.parse(resultsJson);

      // Process results
      const fileResults = this.processTestResults(testResults, category);
      this.results.testDetails[testFile] = fileResults;

      // Update totals
      this.results.totalTests += fileResults.totalTests;
      this.results.passedTests += fileResults.passedTests;
      this.results.failedTests += fileResults.failedTests;

      // Check for critical failures
      if (category.critical && fileResults.failedTests > 0) {
        this.results.criticalFailures.push({
          category: category.name,
          failures: fileResults.failures
        });
      }

      // Display results
      this.displayTestResults(category.name, fileResults);

      // Clean up temp file
      await fs.unlink('test-results-temp.json').catch(() => {});

    } catch (error) {
      console.error(`❌ Error running ${category.name}: ${error.message}`);
      this.results.testDetails[testFile] = {
        error: error.message,
        status: 'ERROR'
      };

      if (category.critical) {
        this.results.criticalFailures.push({
          category: category.name,
          error: error.message
        });
      }
    }
  }

  processTestResults(results, category) {
    const fileResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: results.testResults[0]?.perfStats?.runtime || 0,
      failures: [],
      status: 'UNKNOWN'
    };

    if (results.testResults && results.testResults[0]) {
      const testResult = results.testResults[0];
      fileResults.totalTests = testResult.numPassingTests + testResult.numFailingTests;
      fileResults.passedTests = testResult.numPassingTests;
      fileResults.failedTests = testResult.numFailingTests;

      // Extract failure details
      if (testResult.testResults) {
        testResult.testResults
          .filter(test => test.status === 'failed')
          .forEach(test => {
            fileResults.failures.push({
              title: test.title,
              ancestorTitles: test.ancestorTitles,
              failureMessages: test.failureMessages
            });
          });
      }

      // Determine status
      if (fileResults.failedTests === 0) {
        fileResults.status = 'PASS';
      } else if (fileResults.failedTests < category.requiredTests * 0.2) {
        fileResults.status = 'PARTIAL';
      } else {
        fileResults.status = 'FAIL';
      }
    }

    return fileResults;
  }

  displayTestResults(categoryName, results) {
    const passRate = results.totalTests > 0
      ? ((results.passedTests / results.totalTests) * 100).toFixed(1)
      : 0;

    const statusEmoji = {
      'PASS': '✅',
      'PARTIAL': '⚠️',
      'FAIL': '❌',
      'ERROR': '🔥',
      'UNKNOWN': '❓'
    };

    console.log(`\nResults for ${categoryName}:`);
    console.log(`Status: ${statusEmoji[results.status]} ${results.status}`);
    console.log(`Tests: ${results.passedTests}/${results.totalTests} passed (${passRate}%)`);

    if (results.duration) {
      console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);
    }

    if (results.failures && results.failures.length > 0) {
      console.log('\nFailed Tests:');
      results.failures.forEach(failure => {
        console.log(`  ❌ ${failure.ancestorTitles.join(' > ')} > ${failure.title}`);
      });
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY TEST SUITE SUMMARY');
    console.log('='.repeat(60));

    const overallPassRate = this.results.totalTests > 0
      ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)
      : 0;

    console.log(`\n🎯 Overall Results:`);
    console.log(`   Total Tests: ${this.results.totalTests}`);
    console.log(`   Passed: ${this.results.passedTests}`);
    console.log(`   Failed: ${this.results.failedTests}`);
    console.log(`   Pass Rate: ${overallPassRate}%`);

    // Determine overall status
    let overallStatus = 'PASS';
    if (this.results.criticalFailures.length > 0) {
      overallStatus = 'FAIL';
    } else if (this.results.failedTests > 0) {
      overallStatus = 'PARTIAL';
    }

    console.log(`   Overall Status: ${overallStatus}`);

    // Critical failures
    if (this.results.criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY FAILURES:');
      this.results.criticalFailures.forEach(failure => {
        console.log(`   - ${failure.category}`);
        if (failure.failures) {
          failure.failures.slice(0, 3).forEach(test => {
            console.log(`     • ${test.title}`);
          });
        }
      });
    }

    // Generate detailed report file
    const reportPath = path.join('__tests__', 'security', 'security-test-report.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify(this.results, null, 2),
      'utf8'
    );

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Security recommendations
    if (this.results.failedTests > 0) {
      console.log('\n⚠️  Security Recommendations:');
      console.log('   1. Review and fix all failing security tests');
      console.log('   2. Ensure authentication middleware is properly configured');
      console.log('   3. Verify RBAC implementation for all roles');
      console.log('   4. Confirm SQL injection prevention is active');
      console.log('   5. Run penetration testing after fixes');
    }

    // Exit code based on results
    if (overallStatus === 'FAIL') {
      console.log('\n❌ Security test suite FAILED - Critical vulnerabilities detected!');
      process.exit(1);
    } else if (overallStatus === 'PARTIAL') {
      console.log('\n⚠️  Security test suite PARTIAL - Some issues need attention');
      process.exit(0);
    } else {
      console.log('\n✅ Security test suite PASSED - All security checks passed!');
      process.exit(0);
    }
  }
}

// Run the security tests
const runner = new SecurityTestRunner();
runner.runTests().catch(error => {
  console.error('Fatal error running security tests:', error);
  process.exit(1);
});