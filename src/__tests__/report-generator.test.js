const {
  generateReport,
  formatPercentage,
  generateEnhancedProjectRow,
  generateDetailedBreakdown,
  generateIndividualProjectDetails
} = require('../report-generator');

describe('report-generator', () => {
  describe('formatPercentage', () => {
    it('should format valid percentages correctly', () => {
      expect(formatPercentage(85.5)).toBe('85.50%');
      expect(formatPercentage(100)).toBe('100.00%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should handle invalid values', () => {
      expect(formatPercentage(null)).toBe('N/A');
      expect(formatPercentage(undefined)).toBe('N/A');
      expect(formatPercentage(NaN)).toBe('N/A');
      expect(formatPercentage('invalid')).toBe('N/A');
    });
  });

  describe('generateReport', () => {
    const mockCurrentCoverage = {
      'apps/frontend': {
        summary: {
          lines: { total: 100, covered: 85, pct: 85 },
          functions: { total: 20, covered: 18, pct: 90 },
          branches: { total: 50, covered: 40, pct: 80 }
        }
      }
    };

    const mockBaseCoverage = {
      'apps/frontend': {
        summary: {
          lines: { total: 100, covered: 80, pct: 80 },
          functions: { total: 20, covered: 16, pct: 80 },
          branches: { total: 50, covered: 35, pct: 70 }
        }
      }
    };

    it('should generate basic report without base coverage', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: null,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: true
      };

      const result = generateReport(options);

      expect(result).toContain('## Coverage Report');
      expect(result).toContain('### Overall Coverage: 85.00%');
      expect(result).toContain('### 🔄 Individual App/Library Coverage');
      expect(result).toContain('apps/frontend');
      expect(result).toContain('85.00%');
      expect(result).toContain('90.00%');
      expect(result).toContain('80.00%');
    });

    it('should generate comparison report with base coverage', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: mockBaseCoverage,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: true
      };

      const result = generateReport(options);

      expect(result).toContain('## Coverage Report');
      expect(result).toContain('**Coverage Change:**');
      expect(result).toContain('### 🔄 Individual App/Library Coverage Changes');
      expect(result).toContain('⬆️'); // Should show increase indicators
      expect(result).toContain('⬆️ Increased');
    });

    it('should hide coverage reports when requested', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: null,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: true,
        hideUnchanged: false,
        includeSummary: true
      };

      const result = generateReport(options);

      expect(result).toContain('## Coverage Report');
      expect(result).toContain('### Overall Coverage: 85.00%');
      expect(result).not.toContain('### Coverage by Project');
    });

    it('should hide summary when requested', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: null,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: false
      };

      const result = generateReport(options);

      expect(result).toContain('## Coverage Report');
      expect(result).not.toContain('### Overall Coverage:');
      expect(result).toContain('### 🔄 Individual App/Library Coverage');
    });

    it('should generate detailed coverage report when detailed-coverage is true', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: mockBaseCoverage,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: true,
        detailedCoverage: true
      };

      const result = generateReport(options);

      expect(result).toContain('🔄 Individual App/Library Coverage Changes');
      expect(result).toContain('\n*');
      expect(result).toContain('*85/100*');
      expect(result).toContain('📑 Detailed Coverage Breakdown');
    });

    it('should generate simple coverage report when detailed-coverage is false', () => {
      const options = {
        currentCoverage: mockCurrentCoverage,
        baseCoverage: mockBaseCoverage,
        totalCoverage: 85,
        commentTitle: 'Coverage Report',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: true,
        detailedCoverage: false
      };

      const result = generateReport(options);

      expect(result).toContain('🔄 Individual App/Library Coverage Changes');
      expect(result).not.toContain('*85/100*');
      expect(result).not.toContain('📋 Detailed Coverage Breakdown');
    });
  });

  describe('generateEnhancedProjectRow', () => {
    it('should generate enhanced row for added project', () => {
      const projectDiff = {
        status: 'added',
        current: {
          lines: { pct: 85, covered: 85, total: 100 },
          functions: { pct: 90, covered: 18, total: 20 },
          branches: { pct: 80, covered: 40, total: 50 }
        }
      };

      const result = generateEnhancedProjectRow('apps/frontend', projectDiff);

      expect(result).toContain('85.00% 🔹');
      expect(result).toContain('*85/100*');
      expect(result).toContain('➕ Added');
    });

    it('should generate enhanced row for modified project', () => {
      const projectDiff = {
        status: 'modified',
        current: {
          lines: { pct: 85, covered: 85, total: 100 },
          functions: { pct: 90, covered: 18, total: 20 },
          branches: { pct: 80, covered: 40, total: 50 },
          statements: { pct: 85, covered: 85, total: 100 }
        },
        base: {
          lines: { pct: 80, covered: 80, total: 100 },
          functions: { pct: 85, covered: 17, total: 20 },
          branches: { pct: 75, covered: 37, total: 50 },
          statements: { pct: 80, covered: 80, total: 100 }
        },
        diff: {
          lines: 5,
          functions: 5,
          branches: 5,
          statements: 5
        }
      };

      const result = generateEnhancedProjectRow('apps/frontend', projectDiff);

      expect(result).toContain('85.00% (+5.00%) ⬆️');
      expect(result).toContain('*85/100*');
      expect(result).toContain('⬆️ Increased');
    });
  });

  describe('generateDetailedBreakdown', () => {
    it('should generate detailed breakdown for changed projects', () => {
      const diff = {
        'apps/frontend': {
          status: 'modified',
          current: {
            lines: { pct: 85, covered: 85, total: 100 },
            functions: { pct: 90, covered: 18, total: 20 },
            branches: { pct: 80, covered: 40, total: 50 }
          },
          base: {
            lines: { pct: 80, covered: 80, total: 100 },
            functions: { pct: 85, covered: 17, total: 20 },
            branches: { pct: 75, covered: 37, total: 50 }
          },
          diff: {
            lines: 5,
            functions: 5,
            branches: 5
          }
        }
      };

      const result = generateDetailedBreakdown(diff, false);

      expect(result).toContain('📑 Detailed Coverage Breakdown');
      expect(result).toContain('#### apps/frontend');
      expect(result).toContain('🔄 **Coverage changes detected**');
      expect(result).toContain('**Lines:** 85.00% (+5.00%) ⬆️');
    });

    it('should show no changes message when no significant changes', () => {
      const diff = {};

      const result = generateDetailedBreakdown(diff, false);

      expect(result).toContain('📑 Detailed Coverage Breakdown');
      expect(result).toContain('*No significant coverage changes detected.*');
    });
  });

  describe('generateIndividualProjectDetails', () => {
    it('should generate individual project details', () => {
      const coverage = {
        'apps/frontend': {
          summary: {
            lines: { pct: 85, covered: 85, total: 100 },
            functions: { pct: 90, covered: 18, total: 20 },
            branches: { pct: 80, covered: 40, total: 50 }
          },
          path: 'apps/frontend'
        }
      };

      const result = generateIndividualProjectDetails(coverage);

      expect(result).toContain('📑 Individual Project Details');
      expect(result).toContain('#### apps/frontend');
      expect(result).toContain('**Lines:** 85.00% (85/100)');
      expect(result).toContain('**Path:** `apps/frontend`');
    });
  });

  describe('Sample Directory Structure Test', () => {
    it('should create sample directory structure and generate comprehensive comment', () => {
      // Create sample current coverage data with the specified directory structure
      const currentCoverage = {
        'apps/transect': {
          summary: {
            lines: { total: 1500, covered: 1275, pct: 85.0 },
            functions: { total: 300, covered: 270, pct: 90.0 },
            branches: { total: 750, covered: 600, pct: 80.0 },
            statements: { total: 1800, covered: 1530, pct: 85.0 }
          },
          path: 'apps/transect'
        },
        'apps/backend': {
          summary: {
            lines: { total: 2000, covered: 1600, pct: 80.0 },
            functions: { total: 400, covered: 320, pct: 80.0 },
            branches: { total: 1000, covered: 700, pct: 70.0 },
            statements: { total: 2400, covered: 1920, pct: 80.0 }
          },
          path: 'apps/backend'
        },
        'apps/mvt-server': {
          summary: {
            lines: { total: 800, covered: 720, pct: 90.0 },
            functions: { total: 160, covered: 144, pct: 90.0 },
            branches: { total: 400, covered: 320, pct: 80.0 },
            statements: { total: 960, covered: 864, pct: 90.0 }
          },
          path: 'apps/mvt-server'
        },
        'apps/pull-subscribers': {
          summary: {
            lines: { total: 600, covered: 480, pct: 80.0 },
            functions: { total: 120, covered: 96, pct: 80.0 },
            branches: { total: 300, covered: 210, pct: 70.0 },
            statements: { total: 720, covered: 576, pct: 80.0 }
          },
          path: 'apps/pull-subscribers'
        },
        'libraries-coverage': {
          summary: {
            lines: { total: 3000, covered: 2550, pct: 85.0 },
            functions: { total: 600, covered: 540, pct: 90.0 },
            branches: { total: 1500, covered: 1200, pct: 80.0 },
            statements: { total: 3600, covered: 3060, pct: 85.0 }
          },
          path: 'libraries-coverage'
        }
      };

      // Create sample base coverage data with some differences
      const baseCoverage = {
        'apps/transect': {
          summary: {
            lines: { total: 1500, covered: 1200, pct: 80.0 },
            functions: { total: 300, covered: 255, pct: 85.0 },
            branches: { total: 750, covered: 525, pct: 70.0 },
            statements: { total: 1800, covered: 1440, pct: 80.0 }
          },
          path: 'apps/transect'
        },
        'apps/backend': {
          summary: {
            lines: { total: 2000, covered: 1600, pct: 80.0 },
            functions: { total: 400, covered: 320, pct: 80.0 },
            branches: { total: 1000, covered: 700, pct: 70.0 },
            statements: { total: 2400, covered: 1920, pct: 80.0 }
          },
          path: 'apps/backend'
        },
        'apps/mvt-server': {
          summary: {
            lines: { total: 800, covered: 680, pct: 85.0 },
            functions: { total: 160, covered: 128, pct: 80.0 },
            branches: { total: 400, covered: 280, pct: 70.0 },
            statements: { total: 960, covered: 816, pct: 85.0 }
          },
          path: 'apps/mvt-server'
        },
        'apps/pull-subscribers': {
          summary: {
            lines: { total: 600, covered: 480, pct: 80.0 },
            functions: { total: 120, covered: 96, pct: 80.0 },
            branches: { total: 300, covered: 210, pct: 70.0 },
            statements: { total: 720, covered: 576, pct: 80.0 }
          },
          path: 'apps/pull-subscribers'
        },
        'libraries-coverage': {
          summary: {
            lines: { total: 3000, covered: 2400, pct: 80.0 },
            functions: { total: 600, covered: 480, pct: 80.0 },
            branches: { total: 1500, covered: 1050, pct: 70.0 },
            statements: { total: 3600, covered: 2880, pct: 80.0 }
          },
          path: 'libraries-coverage'
        }
      };

      // Calculate total coverage
      const calculateTotalCoverage = (coverage) => {
        let totalLines = 0;
        let coveredLines = 0;
        for (const [, projectData] of Object.entries(coverage)) {
          if (projectData.summary) {
            totalLines += projectData.summary.lines?.total || 0;
            coveredLines += projectData.summary.lines?.covered || 0;
          }
        }
        return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
      };

      const currentTotalCoverage = calculateTotalCoverage(currentCoverage);
      const baseTotalCoverage = calculateTotalCoverage(baseCoverage);

      // Generate the comprehensive report
      const options = {
        currentCoverage,
        baseCoverage,
        totalCoverage: currentTotalCoverage,
        commentTitle: '📊 Coverage Report - Transect Project',
        hideCoverageReports: false,
        hideUnchanged: false,
        includeSummary: true,
        detailedCoverage: true
      };

      const generatedComment = generateReport(options);

      // Log the generated comment to see the output
      console.log('\n=== GENERATED COVERAGE COMMENT ===');
      console.log(generatedComment);
      console.log('=== END GENERATED COVERAGE COMMENT ===\n');

      // Verify the comment contains expected content
      expect(generatedComment).toContain('## 📊 Coverage Report - Transect Project');
      expect(generatedComment).toContain('### Overall Coverage:');
      expect(generatedComment).toContain('**Coverage Change:**');
      expect(generatedComment).toContain('### 🔄 Individual App/Library Coverage Changes');
      expect(generatedComment).toContain('### 📑 Detailed Coverage Breakdown');

      // Verify all projects are included
      expect(generatedComment).toContain('apps/transect');
      expect(generatedComment).toContain('apps/backend');
      expect(generatedComment).toContain('apps/mvt-server');
      expect(generatedComment).toContain('apps/pull-subscribers');
      expect(generatedComment).toContain('libraries-coverage');

      // Verify coverage percentages are present
      expect(generatedComment).toContain('85.00%');
      expect(generatedComment).toContain('80.00%');
      expect(generatedComment).toContain('90.00%');
      expect(generatedComment).toContain('70.00%');

      // Verify change indicators are present
      expect(generatedComment).toContain('⬆️');
      expect(generatedComment).toContain('Increased');
      expect(generatedComment).toContain('Unchanged');

      // Verify detailed breakdown sections
      expect(generatedComment).toContain('#### apps/transect');
      expect(generatedComment).toContain('#### apps/backend');
      expect(generatedComment).toContain('#### apps/mvt-server');
      expect(generatedComment).toContain('#### apps/pull-subscribers');
      expect(generatedComment).toContain('#### libraries-coverage');

      // Verify coverage details are present
      expect(generatedComment).toContain('*1275/1500*');
      expect(generatedComment).toContain('*1600/2000*');
      expect(generatedComment).toContain('*720/800*');
      expect(generatedComment).toContain('*480/600*');
      expect(generatedComment).toContain('*2550/3000*');

      // Verify the comment structure is complete
      expect(generatedComment).toContain('## 📊 Coverage Report - Transect Project');
      expect(generatedComment).toContain('### Overall Coverage:');
      expect(generatedComment).toContain('### 🔄 Individual App/Library Coverage Changes');
      expect(generatedComment).toContain(
        '| Project | Lines Coverage | Functions Coverage | Branches Coverage | Statements | Status |'
      );

      // Verify that the comment shows improvement trends
      expect(generatedComment).toContain('(+5.00%)');
      expect(generatedComment).toContain('(+10.00%)');
      expect(generatedComment).toContain('(+5.00%)');

      console.log('✅ Sample directory structure test completed successfully!');
      console.log(`📈 Current Total Coverage: ${currentTotalCoverage.toFixed(2)}%`);
      console.log(`📊 Base Total Coverage: ${baseTotalCoverage.toFixed(2)}%`);
      console.log(
        `📈 Coverage Improvement: +${(currentTotalCoverage - baseTotalCoverage).toFixed(2)}%`
      );
    });
  });
});
