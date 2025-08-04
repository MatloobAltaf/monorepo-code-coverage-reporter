const fs = require('fs');
const path = require('path');
const { parseCoverage, compareCoverage } = require('../coverage-parser');

// Mock fs and glob
jest.mock('fs');
jest.mock('glob');
jest.mock('lcov-parse');

const mockFs = fs;
const mockGlob = require('glob');
const mockLcovParse = require('lcov-parse');

describe('coverage-parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseCoverage', () => {
    it('should throw error if coverage folder does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(parseCoverage('/nonexistent')).rejects.toThrow(
        'Coverage folder not found: /nonexistent'
      );
    });

    it('should parse JSON summary files correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockGlob.mockImplementation((pattern, options, callback) => {
        if (pattern.includes('lcov.info')) {
          callback(null, []);
        } else if (pattern.includes('coverage-summary.json')) {
          callback(null, ['/coverage/apps/frontend/coverage-summary.json']);
        }
      });

      const mockJsonData = {
        total: {
          lines: { total: 100, covered: 85, pct: 85 },
          functions: { total: 20, covered: 18, pct: 90 },
          branches: { total: 50, covered: 40, pct: 80 }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockJsonData));

      const result = await parseCoverage('/coverage');

      expect(result).toEqual({
        'apps/frontend': {
          summary: mockJsonData.total,
          path: 'apps/frontend'
        }
      });
    });

    it('should handle LCOV files correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockGlob.mockImplementation((pattern, options, callback) => {
        if (pattern.includes('lcov.info')) {
          callback(null, ['/coverage/apps/backend/lcov.info']);
        } else if (pattern.includes('coverage-summary.json')) {
          callback(null, []);
        }
      });

      const mockLcovData = [
        {
          file: 'src/app.js',
          lines: { found: 50, hit: 45, details: [] },
          functions: { found: 10, hit: 9, details: [] },
          branches: { found: 20, hit: 16, details: [] }
        }
      ];

      mockLcovParse.mockImplementation((file, callback) => {
        callback(null, mockLcovData);
      });

      const result = await parseCoverage('/coverage');

      expect(result['apps/backend']).toBeDefined();
      expect(result['apps/backend'].lcov).toEqual(mockLcovData);
      expect(result['apps/backend'].summary.lines.total).toBe(50);
      expect(result['apps/backend'].summary.lines.covered).toBe(45);
    });
  });

  describe('compareCoverage', () => {
    it('should detect added projects', () => {
      const current = {
        'apps/frontend': {
          summary: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } }
        }
      };
      const base = {};

      const result = compareCoverage(current, base);

      expect(result['apps/frontend'].status).toBe('added');
      expect(result['apps/frontend'].current).toEqual(current['apps/frontend'].summary);
    });

    it('should detect removed projects', () => {
      const current = {};
      const base = {
        'apps/backend': {
          summary: { lines: { pct: 75 }, functions: { pct: 80 }, branches: { pct: 70 } }
        }
      };

      const result = compareCoverage(current, base);

      expect(result['apps/backend'].status).toBe('removed');
      expect(result['apps/backend'].base).toEqual(base['apps/backend'].summary);
    });

    it('should calculate diffs for modified projects', () => {
      const current = {
        'apps/frontend': {
          summary: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } }
        }
      };
      const base = {
        'apps/frontend': {
          summary: { lines: { pct: 80 }, functions: { pct: 85 }, branches: { pct: 75 } }
        }
      };

      const result = compareCoverage(current, base);

      expect(result['apps/frontend'].status).toBe('modified');
      expect(result['apps/frontend'].diff.lines).toBe(5);
      expect(result['apps/frontend'].diff.functions).toBe(5);
      expect(result['apps/frontend'].diff.branches).toBe(5);
    });
  });
});
