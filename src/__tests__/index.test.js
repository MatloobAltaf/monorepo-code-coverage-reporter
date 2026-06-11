jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}));
jest.mock('@actions/github', () => ({
  context: { eventName: 'pull_request' },
  getOctokit: jest.fn().mockReturnValue({ fake: 'octokit' })
}));
jest.mock('../comment-handler', () => ({
  upsertComment: jest.fn().mockResolvedValue(null)
}));
jest.mock('../coverage-parser', () => ({
  parseCoverage: jest.fn(),
  compareCoverage: jest.requireActual('../coverage-parser').compareCoverage,
  calculateTotalCoverage: jest.requireActual('../coverage-parser').calculateTotalCoverage
}));
jest.mock('../report-generator', () => ({
  generateReport: jest.fn().mockReturnValue('REPORT')
}));

const core = require('@actions/core');
const { upsertComment } = require('../comment-handler');
const { parseCoverage } = require('../coverage-parser');
const { generateReport } = require('../report-generator');
const { run, getBooleanInput } = require('../index');

// Captured before any test or beforeEach runs; run() calls core.getInput
// synchronously, so a module that executed run() on import leaves calls here.
const getInputCallsAtImport = core.getInput.mock.calls.length;

function setInputs(inputs) {
  core.getInput.mockImplementation((name) => inputs[name] ?? '');
}

const project = (total, covered) => ({
  summary: { lines: { total, covered, pct: (covered / total) * 100 } }
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  setInputs({ 'github-token': 'tok', 'coverage-folder': './coverage' });
});

describe('run with no-coverage-ran', () => {
  it('upserts the warning comment instead of always creating a new one', async () => {
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'no-coverage-ran': 'true',
      'update-comment': 'true'
    });

    await run();

    expect(parseCoverage).not.toHaveBeenCalled();
    expect(upsertComment).toHaveBeenCalledTimes(1);
    const [, , title, body, updateExisting] = upsertComment.mock.calls[0];
    expect(title).toBe('Coverage Report');
    expect(body).toContain('No coverage data was generated');
    expect(updateExisting).toBe(true);
  });

  it('respects update-comment: false for the warning comment', async () => {
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'no-coverage-ran': 'true',
      'update-comment': 'false'
    });

    await run();

    expect(upsertComment.mock.calls[0][4]).toBe(false);
  });
});

describe('module loading', () => {
  it('does not execute run() on import', () => {
    expect(getInputCallsAtImport).toBe(0);
  });
});

describe('outputs with base coverage', () => {
  it('computes coverage-diff over the intersection of projects only', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'coverage-base-folder': './coverage-base'
    });
    parseCoverage.mockResolvedValueOnce({ 'apps/a': project(100, 90) }).mockResolvedValueOnce({
      'apps/a': project(100, 80),
      'apps/b': project(1000, 100)
    });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('coverage-diff', '+10.00');
    expect(core.setOutput).toHaveBeenCalledWith('coverage-changed', 'true');
    expect(core.setOutput).toHaveBeenCalledWith('total-coverage', '90.00');
  });

  it('treats an empty base result as no base at all', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'coverage-base-folder': './coverage-base'
    });
    parseCoverage.mockResolvedValueOnce({ 'apps/a': project(100, 90) }).mockResolvedValueOnce({});

    await run();

    expect(generateReport).toHaveBeenCalledWith(expect.objectContaining({ baseCoverage: null }));
    expect(core.setOutput).not.toHaveBeenCalledWith('coverage-changed', expect.anything());
  });

  it('reports coverage-changed false for sub-epsilon drift', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'coverage-base-folder': './coverage-base'
    });
    parseCoverage
      .mockResolvedValueOnce({ 'apps/a': project(300000, 100000) })
      .mockResolvedValueOnce({ 'apps/a': project(300000, 100001) });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('coverage-changed', 'false');
  });

  it('formats a negative coverage-diff without a plus sign', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'coverage-base-folder': './coverage-base'
    });
    parseCoverage
      .mockResolvedValueOnce({ 'apps/a': project(100, 80) })
      .mockResolvedValueOnce({ 'apps/a': project(100, 90) });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('coverage-diff', '-10.00');
    expect(core.setOutput).toHaveBeenCalledWith('coverage-changed', 'true');
  });
});

describe('boolean input defaults', () => {
  it('defaults update-comment to true when the input is empty', async () => {
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'no-coverage-ran': 'true'
    });

    await run();

    expect(upsertComment.mock.calls[0][4]).toBe(true);
  });

  it('parses mixed-case booleans', async () => {
    setInputs({
      'github-token': 'tok',
      'coverage-folder': './coverage',
      'no-coverage-ran': 'True'
    });

    await run();

    expect(parseCoverage).not.toHaveBeenCalled();
  });

  it('falls back to the provided default on empty input', () => {
    core.getInput.mockReturnValue('');
    expect(getBooleanInput('x', true)).toBe(true);
    expect(getBooleanInput('x', false)).toBe(false);
  });

  it('warns and treats unrecognized values as false', () => {
    core.getInput.mockReturnValue('yes');
    expect(getBooleanInput('x', true)).toBe(false);
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('expected a boolean'));
  });
});
