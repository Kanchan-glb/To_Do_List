const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, 'frontend', 'src', 'components', 'GlassDashboard.jsx');
let content = fs.readFileSync(dashPath, 'utf8');

// Replace lazy with direct imports
content = content.replace(/const TaskDetailsModal = lazy\(\(\) => import\("\.\/TaskDetailsModal"\)\);/, 'import TaskDetailsModal from "./TaskDetailsModal";');
content = content.replace(/const TaskActivityCenter = lazy\(\(\) => import\("\.\/GlassTaskActivityCenter"\)\);/, 'import TaskActivityCenter from "./GlassTaskActivityCenter";');
content = content.replace(/const ProductivityAnalytics = lazy\(\(\) => import\("\.\/GlassProductivityAnalytics"\)\);/, 'import ProductivityAnalytics from "./GlassProductivityAnalytics";');
content = content.replace(/const GlassWeeklyProgress = lazy\(\(\) => import\("\.\/GlassWeeklyProgress"\)\);/, 'import GlassWeeklyProgress from "./GlassWeeklyProgress";');
content = content.replace(/const GlassReportTracker = lazy\(\(\) => import\("\.\/GlassReportTracker"\)\);/, 'import GlassReportTracker from "./GlassReportTracker";');
content = content.replace(/const GlassPerformanceInsights = lazy\(\(\) => import\("\.\/GlassPerformanceInsights"\)\);/, 'import GlassPerformanceInsights from "./GlassPerformanceInsights";');
content = content.replace(/const DraggableGrid = lazy\(\(\) => import\("\.\/dnd\/DraggableGrid"\)\);/, '');
content = content.replace(/const DraggableCard = lazy\(\(\) => import\("\.\/dnd\/DraggableCard"\)\);/, '');
content = content.replace(/import { useState, useEffect, useRef, useMemo, lazy } from "react";/, 'import { useState, useEffect, useRef, useMemo, Suspense } from "react";');

fs.writeFileSync(dashPath, content);
