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

    it('should parse multiple projects with different coverage data correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockGlob.mockImplementation(async (pattern, _options) => {
        if (pattern.includes('coverage-summary.json')) {
          return [
            '/coverage/apps/transect/coverage-summary.json',
            '/coverage/apps/backend/coverage-summary.json',
            '/coverage/apps/mvt-server/coverage-summary.json',
            '/coverage/apps/pull-subscribers/coverage-summary.json',
            '/coverage/libraries-coverage/coverage-summary.json'
          ];
        }
        return [];
      });

      // Create different coverage data for each project
      const coverageData = {
        '/coverage/apps/transect/coverage-summary.json': {
          total: {
            lines: { total: 1500, covered: 1275, pct: 85.0 },
            functions: { total: 300, covered: 270, pct: 90.0 },
            branches: { total: 750, covered: 600, pct: 80.0 },
            statements: { total: 1800, covered: 1530, pct: 85.0 }
          }
        },
        '/coverage/apps/backend/coverage-summary.json': {
          total: {
            lines: { total: 2000, covered: 1600, pct: 80.0 },
            functions: { total: 400, covered: 320, pct: 80.0 },
            branches: { total: 1000, covered: 700, pct: 70.0 },
            statements: { total: 2400, covered: 1920, pct: 80.0 }
          }
        },
        '/coverage/apps/mvt-server/coverage-summary.json': {
          total: {
            lines: { total: 800, covered: 720, pct: 90.0 },
            functions: { total: 160, covered: 144, pct: 90.0 },
            branches: { total: 400, covered: 320, pct: 80.0 },
            statements: { total: 960, covered: 864, pct: 90.0 }
          }
        },
        '/coverage/apps/pull-subscribers/coverage-summary.json': {
          total: {
            lines: { total: 600, covered: 480, pct: 80.0 },
            functions: { total: 120, covered: 96, pct: 80.0 },
            branches: { total: 300, covered: 210, pct: 70.0 },
            statements: { total: 720, covered: 576, pct: 80.0 }
          }
        },
        '/coverage/libraries-coverage/coverage-summary.json': {
          total: {
            lines: { total: 3000, covered: 2550, pct: 85.0 },
            functions: { total: 600, covered: 540, pct: 90.0 },
            branches: { total: 1500, covered: 1200, pct: 80.0 },
            statements: { total: 3600, covered: 3060, pct: 85.0 }
          }
        }
      };

      // Mock readFileSync to return different data for each file
      mockFs.readFileSync.mockImplementation((filePath) => {
        const data = coverageData[filePath];
        if (data) {
          return JSON.stringify(data);
        }
        throw new Error(`File not found: ${filePath}`);
      });

      const result = await parseCoverage('/coverage');

      // Log the result to see what was actually parsed
      console.log('\n=== PARSED COVERAGE DATA ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=== END PARSED COVERAGE DATA ===\n');

      // Verify all projects are parsed
      expect(result).toHaveProperty('apps/transect');
      expect(result).toHaveProperty('apps/backend');
      expect(result).toHaveProperty('apps/mvt-server');
      expect(result).toHaveProperty('apps/pull-subscribers');
      expect(result).toHaveProperty('libraries-coverage');

      // Verify each project has the correct coverage data
      expect(result['apps/transect'].summary).toEqual(
        coverageData['/coverage/apps/transect/coverage-summary.json'].total
      );
      expect(result['apps/backend'].summary).toEqual(
        coverageData['/coverage/apps/backend/coverage-summary.json'].total
      );
      expect(result['apps/mvt-server'].summary).toEqual(
        coverageData['/coverage/apps/mvt-server/coverage-summary.json'].total
      );
      expect(result['apps/pull-subscribers'].summary).toEqual(
        coverageData['/coverage/apps/pull-subscribers/coverage-summary.json'].total
      );
      expect(result['libraries-coverage'].summary).toEqual(
        coverageData['/coverage/libraries-coverage/coverage-summary.json'].total
      );

      // Verify project paths are correct
      expect(result['apps/transect'].path).toBe('apps/transect');
      expect(result['apps/backend'].path).toBe('apps/backend');
      expect(result['apps/mvt-server'].path).toBe('apps/mvt-server');
      expect(result['apps/pull-subscribers'].path).toBe('apps/pull-subscribers');
      expect(result['libraries-coverage'].path).toBe('libraries-coverage');

      // Verify the number of projects parsed
      expect(Object.keys(result)).toHaveLength(5);

      console.log('✅ Multiple projects with different coverage data parsed correctly!');
      console.log(`📊 Total projects parsed: ${Object.keys(result).length}`);
      Object.keys(result).forEach((project) => {
        console.log(`  - ${project}: ${result[project].summary.lines.pct}% lines coverage`);
      });
    });

    it('should parse coverage with correct project naming for different structures', async () => {
      // Mock the file system and glob for this specific test
      const originalFs = require('fs');

      const mockFs = {
        ...originalFs,
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockImplementation((path) => {
          if (path.includes('coverage-summary.json')) {
            return JSON.stringify({
              total: {
                lines: { pct: 85, covered: 85, total: 100 },
                functions: { pct: 90, covered: 18, total: 20 },
                branches: { pct: 80, covered: 40, total: 50 }
              }
            });
          }
          throw new Error('File not found');
        })
      };

      const mockGlob = jest
        .fn()
        .mockResolvedValue([
          '/test/coverage/apps/transect/coverage-summary.json',
          '/test/coverage/apps/backend/coverage-summary.json',
          '/test/coverage/library/coverage-summary.json',
          '/test/coverage/xyz/abc/qw/coverage-summary.json'
        ]);

      // Temporarily replace the modules
      jest.doMock('fs', () => mockFs);
      jest.doMock('glob', () => ({ glob: mockGlob }));

      // Clear the module cache to reload with new mocks
      jest.resetModules();

      const { parseCoverage: parseCoverageWithMocks } = require('../coverage-parser');
      const result = await parseCoverageWithMocks('/test/coverage');

      // Verify that project names are correctly extracted from paths
      expect(result).toHaveProperty('apps/transect');
      expect(result).toHaveProperty('apps/backend');
      expect(result).toHaveProperty('library');
      expect(result).toHaveProperty('xyz/abc/qw');

      // Verify that each project has the expected structure
      expect(result['apps/transect']).toHaveProperty('summary');
      expect(result['apps/backend']).toHaveProperty('summary');
      expect(result['library']).toHaveProperty('summary');
      expect(result['xyz/abc/qw']).toHaveProperty('summary');
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
