const fs = require('fs');
const { parseCoverage, compareCoverage } = require('../coverage-parser');

// Mock fs and glob
jest.mock('fs');
jest.mock('glob');

const mockFs = fs;
const { glob: mockGlob } = require('glob');

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
      mockGlob.mockImplementation(async (pattern, _options) => {
        if (pattern.includes('coverage-summary.json')) {
          return ['/coverage/apps/frontend/coverage-summary.json'];
        }
        return [];
      });

      const mockJsonData = {
        total: {
          lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
          statements: { total: 120, covered: 102, skipped: 0, pct: 85 },
          functions: { total: 20, covered: 18, skipped: 0, pct: 90 },
          branches: { total: 50, covered: 40, skipped: 0, pct: 80 }
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

    it('should handle multiple projects correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockGlob.mockImplementation(async (pattern, _options) => {
        if (pattern.includes('coverage-summary.json')) {
          return [
            '/coverage/apps/backend/coverage-summary.json',
            '/coverage/apps/transect/coverage-summary.json',
            '/coverage/libraries-coverage/coverage-summary.json'
          ];
        }
        return [];
      });

      const mockJsonData = {
        total: {
          lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
          statements: { total: 120, covered: 102, skipped: 0, pct: 85 },
          functions: { total: 20, covered: 18, skipped: 0, pct: 90 },
          branches: { total: 50, covered: 40, skipped: 0, pct: 80 }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockJsonData));

      const result = await parseCoverage('/coverage');

      // Verify all three projects are parsed
      expect(result['apps/backend']).toBeDefined();
      expect(result['apps/transect']).toBeDefined();
      expect(result['libraries-coverage']).toBeDefined();

      // Verify each project has correct coverage data
      ['apps/backend', 'apps/transect', 'libraries-coverage'].forEach((project) => {
        expect(result[project].summary).toEqual(mockJsonData.total);
        expect(result[project].path).toBeDefined();
      });
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

    it('should skip removed projects (projects only in base coverage)', () => {
      const current = {};
      const base = {
        'apps/backend': {
          summary: { lines: { pct: 75 }, functions: { pct: 80 }, branches: { pct: 70 } }
        }
      };

      const result = compareCoverage(current, base);

      // Should not include removed projects in the result
      expect(result['apps/backend']).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(0);
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
