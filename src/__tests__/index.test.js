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
  compareCoverage: jest.requireActual('../coverage-parser').compareCoverage
}));
jest.mock('../report-generator', () => ({
  generateReport: jest.fn().mockReturnValue('REPORT')
}));

const core = require('@actions/core');
const { upsertComment } = require('../comment-handler');
const { parseCoverage } = require('../coverage-parser');
const { run } = require('../index');

// Captured before any test or beforeEach runs; run() calls core.getInput
// synchronously, so a module that executed run() on import leaves calls here.
const getInputCallsAtImport = core.getInput.mock.calls.length;

function setInputs(inputs) {
  core.getInput.mockImplementation((name) => inputs[name] ?? '');
}

beforeEach(() => {
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
