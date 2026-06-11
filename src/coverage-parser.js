const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const { glob } = require('glob');

/**
 * Parse coverage data from a directory containing nested coverage-summary.json files
 * @param {string} coverageFolder - Path to coverage folder
 * @returns {Promise<Object>} Parsed coverage data organized by project
 */
async function parseCoverage(coverageFolder) {
  if (!fs.existsSync(coverageFolder)) {
    throw new Error(`Coverage folder not found: ${coverageFolder}`);
  }

  // Scope the glob to the folder via cwd so the path itself is never
  // interpreted as a pattern, and results come back relative.
  const summaryFiles = await glob('**/coverage-summary.json', {
    cwd: coverageFolder,
    ignore: '**/node_modules/**'
  });
  const coverage = {};

  for (const relativeFile of summaryFiles.sort()) {
    const fullPath = path.join(coverageFolder, relativeFile);
    const projectPath = getProjectPath(relativeFile);

    try {
      const jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const summary = extractTotalSummary(jsonData);

      if (!summary) {
        core.warning(`Skipping ${fullPath}: no valid coverage totals found`);
        continue;
      }

      coverage[projectPath] = {
        summary,
        path: projectPath
      };
    } catch (error) {
      core.warning(`Failed to parse coverage summary ${fullPath}: ${error.message}`);
    }
  }

  return coverage;
}

/**
 * Derive the project key from a summary file path relative to the coverage folder
 * @param {string} relativeFile - Relative path to coverage-summary.json
 * @returns {string} Project path key
 */
function getProjectPath(relativeFile) {
  const normalized = relativeFile.split('\\').join('/');
  const dir = path.posix.dirname(normalized);
  return dir === '.' ? 'root' : dir;
}

/**
 * Fill in missing pct values from raw counts, matching the istanbul
 * convention of reporting 100% when there is nothing to cover.
 * @param {Object} summary - Valid totals summary
 * @returns {Object} Summary with pct present for every counted metric
 */
function normalizeSummary(summary) {
  for (const metric of ['lines', 'statements', 'functions', 'branches']) {
    const data = summary[metric];
    if (
      data &&
      typeof data.total === 'number' &&
      typeof data.covered === 'number' &&
      typeof data.pct !== 'number'
    ) {
      data.pct = data.total === 0 ? 100 : (data.covered / data.total) * 100;
    }
  }
  return summary;
}

/**
 * Extract the aggregated totals from a coverage-summary.json payload.
 * Accepts the standard istanbul shape ({ total: {...} }) and, for backward
 * compatibility, a flat summary object that itself carries line totals.
 * @param {Object} jsonData - Parsed JSON payload
 * @returns {Object|null} Totals summary or null when invalid
 */
function extractTotalSummary(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    return null;
  }
  if (isValidSummary(jsonData.total)) {
    return normalizeSummary(jsonData.total);
  }
  if (isValidSummary(jsonData)) {
    return normalizeSummary(jsonData);
  }
  return null;
}

/**
 * Check that a summary carries the numeric line totals the reporter depends on
 * @param {Object} summary - Candidate summary object
 * @returns {boolean} Whether the summary is usable
 */
function isValidSummary(summary) {
  return Boolean(
    summary &&
      typeof summary === 'object' &&
      summary.lines &&
      typeof summary.lines.total === 'number' &&
      typeof summary.lines.covered === 'number'
  );
}

/**
 * Calculate total coverage as a weighted average over raw line counts
 * @param {Object} coverage - Parsed coverage data keyed by project
 * @param {string[]|null} projectNames - Optional subset of projects to include
 * @returns {number} Total coverage percentage
 */
function calculateTotalCoverage(coverage, projectNames = null) {
  let totalLines = 0;
  let coveredLines = 0;

  const names = projectNames || Object.keys(coverage || {});
  for (const name of names) {
    const projectData = coverage ? coverage[name] : null;
    if (projectData?.summary) {
      totalLines += projectData.summary.lines?.total || 0;
      coveredLines += projectData.summary.lines?.covered || 0;
    }
  }

  return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
}

/**
 * Compare two coverage objects and return diff
 * @param {Object} current - Current coverage data
 * @param {Object} base - Base coverage data
 * @returns {Object} Coverage diff
 */
function compareCoverage(current, base) {
  const diff = {};

  // Only process projects that have current coverage data
  // Skip projects that exist only in base coverage to avoid confusing "removed" status
  const currentProjects = Object.keys(current || {});

  for (const projectName of currentProjects) {
    const currentProject = current[projectName];
    const baseProject = base ? base[projectName] : null;

    if (currentProject && !baseProject) {
      // Project added (new coverage)
      diff[projectName] = {
        status: 'added',
        current: currentProject.summary
      };
    } else if (currentProject && baseProject) {
      // Project exists in both, calculate diff
      const currentSummary = currentProject.summary;
      const baseSummary = baseProject.summary;

      const lineDiff = (currentSummary.lines?.pct || 0) - (baseSummary.lines?.pct || 0);
      const functionDiff = (currentSummary.functions?.pct || 0) - (baseSummary.functions?.pct || 0);
      const branchDiff = (currentSummary.branches?.pct || 0) - (baseSummary.branches?.pct || 0);
      const statementsDiff =
        (currentSummary.statements?.pct || currentSummary.lines?.pct || 0) -
        (baseSummary.statements?.pct || baseSummary.lines?.pct || 0);

      diff[projectName] = {
        status: 'modified',
        current: currentSummary,
        base: baseSummary,
        diff: {
          lines: lineDiff,
          functions: functionDiff,
          branches: branchDiff,
          statements: statementsDiff
        }
      };
    }
  }

  return diff;
}

module.exports = {
  parseCoverage,
  compareCoverage,
  calculateTotalCoverage
};
