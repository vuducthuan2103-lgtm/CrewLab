"""
Script Runner for DB Schema Test Cases (Spec 0001)
Executes static, structural, schema, and policy verification tests.
Outputs a detailed report matching test-cases.md requirements.
"""
import sys
import unittest
from pathlib import Path

# Add backend directory to PYTHONPATH
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from tests.test_db_schema import (
    TestMigrationAndSchemaStructure,
    TestBrandSettingsAndVersionHistory,
    TestWorkflowCycleAndFSM,
    TestAssetLibraryAndRequests,
    TestHitlReviewAndAppendOnly,
    TestAgentMemoryAndObservability,
    TestAuditLogAndRLS
)

def main():
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    
    suite.addTest(loader.loadTestsFromTestCase(TestMigrationAndSchemaStructure))
    suite.addTest(loader.loadTestsFromTestCase(TestBrandSettingsAndVersionHistory))
    suite.addTest(loader.loadTestsFromTestCase(TestWorkflowCycleAndFSM))
    suite.addTest(loader.loadTestsFromTestCase(TestAssetLibraryAndRequests))
    suite.addTest(loader.loadTestsFromTestCase(TestHitlReviewAndAppendOnly))
    suite.addTest(loader.loadTestsFromTestCase(TestAgentMemoryAndObservability))
    suite.addTest(loader.loadTestsFromTestCase(TestAuditLogAndRLS))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*80)
    print("SUMMARY OF DB SCHEMA TEST RESULTS")
    print(f"Total Tests Run: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures (Defects/Gaps): {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*80 + "\n")
    
    if result.failures:
        print("DETAILS OF FAILURES / GAPS FOUND:")
        for test, msg in result.failures:
            print(f"- {test.id()}:\n{msg}\n")

    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == "__main__":
    main()
