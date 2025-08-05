const fs = require('fs');
const core = require('@actions/core');
const { glob } = require('glob');

/**
 * Parse coverage data from a directory containing nested coverage-summary.json files
 * @param {string} coverageFolder - Path to coverage folder
 * @returns {Object} Parsed coverage data organized by project
 */
async function parseCoverage(coverageFolder) {
  const coverage = {};

  if (!fs.existsSync(coverageFolder)) {
    throw new Error(`Coverage folder not found: ${coverageFolder}`);
  }

  // Find all coverage-summary.json files recursively
  const jsonSummaryFiles = await glob(`${coverageFolder}/**/coverage-summary.json`);

  core.info(`Found ${jsonSummaryFiles.length} coverage-summary.json files`);

  // Parse JSON summary files
  for (const jsonFile of jsonSummaryFiles) {
    core.info(`Parsing ${jsonFile}`);

    const projectPath = getProjectPathFromFile(jsonFile, coverageFolder);
    const projectName = getProjectName(projectPath);

    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

      // Extract the total summary from coverage-summary.json
      // The file contains a 'total' field with aggregated coverage data
      const summary = jsonData.total || jsonData;

      coverage[projectName] = {
        summary: summary,
        path: projectPath
      };
    } catch (error) {
      console.warn(`Failed to parse JSON summary file ${jsonFile}: ${error.message}`);
    }
  }

  return coverage;
}

/**
 * Extract project path from file path relative to coverage folder
 * @param {string} filePath - Full path to coverage file
 * @param {string} coverageFolder - Base coverage folder
 * @returns {string} Project path
 */
function getProjectPathFromFile(filePath, coverageFolder) {
  const relativePath = filePath
    .replace(`${coverageFolder}/`, '')
    .replace('/coverage-summary.json', '');

  return relativePath || 'root';
}

/**
 * Get project name from project path - use the full relative path as the name
 * @param {string} projectPath - Project path
 * @returns {string} Project name
 */
function getProjectName(projectPath) {
  if (projectPath === 'root' || projectPath === '.') {
    return 'root';
  }

  // Use the full relative path as the project name
  return projectPath;
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
  compareCoverage
};
