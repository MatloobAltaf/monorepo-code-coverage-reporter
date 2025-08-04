const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const lcovParse = require('lcov-parse');
const { promisify } = require('util');

const lcovParseAsync = promisify(lcovParse);

/**
 * Parse coverage data from a directory containing nested coverage files
 * Supports both LCOV (.info) and JSON summary files
 * @param {string} coverageFolder - Path to coverage folder
 * @returns {Object} Parsed coverage data organized by project
 */
async function parseCoverage(coverageFolder) {
  const coverage = {};

  if (!fs.existsSync(coverageFolder)) {
    throw new Error(`Coverage folder not found: ${coverageFolder}`);
  }

  // Find all coverage files recursively
  const lcovFiles = await glob(`${coverageFolder}/**/lcov.info`, { absolute: true });
  const jsonFiles = await glob(`${coverageFolder}/**/coverage-summary.json`, { absolute: true });

  // Parse LCOV files
  for (const lcovFile of lcovFiles) {
    const projectPath = getProjectPathFromFile(lcovFile, coverageFolder);
    const projectName = getProjectName(projectPath);

    try {
      const lcovData = await lcovParseAsync(lcovFile);
      coverage[projectName] = {
        ...coverage[projectName],
        lcov: lcovData,
        summary: calculateSummaryFromLcov(lcovData),
        path: projectPath
      };
    } catch (error) {
      console.warn(`Failed to parse LCOV file ${lcovFile}: ${error.message}`);
    }
  }

  // Parse JSON summary files
  for (const jsonFile of jsonFiles) {
    const projectPath = getProjectPathFromFile(jsonFile, coverageFolder);
    const projectName = getProjectName(projectPath);

    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      coverage[projectName] = {
        ...coverage[projectName],
        summary: jsonData.total || jsonData,
        path: projectPath
      };
    } catch (error) {
      console.warn(`Failed to parse JSON file ${jsonFile}: ${error.message}`);
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
  const relativePath = path.relative(path.resolve(coverageFolder), path.dirname(filePath));
  return relativePath || 'root';
}

/**
 * Get project name from project path
 * @param {string} projectPath - Project path
 * @returns {string} Project name
 */
function getProjectName(projectPath) {
  if (projectPath === 'root' || projectPath === '.') {
    return 'root';
  }

  // For Nx structure like apps/frontend or libs/shared
  const parts = projectPath.split(path.sep);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[parts.length - 1] || 'unknown';
}

/**
 * Calculate summary from LCOV data
 * @param {Array} lcovData - Parsed LCOV data
 * @returns {Object} Coverage summary
 */
function calculateSummaryFromLcov(lcovData) {
  const summary = {
    lines: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    statements: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 }
  };

  for (const file of lcovData) {
    // Lines
    if (file.lines && file.lines.details) {
      summary.lines.total += file.lines.found || 0;
      summary.lines.covered += file.lines.hit || 0;
    }

    // Functions
    if (file.functions && file.functions.details) {
      summary.functions.total += file.functions.found || 0;
      summary.functions.covered += file.functions.hit || 0;
    }

    // Branches
    if (file.branches && file.branches.details) {
      summary.branches.total += file.branches.found || 0;
      summary.branches.covered += file.branches.hit || 0;
    }
  }

  // Calculate percentages
  summary.lines.pct =
    summary.lines.total > 0 ? (summary.lines.covered / summary.lines.total) * 100 : 0;
  summary.functions.pct =
    summary.functions.total > 0 ? (summary.functions.covered / summary.functions.total) * 100 : 0;
  summary.branches.pct =
    summary.branches.total > 0 ? (summary.branches.covered / summary.branches.total) * 100 : 0;
  summary.statements.pct = summary.lines.pct; // Use lines as statements for LCOV

  return summary;
}

/**
 * Compare two coverage objects and return diff
 * @param {Object} current - Current coverage data
 * @param {Object} base - Base coverage data
 * @returns {Object} Coverage diff
 */
function compareCoverage(current, base) {
  const diff = {};

  // Get all project names from both current and base
  const allProjects = new Set([...Object.keys(current || {}), ...Object.keys(base || {})]);

  for (const projectName of allProjects) {
    const currentProject = current[projectName];
    const baseProject = base[projectName];

    if (!currentProject && baseProject) {
      // Project removed
      diff[projectName] = {
        status: 'removed',
        base: baseProject.summary
      };
    } else if (currentProject && !baseProject) {
      // Project added
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

      diff[projectName] = {
        status: 'modified',
        current: currentSummary,
        base: baseSummary,
        diff: {
          lines: lineDiff,
          functions: functionDiff,
          branches: branchDiff
        }
      };
    }
  }

  return diff;
}

module.exports = {
  parseCoverage,
  compareCoverage,
  calculateSummaryFromLcov
};
