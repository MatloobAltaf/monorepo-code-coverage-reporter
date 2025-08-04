const { generateReport, formatPercentage } = require('../report-generator');

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
      expect(result).toContain('### Coverage by Project');
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
      expect(result).toContain('### Coverage Changes by Project');
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
      expect(result).toContain('### Coverage by Project');
    });
  });
});
