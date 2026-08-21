const fs = require('fs');
const targetFile = 'src/components/WorkProgressTracker.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

const importsToAdd = `
import DraggableGrid from "./dnd/DraggableGrid";
import DraggableCard from "./dnd/DraggableCard";
import { clearLayout } from "../utils/layoutStorage";
`;

if (!content.includes('DraggableGrid')) {
  content = content.replace(
    'import { useState, useMemo } from "react";\n',
    'import { useState, useMemo } from "react";\n' + importsToAdd
  ).replace(
    'import { useState, useMemo } from "react";\r\n',
    'import { useState, useMemo } from "react";\r\n' + importsToAdd
  );
  fs.writeFileSync(targetFile, content);
  console.log("Successfully fixed imports");
}
