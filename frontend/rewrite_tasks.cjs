const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/components/TaskPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add imports
const importsToAdd = `
import DraggableGrid from "./dnd/DraggableGrid";
import DraggableCard from "./dnd/DraggableCard";
import { clearLayout } from "../utils/layoutStorage";
`;

if (!content.includes('DraggableGrid')) {
  content = content.replace(
    'import { useState, useEffect, useMemo, useRef } from "react";\n',
    'import { useState, useEffect, useMemo, useRef } from "react";\n' + importsToAdd
  ).replace(
    'import { useState, useEffect, useMemo, useRef } from "react";\r\n',
    'import { useState, useEffect, useMemo, useRef } from "react";\r\n' + importsToAdd
  );
}

// Add IcoReset component
const icoResetStr = `const IcoReset = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>;\n\nfunction TaskPage() {`;
if (!content.includes('const IcoReset')) {
  content = content.replace('function TaskPage() {', icoResetStr);
}

// 2. Wrap the grid
const gridStartMarker = '<section className="status-grid">';
const gridEndMarker = '{subtaskPopupTask && (';

const startIndex = content.indexOf(gridStartMarker);
const endIndex = content.indexOf(gridEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let gridContent = content.substring(startIndex, endIndex);

  // We'll replace `.slice(0, 2)` with `` in all occurrences
  gridContent = gridContent.replace(/\.slice\(0,\s*2\)/g, '');
  
  // Remove the `+X more tasks` logic block
  const moreTasksRegex = /\{[a-zA-Z]+TasksList\.length > 2 && \([\s\S]*?<\/div>\s*\)\s*\}/g;
  gridContent = gridContent.replace(moreTasksRegex, '');
  
  // Inject style for status-card height and flex
  gridContent = gridContent.replace(/className="status-card pending"/, 'className="status-card pending" style={{ height: "350px", display: "flex", flexDirection: "column" }}');
  gridContent = gridContent.replace(/className="status-card overdue"/, 'className="status-card overdue" style={{ height: "350px", display: "flex", flexDirection: "column" }}');
  gridContent = gridContent.replace(/className="status-card completed"/, 'className="status-card completed" style={{ height: "350px", display: "flex", flexDirection: "column" }}');
  gridContent = gridContent.replace(/className="status-card incoming"/, 'className="status-card incoming" style={{ height: "350px", display: "flex", flexDirection: "column" }}');

  // Inject style for status-card-previews scroll
  gridContent = gridContent.replace(/className="status-card-previews"/g, 'className="status-card-previews" style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}');

  // Now, split by the card comments to extract the 4 cards
  const parts = gridContent.split('        {/* =================================================');
  
  const extractDiv = (str) => {
    const divStart = str.indexOf('<div className="status-card');
    const divEnd = str.lastIndexOf('</div>');
    return str.substring(divStart, divEnd + 6);
  };

  const pendingHtml = extractDiv(parts[1]).trim();
  const overdueHtml = extractDiv(parts[2]).trim();
  const completedHtml = extractDiv(parts[3]).trim();
  const incomingHtml = extractDiv(parts[4]).trim();

  const newGridContent = `
      {/* Reset Layout Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px", width: "100%" }}>
        <button type="button" className="db-summary-trigger-btn" onClick={() => { clearLayout('tasks'); window.location.reload(); }} aria-label="Reset Layout" title="Reset Layout to Default">
          <IcoReset />
          <span className="db-summary-trigger-label">Reset Layout</span>
        </button>
      </div>

      <DraggableGrid page="tasks" defaultLayout={['pending', 'overdue', 'completed', 'incoming']}>
        {({ layout }) => {
          const renderCard = (id) => {
            switch(id) {
              case 'pending': return (
                <DraggableCard id="pending" key="pending">
                  ${pendingHtml}
                </DraggableCard>
              );
              case 'overdue': return (
                <DraggableCard id="overdue" key="overdue">
                  ${overdueHtml}
                </DraggableCard>
              );
              case 'completed': return (
                <DraggableCard id="completed" key="completed">
                  ${completedHtml}
                </DraggableCard>
              );
              case 'incoming': return (
                <DraggableCard id="incoming" key="incoming">
                  ${incomingHtml}
                </DraggableCard>
              );
              default: return null;
            }
          };

          return (
            <section className="status-grid">
              {layout.map(renderCard)}
            </section>
          );
        }}
      </DraggableGrid>
      
      `;

  content = content.substring(0, startIndex) + newGridContent + content.substring(endIndex);
  fs.writeFileSync(targetFile, content);
  console.log("Successfully rewrote TaskPage.jsx");
} else {
  console.log("Failed to match grid section! Start: " + startIndex + " End: " + endIndex);
}
