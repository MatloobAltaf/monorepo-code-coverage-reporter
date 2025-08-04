const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { parseCoverage } = require('./coverage-parser');
const { generateReport } = require('./report-generator');
const { postComment, updateComment, findExistingComment } = require('./comment-handler');

async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const coverageFolder = core.getInput('coverage-folder', { required: true });
    const coverageBaseFolder = core.getInput('coverage-base-folder');
    const noCoverageRan = core.getInput('no-coverage-ran') === 'true';
    const hideCoverageReports = core.getInput('hide-coverage-reports') === 'true';
    const hideUnchanged = core.getInput('hide-unchanged') === 'true';
    const minimumCoverage = parseFloat(core.getInput('minimum-coverage') || '0');
    const commentTitle = core.getInput('comment-title') || 'Coverage Report';
    const updateCommentFlag = core.getInput('update-comment') === 'true';
    const includeSummary = core.getInput('include-summary') === 'true';
    const workingDirectory = core.getInput('working-directory') || './';

    // Change to working directory
    if (workingDirectory !== './') {
      process.chdir(workingDirectory);
    }

    // Skip if no coverage ran
    if (noCoverageRan) {
      core.info('No coverage was generated, skipping coverage report');
      const octokit = github.getOctokit(token);
      
      if (github.context.eventName === 'pull_request') {
        const comment = `## ${commentTitle}\n\n⚠️ No coverage data was generated for this build.`;
        await postComment(octokit, github.context, comment);
      }
      
      return;
    }

    // Parse current coverage
    core.info(`Parsing coverage from: ${coverageFolder}`);
    const currentCoverage = await parseCoverage(coverageFolder);
    
    if (!currentCoverage || Object.keys(currentCoverage).length === 0) {
      throw new Error(`No coverage data found in ${coverageFolder}`);
    }

    // Parse base coverage if provided
    let baseCoverage = null;
    if (coverageBaseFolder && fs.existsSync(coverageBaseFolder)) {
      core.info(`Parsing base coverage from: ${coverageBaseFolder}`);
      try {
        baseCoverage = await parseCoverage(coverageBaseFolder);
      } catch (error) {
        core.warning(`Failed to parse base coverage: ${error.message}`);
      }
    }

    // Calculate total coverage
    const totalCoverage = calculateTotalCoverage(currentCoverage);
    core.info(`Total coverage: ${totalCoverage.toFixed(2)}%`);

    // Set outputs
    core.setOutput('total-coverage', totalCoverage.toFixed(2));
    
    if (baseCoverage) {
      const baseTotalCoverage = calculateTotalCoverage(baseCoverage);
      const coverageDiff = totalCoverage - baseTotalCoverage;
      core.setOutput('coverage-changed', coverageDiff !== 0 ? 'true' : 'false');
      core.setOutput('coverage-diff', coverageDiff > 0 ? `+${coverageDiff.toFixed(2)}` : coverageDiff.toFixed(2));
    }

    // Check minimum coverage
    if (totalCoverage < minimumCoverage) {
      core.setFailed(`Coverage ${totalCoverage.toFixed(2)}% is below minimum required ${minimumCoverage}%`);
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
        includeSummary
      });

      const octokit = github.getOctokit(token);
      
      if (updateCommentFlag) {
        const existingComment = await findExistingComment(octokit, github.context, commentTitle);
        if (existingComment) {
          await updateComment(octokit, github.context, existingComment.id, report);
        } else {
          await postComment(octokit, github.context, report);
        }
      } else {
        await postComment(octokit, github.context, report);
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

function calculateTotalCoverage(coverage) {
  let totalLines = 0;
  let coveredLines = 0;

  for (const [projectName, projectData] of Object.entries(coverage)) {
    if (projectData.summary) {
      totalLines += projectData.summary.lines?.total || 0;
      coveredLines += projectData.summary.lines?.covered || 0;
    }
  }

  return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
}

run();
