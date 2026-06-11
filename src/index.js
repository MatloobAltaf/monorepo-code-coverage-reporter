const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { parseCoverage, calculateTotalCoverage } = require('./coverage-parser');
const { generateReport } = require('./report-generator');
const { upsertComment } = require('./comment-handler');

/**
 * Read a boolean input, falling back to the action.yml default when unset.
 * GitHub injects action.yml defaults in real runs; the fallback matters for
 * direct invocations and tests.
 * @param {string} name - Input name
 * @param {boolean} defaultValue - Default when the input is empty
 * @returns {boolean} Parsed input
 */
function getBooleanInput(name, defaultValue) {
  const raw = core.getInput(name);
  if (raw === '') {
    return defaultValue;
  }
  const lowered = raw.toLowerCase();
  if (lowered === 'true') {
    return true;
  }
  if (lowered === 'false') {
    return false;
  }
  core.warning(`Input "${name}" expected a boolean, got "${raw}"; treating as false`);
  return false;
}

async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const coverageFolder = core.getInput('coverage-folder', { required: true });
    const coverageBaseFolder = core.getInput('coverage-base-folder');
    const noCoverageRan = getBooleanInput('no-coverage-ran', false);
    const hideCoverageReports = getBooleanInput('hide-coverage-reports', false);
    const hideUnchanged = getBooleanInput('hide-unchanged', false);

    const commentTitle = core.getInput('comment-title') || 'Coverage Report';
    const updateCommentFlag = getBooleanInput('update-comment', true);
    const includeSummary = getBooleanInput('include-summary', true);
    const detailedCoverage = getBooleanInput('detailed-coverage', true);

    // Skip if no coverage ran
    if (noCoverageRan) {
      core.info('No coverage was generated, skipping coverage report');

      if (github.context.eventName === 'pull_request') {
        const octokit = github.getOctokit(token);
        const body = `## ${commentTitle}\n\n⚠️ No coverage data was generated for this build.`;
        await upsertComment(octokit, github.context, commentTitle, body, updateCommentFlag);
      }

      return;
    }

    // Parse current coverage
    core.info(`Parsing coverage from: ${coverageFolder}`);

    const currentCoverage = await parseCoverage(coverageFolder);

    core.info(`Total projects parsed: ${Object.keys(currentCoverage).length}`);
    Object.keys(currentCoverage).forEach((project) => {
      const pct = currentCoverage[project].summary.lines?.pct;
      core.info(`  - ${project}: ${typeof pct === 'number' ? `${pct}%` : 'N/A'} lines coverage`);
    });

    if (!currentCoverage || Object.keys(currentCoverage).length === 0) {
      throw new Error(`No coverage data found in ${coverageFolder}`);
    }

    // Parse base coverage if provided
    let baseCoverage = null;
    if (coverageBaseFolder) {
      if (fs.existsSync(coverageBaseFolder)) {
        core.info(`Parsing base coverage from: ${coverageBaseFolder}`);
        try {
          const parsedBase = await parseCoverage(coverageBaseFolder);
          if (Object.keys(parsedBase).length > 0) {
            baseCoverage = parsedBase;
          } else {
            core.warning(
              `Base coverage folder has no valid coverage data, skipping comparison: ${coverageBaseFolder}`
            );
          }
        } catch (error) {
          core.warning(`Failed to parse base coverage: ${error.message}`);
        }
      } else {
        core.warning(`Base coverage folder not found, skipping comparison: ${coverageBaseFolder}`);
      }
    }

    // Calculate total coverage
    const totalCoverage = calculateTotalCoverage(currentCoverage);
    core.info(`Total coverage: ${totalCoverage.toFixed(2)}%`);

    // Set outputs
    core.setOutput('total-coverage', totalCoverage.toFixed(2));

    if (baseCoverage) {
      const commonProjects = Object.keys(currentCoverage).filter(
        (projectName) => projectName in baseCoverage
      );

      if (commonProjects.length > 0) {
        const comparableCurrent = calculateTotalCoverage(currentCoverage, commonProjects);
        const comparableBase = calculateTotalCoverage(baseCoverage, commonProjects);
        const coverageDiff = comparableCurrent - comparableBase;

        core.setOutput('coverage-changed', Math.abs(coverageDiff) >= 0.01 ? 'true' : 'false');
        core.setOutput(
          'coverage-diff',
          coverageDiff > 0 ? `+${coverageDiff.toFixed(2)}` : coverageDiff.toFixed(2)
        );
      } else {
        core.info(
          'No projects exist in both current and base coverage, skipping comparison outputs'
        );
      }
    }

    // Generate report for PR comments
    if (github.context.eventName === 'pull_request') {
      const report = generateReport({
        currentCoverage,
        baseCoverage,
        totalCoverage,
        commentTitle,
        hideCoverageReports,
        hideUnchanged,
        includeSummary,
        detailedCoverage
      });

      const octokit = github.getOctokit(token);
      await upsertComment(octokit, github.context, commentTitle, report, updateCommentFlag);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = { run, getBooleanInput };

if (require.main === module) {
  run();
}
