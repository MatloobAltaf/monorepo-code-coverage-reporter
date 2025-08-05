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
      expect(result).toContain('### 📊 Individual App/Library Coverage');
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
      expect(result).toContain('### 📊 Individual App/Library Coverage Changes');
      expect(result).toContain('📈'); // Should show increase indicators
      expect(result).toContain('📊 Changed');
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
      expect(result).toContain('### 📊 Individual App/Library Coverage');
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

      expect(result).toContain('📊 Individual App/Library Coverage Changes');
      expect(result).toContain('<br/>');
      expect(result).toContain('<small>');
      expect(result).toContain('📋 Detailed Coverage Breakdown');
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

      expect(result).toContain('📊 Individual App/Library Coverage Changes');
      expect(result).not.toContain('<br/>');
      expect(result).not.toContain('<small>');
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

      expect(result).toContain('85.00% ✨');
      expect(result).toContain('<small>85/100</small>');
      expect(result).toContain('🆕 Added');
    });

    it('should generate enhanced row for modified project', () => {
      const projectDiff = {
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
      };

      const result = generateEnhancedProjectRow('apps/frontend', projectDiff);

      expect(result).toContain('85.00% (+5.00%) 📈');
      expect(result).toContain('<small>85/100</small>');
      expect(result).toContain('📊 Changed');
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

      expect(result).toContain('📋 Detailed Coverage Breakdown');
      expect(result).toContain('#### apps/frontend');
      expect(result).toContain('📊 **Coverage changes detected**');
      expect(result).toContain('**Lines:** 85.00% (+5.00%) 📈');
    });

    it('should show no changes message when no significant changes', () => {
      const diff = {};

      const result = generateDetailedBreakdown(diff, false);

      expect(result).toContain('📋 Detailed Coverage Breakdown');
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

      expect(result).toContain('📋 Individual Project Details');
      expect(result).toContain('#### apps/frontend');
      expect(result).toContain('**Lines:** 85.00% (85/100)');
      expect(result).toContain('**Path:** `apps/frontend`');
    });
  });
});
