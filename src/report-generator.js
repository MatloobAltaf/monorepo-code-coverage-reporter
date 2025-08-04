const { compareCoverage } = require('./coverage-parser');

/**
 * Generate a markdown coverage report
 * @param {Object} options - Report generation options
 * @returns {string} Markdown report
 */
function generateReport(options) {
  const {
    currentCoverage,
    baseCoverage,
    totalCoverage,
    commentTitle,
    hideCoverageReports,
    hideUnchanged,
    includeSummary
  } = options;

  let report = `## ${commentTitle}\n\n`;

  // Add summary if requested
  if (includeSummary) {
    report += generateSummary(currentCoverage, baseCoverage, totalCoverage);
  }

  // Add detailed coverage reports if not hidden
  if (!hideCoverageReports) {
    if (baseCoverage) {
      report += generateComparisonReport(currentCoverage, baseCoverage, hideUnchanged);
    } else {
      report += generateCoverageTable(currentCoverage);
    }
  }

  return report;
}

/**
 * Generate coverage summary
 * @param {Object} currentCoverage - Current coverage data
 * @param {Object} baseCoverage - Base coverage data
 * @param {number} totalCoverage - Total coverage percentage
 * @returns {string} Summary markdown
 */
function generateSummary(currentCoverage, baseCoverage, totalCoverage) {
  let summary = `### Overall Coverage: ${totalCoverage.toFixed(2)}%\n\n`;

  if (baseCoverage) {
    const baseTotalCoverage = calculateTotalCoverage(baseCoverage);
    const diff = totalCoverage - baseTotalCoverage;
    const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
    const sign = diff > 0 ? '+' : '';
    
    summary += `**Coverage Change:** ${emoji} ${sign}${diff.toFixed(2)}% (from ${baseTotalCoverage.toFixed(2)}%)\n\n`;
  }

  return summary;
}

/**
 * Generate comparison report between current and base coverage
 * @param {Object} currentCoverage - Current coverage data
 * @param {Object} baseCoverage - Base coverage data
 * @param {boolean} hideUnchanged - Whether to hide unchanged projects
 * @returns {string} Comparison report markdown
 */
function generateComparisonReport(currentCoverage, baseCoverage, hideUnchanged) {
  const diff = compareCoverage(currentCoverage, baseCoverage);
  
  let report = '### Coverage Changes by Project\n\n';
  report += '| Project | Lines | Functions | Branches | Status |\n';
  report += '|---------|-------|-----------|----------|--------|\n';

  const sortedProjects = Object.keys(diff).sort();
  let hasChanges = false;

  for (const projectName of sortedProjects) {
    const projectDiff = diff[projectName];
    
    if (hideUnchanged && projectDiff.status === 'modified' && 
        Math.abs(projectDiff.diff.lines) < 0.01 && 
        Math.abs(projectDiff.diff.functions) < 0.01 && 
        Math.abs(projectDiff.diff.branches) < 0.01) {
      continue;
    }

    hasChanges = true;
    report += generateProjectRow(projectName, projectDiff);
  }

  if (!hasChanges) {
    report += '| *No significant changes* | - | - | - | ✅ |\n';
  }

  report += '\n';
  return report;
}

/**
 * Generate a table row for a project in the comparison report
 * @param {string} projectName - Project name
 * @param {Object} projectDiff - Project diff data
 * @returns {string} Table row markdown
 */
function generateProjectRow(projectName, projectDiff) {
  const { status, current, base, diff } = projectDiff;

  let linesCell, functionsCell, branchesCell, statusCell;

  switch (status) {
    case 'added':
      linesCell = `${formatPercentage(current.lines?.pct)} ✨`;
      functionsCell = `${formatPercentage(current.functions?.pct)} ✨`;
      branchesCell = `${formatPercentage(current.branches?.pct)} ✨`;
      statusCell = '🆕 Added';
      break;
      
    case 'removed':
      linesCell = `~~${formatPercentage(base.lines?.pct)}~~ ❌`;
      functionsCell = `~~${formatPercentage(base.functions?.pct)}~~ ❌`;
      branchesCell = `~~${formatPercentage(base.branches?.pct)}~~ ❌`;
      statusCell = '🗑️ Removed';
      break;
      
    case 'modified':
      linesCell = formatDiffCell(current.lines?.pct, diff.lines);
      functionsCell = formatDiffCell(current.functions?.pct, diff.functions);
      branchesCell = formatDiffCell(current.branches?.pct, diff.branches);
      
      const hasSignificantChange = Math.abs(diff.lines) >= 0.01 || 
                                   Math.abs(diff.functions) >= 0.01 || 
                                   Math.abs(diff.branches) >= 0.01;
      statusCell = hasSignificantChange ? '📊 Changed' : '➡️ Unchanged';
      break;
      
    default:
      linesCell = functionsCell = branchesCell = statusCell = '-';
  }

  return `| ${projectName} | ${linesCell} | ${functionsCell} | ${branchesCell} | ${statusCell} |\n`;
}

/**
 * Format a diff cell with current value and change indicator
 * @param {number} current - Current percentage
 * @param {number} diff - Difference
 * @returns {string} Formatted cell
 */
function formatDiffCell(current, diff) {
  const currentFormatted = formatPercentage(current);
  
  if (Math.abs(diff) < 0.01) {
    return currentFormatted;
  }
  
  const sign = diff > 0 ? '+' : '';
  const emoji = diff > 0 ? '📈' : '📉';
  return `${currentFormatted} (${sign}${diff.toFixed(2)}%) ${emoji}`;
}

/**
 * Generate a basic coverage table without comparison
 * @param {Object} coverage - Coverage data
 * @returns {string} Coverage table markdown
 */
function generateCoverageTable(coverage) {
  let report = '### Coverage by Project\n\n';
  report += '| Project | Lines | Functions | Branches |\n';
  report += '|---------|-------|-----------|----------|\n';

  const sortedProjects = Object.keys(coverage).sort();

  for (const projectName of sortedProjects) {
    const project = coverage[projectName];
    const summary = project.summary;

    if (summary) {
      const lines = formatPercentage(summary.lines?.pct);
      const functions = formatPercentage(summary.functions?.pct);
      const branches = formatPercentage(summary.branches?.pct);
      
      report += `| ${projectName} | ${lines} | ${functions} | ${branches} |\n`;
    }
  }

  report += '\n';
  return report;
}

/**
 * Format a percentage value
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage
 */
function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Calculate total coverage from coverage data
 * @param {Object} coverage - Coverage data
 * @returns {number} Total coverage percentage
 */
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

module.exports = {
  generateReport,
  generateSummary,
  generateComparisonReport,
  generateCoverageTable,
  formatPercentage
};
