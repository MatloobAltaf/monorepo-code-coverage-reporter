const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const core = require('@actions/core');
const { parseCoverage, compareCoverage, calculateTotalCoverage } = require('../coverage-parser');

const validSummary = (lines = { total: 100, covered: 85, pct: 85 }) => ({
  total: {
    lines,
    statements: { total: 120, covered: 102, pct: 85 },
    functions: { total: 20, covered: 18, pct: 90 },
    branches: { total: 50, covered: 40, pct: 80 }
  }
});

describe('coverage-parser', () => {
  let tmpDir;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-parser-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSummary(relDir, data) {
    const dir = relDir === '.' ? tmpDir : path.join(tmpDir, relDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'coverage-summary.json'), JSON.stringify(data));
  }

  function writeRaw(relDir, content) {
    const dir = path.join(tmpDir, relDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'coverage-summary.json'), content);
  }

  describe('parseCoverage', () => {
    it('throws when the coverage folder does not exist', async () => {
      await expect(parseCoverage(path.join(tmpDir, 'nope'))).rejects.toThrow(
        'Coverage folder not found'
      );
    });

    it('parses nested projects keyed by their relative directory', async () => {
      writeSummary('apps/frontend', validSummary());
      writeSummary('apps/backend', validSummary());
      writeSummary('xyz/abc/qw', validSummary());

      const result = await parseCoverage(tmpDir);

      expect(Object.keys(result).sort()).toEqual(['apps/backend', 'apps/frontend', 'xyz/abc/qw']);
      expect(result['apps/frontend'].summary).toEqual(validSummary().total);
      expect(result['apps/frontend'].path).toBe('apps/frontend');
    });

    it('keys a summary at the folder root as "root"', async () => {
      writeSummary('.', validSummary());

      const result = await parseCoverage(tmpDir);

      expect(Object.keys(result)).toEqual(['root']);
    });

    it('handles a trailing slash in the coverage folder argument', async () => {
      writeSummary('apps/frontend', validSummary());

      const result = await parseCoverage(`${tmpDir}${path.sep}`);

      expect(Object.keys(result)).toEqual(['apps/frontend']);
    });

    it('skips files with malformed JSON and warns', async () => {
      writeSummary('apps/good', validSummary());
      writeRaw('apps/bad', '{ not json');

      const result = await parseCoverage(tmpDir);

      expect(Object.keys(result)).toEqual(['apps/good']);
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('apps/bad'));
    });

    it('skips summaries without valid line totals and warns', async () => {
      writeSummary('apps/good', validSummary());
      writeSummary('apps/empty', {});
      writeSummary('apps/no-total', { 'src/file.js': { lines: { total: 10, covered: 5 } } });
      writeSummary('apps/bad-lines', { total: { lines: { total: 'x', covered: null } } });

      const result = await parseCoverage(tmpDir);

      expect(Object.keys(result)).toEqual(['apps/good']);
      expect(core.warning).toHaveBeenCalledTimes(3);
    });

    it('accepts a flat summary object without a total wrapper', async () => {
      writeSummary('apps/flat', {
        lines: { total: 10, covered: 5, pct: 50 },
        functions: { total: 2, covered: 1, pct: 50 },
        branches: { total: 4, covered: 2, pct: 50 }
      });

      const result = await parseCoverage(tmpDir);

      expect(result['apps/flat'].summary.lines.covered).toBe(5);
    });

    it('returns an empty object when no summary files exist', async () => {
      const result = await parseCoverage(tmpDir);
      expect(result).toEqual({});
    });

    it('ignores coverage summaries inside node_modules', async () => {
      writeSummary('apps/good', validSummary());
      writeSummary('node_modules/some-pkg', validSummary());

      const result = await parseCoverage(tmpDir);

      expect(Object.keys(result)).toEqual(['apps/good']);
    });
  });

  describe('calculateTotalCoverage', () => {
    const coverage = {
      a: { summary: { lines: { total: 100, covered: 50 } } },
      b: { summary: { lines: { total: 300, covered: 270 } } }
    };

    it('weights by line counts across projects', () => {
      expect(calculateTotalCoverage(coverage)).toBe(80);
    });

    it('restricts to the given project names', () => {
      expect(calculateTotalCoverage(coverage, ['a'])).toBe(50);
    });

    it('returns 0 for empty coverage', () => {
      expect(calculateTotalCoverage({})).toBe(0);
      expect(calculateTotalCoverage(coverage, [])).toBe(0);
    });
  });

  describe('compareCoverage', () => {
    it('detects added projects', () => {
      const current = {
        'apps/frontend': {
          summary: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } }
        }
      };

      const result = compareCoverage(current, {});

      expect(result['apps/frontend'].status).toBe('added');
      expect(result['apps/frontend'].current).toEqual(current['apps/frontend'].summary);
    });

    it('skips projects that exist only in base coverage', () => {
      const base = {
        'apps/backend': {
          summary: { lines: { pct: 75 }, functions: { pct: 80 }, branches: { pct: 70 } }
        }
      };

      const result = compareCoverage({}, base);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('calculates diffs for modified projects', () => {
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
