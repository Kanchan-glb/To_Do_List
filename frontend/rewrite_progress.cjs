const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/components/WorkProgressTracker.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const importsToAdd = `
import DraggableGrid from "./dnd/DraggableGrid";
import DraggableCard from "./dnd/DraggableCard";
import { clearLayout } from "../utils/layoutStorage";
`;

if (!content.includes('DraggableGrid')) {
  content = content.replace(
    'import { useState, useMemo, useEffect } from "react";\n',
    'import { useState, useMemo, useEffect } from "react";\n' + importsToAdd
  ).replace(
    'import { useState, useMemo, useEffect } from "react";\r\n',
    'import { useState, useMemo, useEffect } from "react";\r\n' + importsToAdd
  );
}

// Add IcoReset
const icoResetStr = `const IcoReset = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>;\n\nexport default function WorkProgressTracker() {`;
if (!content.includes('const IcoReset')) {
  content = content.replace('export default function WorkProgressTracker() {', icoResetStr);
}

// 2. We need to extract the parts and rebuild the return block
// The return block starts at `return (` and ends at the bottom of the file
const startRegex = /return \([\s\S]*?<div className="page-fade-in wpt-container">/;
const endRegex = /<\/div>\s*<\/div>\s*\);\s*\}\s*$/;

let match = content.match(/<div className="wpt-summary-grid">([\s\S]*?)<\/div>\s*<div className="wpt-main-grid">/);
if (!match) throw new Error("Could not find summary grid");

const summaryHtml = match[1];
const extractDiv = (html, matchStr) => {
    const parts = html.split('<div className="wpt-sum-card">');
    for (let i=1; i<parts.length; i++) {
        if (parts[i].includes(matchStr)) {
            return '<div className="wpt-sum-card">' + parts[i].split('</div>')[0] + '</div>';
        }
    }
    return '';
};

const sumTotal = extractDiv(summaryHtml, 'Total Tasks');
const sumCompleted = extractDiv(summaryHtml, '>Completed<');
const sumPending = extractDiv(summaryHtml, '>Pending<');
const sumOverdue = extractDiv(summaryHtml, '>Overdue<');
const sumRescheduled = extractDiv(summaryHtml, '>Rescheduled<');
const sumCompletion = extractDiv(summaryHtml, '>Completion %<');

// Now extract the left column and right column cards
const mainRegex = /<div className="wpt-main-grid">([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\}\s*$/;
const mainMatch = content.match(mainRegex);
if (!mainMatch) throw new Error("Could not find main grid");
const mainHtml = mainMatch[1];

const leftRegex = /\{\/\* LEFT COLUMN \*\/\}\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "24px" \}\}>([\s\S]*?)\{\/\* RIGHT COLUMN \*\/\}/;
const rightRegex = /\{\/\* RIGHT COLUMN \*\/\}\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "24px" \}\}>([\s\S]*?)$/;

const leftMatch = mainHtml.match(leftRegex);
const rightMatch = mainHtml.match(rightRegex);

let leftHtml = leftMatch[1];
let rightHtml = rightMatch[1];

// Extracting Left Column pieces:
// 1. Daily Progress (starts with `{/* Daily Progress */}`)
// 2. Weekly Progress (starts with `{/* Weekly Progress (Last 7 Days) */}`)
// 3. Charts Row (starts with `{/* Charts Row */}`)

const extractBlock = (html, startComment, nextComment) => {
    let startIdx = html.indexOf(startComment);
    let endIdx = nextComment ? html.indexOf(nextComment) : html.lastIndexOf('</div>\n        </div>');
    if (endIdx === -1) endIdx = html.length;
    let block = html.substring(startIdx, endIdx).trim();
    // if nextComment is null, we might have captured the closing tags of left col.
    // Left col closes with `</div>` before `        {/* RIGHT COLUMN */}`
    if (!nextComment) {
        block = block.replace(/<\/div>\s*$/, '').trim();
    }
    return block;
};

const leftDaily = extractBlock(leftHtml, '{/* Daily Progress */}', '{/* Weekly Progress (Last 7 Days) */}');
const leftWeekly = extractBlock(leftHtml, '{/* Weekly Progress (Last 7 Days) */}', '{/* Charts Row */}');
const chartsRowRaw = extractBlock(leftHtml, '{/* Charts Row */}', null);

// chartsRowRaw contains the `.wpt-chart-grid` wrapper.
// We should extract the two cards inside it: Weekly Completion and Status Distribution
const chartGridRegex = /<div className="wpt-chart-grid">([\s\S]*?)<\/div>\s*$/;
const chartGridMatch = chartsRowRaw.match(chartGridRegex);
let chartGridHtml = chartGridMatch ? chartGridMatch[1] : chartsRowRaw;

const weeklyChartIdx = chartGridHtml.indexOf('Weekly Completion');
const statusChartIdx = chartGridHtml.indexOf('Status Distribution');
const weeklyChartHtml = chartGridHtml.substring(0, chartGridHtml.lastIndexOf('<div className="wpt-card"', statusChartIdx)).trim();
const statusChartHtml = chartGridHtml.substring(chartGridHtml.lastIndexOf('<div className="wpt-card"', statusChartIdx)).trim();

// Extracting Right Column pieces:
// 1. View Previous Progress
// 2. Performance Insights

const rightPrevious = extractBlock(rightHtml, '{/* Historical Progress Date Picker */}', '{/* Calendar View */}');
const rightInsights = extractBlock(rightHtml, '{/* Performance Insights */}', null);

const newRenderBlock = `
  return (
    <div className="page-fade-in wpt-container">
      {/* ── Header & Filters ── */}
      <div className="wpt-header">
        <div>
          <h2 className="wpt-title">Report Tracker</h2>
        </div>
        <div className="wpt-filters" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="wpt-filter-group">
            {["Today", "Yesterday", "Tomorrow", "Last 7 Days", "This Month"].map(f => (
              <button
                key={f}
                className={\`wpt-filter-btn \${activeFilter === f ? "active" : ""}\`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button type="button" className="db-summary-trigger-btn no-print" onClick={() => { clearLayout('reports'); window.location.reload(); }} aria-label="Reset Layout" title="Reset Layout to Default">
            <IcoReset />
            <span className="db-summary-trigger-label">Reset Layout</span>
          </button>
        </div>
      </div>

      <DraggableGrid page="reports" defaultLayout={['sum-total', 'sum-completed', 'sum-pending', 'sum-overdue', 'sum-rescheduled', 'sum-completion', 'left-daily', 'left-weekly', 'chart-weekly', 'chart-status', 'right-previous', 'right-insights']}>
        {({ layout }) => {
          const renderWidget = (id) => {
            switch(id) {
              case 'sum-total': return <DraggableCard id="sum-total" key="sum-total">${sumTotal}</DraggableCard>;
              case 'sum-completed': return <DraggableCard id="sum-completed" key="sum-completed">${sumCompleted}</DraggableCard>;
              case 'sum-pending': return <DraggableCard id="sum-pending" key="sum-pending">${sumPending}</DraggableCard>;
              case 'sum-overdue': return <DraggableCard id="sum-overdue" key="sum-overdue">${sumOverdue}</DraggableCard>;
              case 'sum-rescheduled': return <DraggableCard id="sum-rescheduled" key="sum-rescheduled">${sumRescheduled}</DraggableCard>;
              case 'sum-completion': return <DraggableCard id="sum-completion" key="sum-completion">${sumCompletion}</DraggableCard>;
              case 'left-daily': return <DraggableCard id="left-daily" key="left-daily">${leftDaily}</DraggableCard>;
              case 'left-weekly': return <DraggableCard id="left-weekly" key="left-weekly">${leftWeekly}</DraggableCard>;
              case 'chart-weekly': return <DraggableCard id="chart-weekly" key="chart-weekly">${weeklyChartHtml}</DraggableCard>;
              case 'chart-status': return <DraggableCard id="chart-status" key="chart-status">${statusChartHtml}</DraggableCard>;
              case 'right-previous': return <DraggableCard id="right-previous" key="right-previous">${rightPrevious}</DraggableCard>;
              case 'right-insights': return <DraggableCard id="right-insights" key="right-insights">${rightInsights}</DraggableCard>;
              default: return null;
            }
          };

          return (
            <>
              {/* ── Top Summary Cards ── */}
              <div className="wpt-summary-grid">
                {layout.filter(id => id.startsWith('sum-')).map(renderWidget)}
              </div>

              <div className="wpt-main-grid">
                {/* LEFT COLUMN */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {layout.filter(id => id.startsWith('left-')).map(renderWidget)}
                  
                  {/* Charts Row */}
                  <div className="wpt-chart-grid">
                    {layout.filter(id => id.startsWith('chart-')).map(renderWidget)}
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {layout.filter(id => id.startsWith('right-')).map(renderWidget)}
                </div>
              </div>
            </>
          );
        }}
      </DraggableGrid>
    </div>
  );
}
`;

// Replace everything from `return (` to the end with `newRenderBlock`
const startIdx = content.indexOf('  return (');
if (startIdx !== -1) {
    content = content.substring(0, startIdx) + newRenderBlock;
    fs.writeFileSync(targetFile, content);
    console.log("Successfully rewrote WorkProgressTracker.jsx");
} else {
    console.log("Failed to find return statement");
}
