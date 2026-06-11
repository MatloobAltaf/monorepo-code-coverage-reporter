const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const { parseCoverage, calculateTotalCoverage } = require('./coverage-parser');
const { generateReport } = require('./report-generator');
const { upsertComment } = require('./comment-handler');

async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const coverageFolder = core.getInput('coverage-folder', { required: true });
    const coverageBaseFolder = core.getInput('coverage-base-folder');
    const noCoverageRan = core.getInput('no-coverage-ran') === 'true';
    const hideCoverageReports = core.getInput('hide-coverage-reports') === 'true';
    const hideUnchanged = core.getInput('hide-unchanged') === 'true';

    const commentTitle = core.getInput('comment-title') || 'Coverage Report';
    const updateCommentFlag = core.getInput('update-comment') === 'true';
    const includeSummary = core.getInput('include-summary') === 'true';
    const detailedCoverage = core.getInput('detailed-coverage') === 'true';

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

    // Debug: List files in coverage directory
    if (fs.existsSync(coverageFolder)) {
      core.info(`Coverage folder exists: ${coverageFolder}`);
      const listFilesRecursively = (dir, prefix = '') => {
        try {
          const items = fs.readdirSync(dir);
          items.forEach((item) => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              core.info(`${prefix}📁 ${item}/`);
              listFilesRecursively(fullPath, `${prefix}  `);
            } else {
              core.info(`${prefix}📄 ${item}`);
            }
          });
        } catch (error) {
          core.warning(`Failed to list files in ${dir}: ${error.message}`);
        }
      };

      core.info('Files in coverage directory:');
      listFilesRecursively(coverageFolder);
    } else {
      core.warning(`Coverage folder does not exist: ${coverageFolder}`);
    }

    const currentCoverage = await parseCoverage(coverageFolder);

    // Debug: Log parsed projects
    core.info(`Total projects parsed: ${Object.keys(currentCoverage).length}`);
    Object.keys(currentCoverage).forEach((project) => {
      const coverage = currentCoverage[project].summary.lines?.pct || 'N/A';
      core.info(`  - ${project}: ${coverage}% lines coverage`);
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
      const comparableCurrent = calculateTotalCoverage(currentCoverage, commonProjects);
      const comparableBase = calculateTotalCoverage(baseCoverage, commonProjects);
      const coverageDiff = comparableCurrent - comparableBase;

      core.setOutput('coverage-changed', Math.abs(coverageDiff) >= 0.01 ? 'true' : 'false');
      core.setOutput(
        'coverage-diff',
        coverageDiff > 0 ? `+${coverageDiff.toFixed(2)}` : coverageDiff.toFixed(2)
      );
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

module.exports = { run };

if (require.main === module) {
  run();
}
