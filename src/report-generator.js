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
    includeSummary,
    detailedCoverage = true
  } = options;

  let report = `## ${commentTitle}\n\n`;

  // Add summary if requested
  if (includeSummary) {
    report += generateSummary(currentCoverage, baseCoverage, totalCoverage);
  }

  // Add detailed coverage reports if not hidden
  if (!hideCoverageReports) {
    if (baseCoverage) {
      report += generateComparisonReport(
        currentCoverage,
        baseCoverage,
        hideUnchanged,
        detailedCoverage
      );
    } else {
      report += generateCoverageTable(currentCoverage, detailedCoverage);
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
    const emoji = diff > 0 ? '⬆️' : diff < 0 ? '⬇️' : '➖';
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
 * @param {boolean} detailedCoverage - Whether to show detailed coverage breakdown
 * @returns {string} Comparison report markdown
 */
function generateComparisonReport(
  currentCoverage,
  baseCoverage,
  hideUnchanged,
  detailedCoverage = true
) {
  const diff = compareCoverage(currentCoverage, baseCoverage);

  let report = '### 🔄 Individual App/Library Coverage Changes\n\n';

  if (detailedCoverage) {
    report +=
      '| Project | Lines Coverage | Functions Coverage | Branches Coverage | Statements | Status |\n';
    report +=
      '|---------|----------------|-------------------|-------------------|------------|--------|\n';
  } else {
    report += '| Project | Lines | Functions | Branches | Status |\n';
    report += '|---------|-------|-----------|----------|--------|\n';
  }

  const sortedProjects = Object.keys(diff).sort();
  let hasChanges = false;

  for (const projectName of sortedProjects) {
    const projectDiff = diff[projectName];

    if (
      hideUnchanged &&
      projectDiff.status === 'modified' &&
      Math.abs(projectDiff.diff.lines) < 0.01 &&
      Math.abs(projectDiff.diff.functions) < 0.01 &&
      Math.abs(projectDiff.diff.branches) < 0.01 &&
      Math.abs(projectDiff.diff.statements || 0) < 0.01
    ) {
      continue;
    }

    hasChanges = true;
    if (detailedCoverage) {
      report += generateEnhancedProjectRow(projectName, projectDiff);
    } else {
      report += generateProjectRow(projectName, projectDiff);
    }
  }

  if (!hasChanges) {
    if (detailedCoverage) {
      report += '| *No significant changes* | - | - | - | - | ✅ |\n';
    } else {
      report += '| *No significant changes* | - | - | - | ✅ |\n';
    }
  }

  report += '\n';

  // Add detailed breakdown section if requested
  if (detailedCoverage) {
    report += generateDetailedBreakdown(diff, hideUnchanged);
  }

  return report;
}

/**
 * Generate a table row for a project in the comparison report
 * @param {string} projectName - Project name
 * @param {Object} projectDiff - Project diff data
 * @returns {string} Table row markdown
 */
function generateProjectRow(projectName, projectDiff) {
  const { status, current, diff } = projectDiff;

  let linesCell, functionsCell, branchesCell, statusCell;

  switch (status) {
    case 'added':
      linesCell = `${formatPercentage(current.lines?.pct)} 🔹`;
      functionsCell = `${formatPercentage(current.functions?.pct)} 🔹`;
      branchesCell = `${formatPercentage(current.branches?.pct)} 🔹`;
      statusCell = '➕ Added';
      break;

    case 'modified': {
      linesCell = formatDiffCell(current.lines?.pct, diff.lines);
      functionsCell = formatDiffCell(current.functions?.pct, diff.functions);
      branchesCell = formatDiffCell(current.branches?.pct, diff.branches);

      // Show overall coverage trend based on lines coverage (most comprehensive metric)
      if (Math.abs(diff.lines) >= 0.01) {
        statusCell = diff.lines > 0 ? '⬆️ Increased' : '⬇️ Decreased';
      } else {
        statusCell = '➖ Unchanged';
      }
      break;
    }

    default:
      linesCell = functionsCell = branchesCell = statusCell = '-';
  }

  return `| ${projectName} | ${linesCell} | ${functionsCell} | ${branchesCell} | ${statusCell} |\n`;
}

/**
 * Generate an enhanced table row for a project with more detailed coverage info
 * @param {string} projectName - Project name
 * @param {Object} projectDiff - Project diff data
 * @returns {string} Enhanced table row markdown
 */
function generateEnhancedProjectRow(projectName, projectDiff) {
  const { status, current, base, diff } = projectDiff;

  let linesCell, functionsCell, branchesCell, statementsCell, statusCell;

  switch (status) {
    case 'added':
      linesCell = `${formatPercentage(current.lines?.pct)} 🔹<br/><small>${current.lines?.covered || 0}/${current.lines?.total || 0}</small>`;
      functionsCell = `${formatPercentage(current.functions?.pct)} 🔹<br/><small>${current.functions?.covered || 0}/${current.functions?.total || 0}</small>`;
      branchesCell = `${formatPercentage(current.branches?.pct)} 🔹<br/><small>${current.branches?.covered || 0}/${current.branches?.total || 0}</small>`;
      statementsCell = `${formatPercentage(current.statements?.pct)} 🔹<br/><small>${current.statements?.covered || 0}/${current.statements?.total || 0}</small>`;
      statusCell = '➕ Added';
      break;

    case 'modified': {
      linesCell = formatEnhancedDiffCell(current.lines, base.lines, diff.lines);
      functionsCell = formatEnhancedDiffCell(current.functions, base.functions, diff.functions);
      branchesCell = formatEnhancedDiffCell(current.branches, base.branches, diff.branches);
      statementsCell = formatEnhancedDiffCell(current.statements, base.statements, diff.statements); // Use statements diff for statements

      // Show overall coverage trend based on lines coverage (most comprehensive metric)
      if (Math.abs(diff.lines) >= 0.01) {
        statusCell = diff.lines > 0 ? '⬆️ Increased' : '⬇️ Decreased';
      } else {
        statusCell = '➖ Unchanged';
      }
      break;
    }

    default:
      linesCell = functionsCell = branchesCell = statementsCell = statusCell = '-';
  }

  return `| ${projectName} | ${linesCell} | ${functionsCell} | ${branchesCell} | ${statementsCell} | ${statusCell} |\n`;
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
  const emoji = diff > 0 ? '⬆️' : '⬇️';
  return `${currentFormatted} (${sign}${diff.toFixed(2)}%) ${emoji}`;
}

/**
 * Format an enhanced diff cell with detailed coverage info
 * @param {Object} current - Current coverage data
 * @param {Object} base - Base coverage data
 * @param {number} diff - Difference
 * @returns {string} Enhanced formatted cell
 */
function formatEnhancedDiffCell(current, base, diff) {
  const currentPct = current?.pct || 0;
  const currentCovered = current?.covered || 0;
  const currentTotal = current?.total || 0;

  const currentFormatted = formatPercentage(currentPct);
  const coverageDetails = `<small>${currentCovered}/${currentTotal}</small>`;

  if (Math.abs(diff) < 0.01) {
    return `${currentFormatted}<br/>${coverageDetails}`;
  }

  const sign = diff > 0 ? '+' : '';
  const emoji = diff > 0 ? '⬆️' : '⬇️';
  return `${currentFormatted} (${sign}${diff.toFixed(2)}%) ${emoji}<br/>${coverageDetails}`;
}

/**
 * Generate detailed breakdown section for coverage changes
 * @param {Object} diff - Coverage diff data
 * @param {boolean} hideUnchanged - Whether to hide unchanged projects
 * @returns {string} Detailed breakdown markdown
 */
function generateDetailedBreakdown(diff, hideUnchanged) {
  let breakdown = '### 📑 Detailed Coverage Breakdown\n\n';

  const changedProjects = Object.entries(diff).filter(([_, projectDiff]) => {
    if (hideUnchanged && projectDiff.status === 'modified') {
      return (
        Math.abs(projectDiff.diff.lines) >= 0.01 ||
        Math.abs(projectDiff.diff.functions) >= 0.01 ||
        Math.abs(projectDiff.diff.branches) >= 0.01 ||
        Math.abs(projectDiff.diff.statements || 0) >= 0.01
      );
    }
    return projectDiff.status !== 'modified' || !hideUnchanged;
  });

  if (changedProjects.length === 0) {
    breakdown += '*No significant coverage changes detected.*\n\n';
    return breakdown;
  }

  for (const [projectName, projectDiff] of changedProjects) {
    breakdown += generateProjectBreakdown(projectName, projectDiff);
  }

  return breakdown;
}

/**
 * Generate breakdown for a single project
 * @param {string} projectName - Project name
 * @param {Object} projectDiff - Project diff data
 * @returns {string} Project breakdown markdown
 */
function generateProjectBreakdown(projectName, projectDiff) {
  const { status, current, base, diff } = projectDiff;

  let breakdown = `#### ${projectName}\n\n`;

  switch (status) {
    case 'added':
      breakdown += '➕ **New project added**\n';
      breakdown += `- **Lines:** ${formatPercentage(current.lines?.pct)} (${current.lines?.covered || 0}/${current.lines?.total || 0})\n`;
      breakdown += `- **Functions:** ${formatPercentage(current.functions?.pct)} (${current.functions?.covered || 0}/${current.functions?.total || 0})\n`;
      breakdown += `- **Branches:** ${formatPercentage(current.branches?.pct)} (${current.branches?.covered || 0}/${current.branches?.total || 0})\n`;
      break;

    case 'modified': {
      const hasSignificantChange =
        Math.abs(diff.lines) >= 0.01 ||
        Math.abs(diff.functions) >= 0.01 ||
        Math.abs(diff.branches) >= 0.01 ||
        Math.abs(diff.statements || 0) >= 0.01;

      if (hasSignificantChange) {
        breakdown += '🔄 **Coverage changes detected**\n';
        if (Math.abs(diff.lines) >= 0.01) {
          const emoji = diff.lines > 0 ? '⬆️' : '⬇️';
          const sign = diff.lines > 0 ? '+' : '';
          breakdown += `- **Lines:** ${formatPercentage(current.lines?.pct)} (${sign}${diff.lines.toFixed(2)}%) ${emoji}\n`;
          breakdown += `  - Current: ${current.lines?.covered || 0}/${current.lines?.total || 0}\n`;
          breakdown += `  - Previous: ${base.lines?.covered || 0}/${base.lines?.total || 0}\n`;
        }
        if (Math.abs(diff.functions) >= 0.01) {
          const emoji = diff.functions > 0 ? '⬆️' : '⬇️';
          const sign = diff.functions > 0 ? '+' : '';
          breakdown += `- **Functions:** ${formatPercentage(current.functions?.pct)} (${sign}${diff.functions.toFixed(2)}%) ${emoji}\n`;
          breakdown += `  - Current: ${current.functions?.covered || 0}/${current.functions?.total || 0}\n`;
          breakdown += `  - Previous: ${base.functions?.covered || 0}/${base.functions?.total || 0}\n`;
        }
        if (Math.abs(diff.branches) >= 0.01) {
          const emoji = diff.branches > 0 ? '⬆️' : '⬇️';
          const sign = diff.branches > 0 ? '+' : '';
          breakdown += `- **Branches:** ${formatPercentage(current.branches?.pct)} (${sign}${diff.branches.toFixed(2)}%) ${emoji}\n`;
          breakdown += `  - Current: ${current.branches?.covered || 0}/${current.branches?.total || 0}\n`;
          breakdown += `  - Previous: ${base.branches?.covered || 0}/${base.branches?.total || 0}\n`;
        }
      } else {
        breakdown += '➖ **No significant changes**\n';
        breakdown += `- **Lines:** ${formatPercentage(current.lines?.pct)} (${current.lines?.covered || 0}/${current.lines?.total || 0})\n`;
        breakdown += `- **Functions:** ${formatPercentage(current.functions?.pct)} (${current.functions?.covered || 0}/${current.functions?.total || 0})\n`;
        breakdown += `- **Branches:** ${formatPercentage(current.branches?.pct)} (${current.branches?.covered || 0}/${current.branches?.total || 0})\n`;
      }
      break;
    }
  }

  breakdown += '\n';
  return breakdown;
}

/**
 * Generate a basic coverage table without comparison
 * @param {Object} coverage - Coverage data
 * @param {boolean} detailedCoverage - Whether to show detailed coverage breakdown
 * @returns {string} Coverage table markdown
 */
function generateCoverageTable(coverage, detailedCoverage = true) {
  let report = '### 🔄 Individual App/Library Coverage\n\n';

  if (detailedCoverage) {
    report +=
      '| Project | Lines Coverage | Functions Coverage | Branches Coverage | Statements |\n';
    report += '|---------|----------------|-------------------|-------------------|------------|\n';
  } else {
    report += '| Project | Lines | Functions | Branches |\n';
    report += '|---------|-------|-----------|----------|\n';
  }

  const sortedProjects = Object.keys(coverage).sort();

  for (const projectName of sortedProjects) {
    const project = coverage[projectName];
    const summary = project.summary;

    if (summary) {
      if (detailedCoverage) {
        const lines = `${formatPercentage(summary.lines?.pct)}<br/><small>${summary.lines?.covered || 0}/${summary.lines?.total || 0}</small>`;
        const functions = `${formatPercentage(summary.functions?.pct)}<br/><small>${summary.functions?.covered || 0}/${summary.functions?.total || 0}</small>`;
        const branches = `${formatPercentage(summary.branches?.pct)}<br/><small>${summary.branches?.covered || 0}/${summary.branches?.total || 0}</small>`;
        const statements = `${formatPercentage(summary.statements?.pct || summary.lines?.pct)}<br/><small>${summary.statements?.covered || summary.lines?.covered || 0}/${summary.statements?.total || summary.lines?.total || 0}</small>`;

        report += `| ${projectName} | ${lines} | ${functions} | ${branches} | ${statements} |\n`;
      } else {
        const lines = formatPercentage(summary.lines?.pct);
        const functions = formatPercentage(summary.functions?.pct);
        const branches = formatPercentage(summary.branches?.pct);

        report += `| ${projectName} | ${lines} | ${functions} | ${branches} |\n`;
      }
    }
  }

  report += '\n';

  // Add detailed breakdown for each project if requested
  if (detailedCoverage) {
    report += generateIndividualProjectDetails(coverage);
  }

  return report;
}

/**
 * Generate detailed breakdown for individual projects without comparison
 * @param {Object} coverage - Coverage data
 * @returns {string} Individual project details markdown
 */
function generateIndividualProjectDetails(coverage) {
  let details = '### 📑 Individual Project Details\n\n';

  const sortedProjects = Object.keys(coverage).sort();

  for (const projectName of sortedProjects) {
    const project = coverage[projectName];
    const summary = project.summary;

    if (summary) {
      details += `#### ${projectName}\n\n`;
      details += `- **Lines:** ${formatPercentage(summary.lines?.pct)} (${summary.lines?.covered || 0}/${summary.lines?.total || 0})\n`;
      details += `- **Functions:** ${formatPercentage(summary.functions?.pct)} (${summary.functions?.covered || 0}/${summary.functions?.total || 0})\n`;
      details += `- **Branches:** ${formatPercentage(summary.branches?.pct)} (${summary.branches?.covered || 0}/${summary.branches?.total || 0})\n`;
      details += `- **Statements:** ${formatPercentage(summary.statements?.pct || summary.lines?.pct)} (${summary.statements?.covered || summary.lines?.covered || 0}/${summary.statements?.total || summary.lines?.total || 0})\n`;

      if (project.path && project.path !== 'root') {
        details += `- **Path:** \`${project.path}\`\n`;
      }

      details += '\n';
    }
  }

  return details;
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

  for (const [, projectData] of Object.entries(coverage)) {
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
  formatPercentage,
  generateEnhancedProjectRow,
  formatEnhancedDiffCell,
  generateDetailedBreakdown,
  generateProjectBreakdown,
  generateIndividualProjectDetails
};
