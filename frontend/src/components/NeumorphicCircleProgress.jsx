import React, { useState } from "react";
import "./NeumorphicCircleProgress.css";

/* ── Micro Icons ── */
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ArrowUpRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

/**
 * Helper to compute SVG Arc Path (Annular Sector)
 */
function getAnnularSectorPath(cx, cy, rInner, rOuter, startAngleDeg, endAngleDeg, gapDeg = 2.5) {
  let adjustedStart = startAngleDeg + gapDeg;
  let adjustedEnd = endAngleDeg - gapDeg;

  if (adjustedEnd <= adjustedStart) {
    adjustedStart = startAngleDeg;
    adjustedEnd = Math.max(startAngleDeg + 0.1, endAngleDeg);
  }

  const rad = (deg) => ((deg - 90) * Math.PI) / 180;

  const aStart = rad(adjustedStart);
  const aEnd = rad(adjustedEnd);

  const x1Out = cx + rOuter * Math.cos(aStart);
  const y1Out = cy + rOuter * Math.sin(aStart);
  const x2Out = cx + rOuter * Math.cos(aEnd);
  const y2Out = cy + rOuter * Math.sin(aEnd);

  const x1In = cx + rInner * Math.cos(aEnd);
  const y1In = cy + rInner * Math.sin(aEnd);
  const x2In = cx + rInner * Math.cos(aStart);
  const y2In = cy + rInner * Math.sin(aStart);

  const largeArc = adjustedEnd - adjustedStart > 180 ? 1 : 0;

  return [
    `M ${x1Out} ${y1Out}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Out} ${y2Out}`,
    `L ${x1In} ${y1In}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2In} ${y2In}`,
    `Z`,
  ].join(" ");
}

/**
 * Helper to compute text position and angle along an arc segment
 */
function getArcCenterPoint(cx, cy, r, startAngleDeg, endAngleDeg) {
  const midAngleDeg = (startAngleDeg + endAngleDeg) / 2;
  const rad = ((midAngleDeg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  return { x, y, midAngleDeg };
}

export default function NeumorphicCircleProgress({
  summaryStats = null,
  pieData = null,
  title = "Status Distribution",
  size = 180,
  showDetailCard = false,
  onCenterClick,
}) {
  // Extract live task stats
  const total = summaryStats ? summaryStats.total : 100;
  const completed = summaryStats ? summaryStats.completed : 33;
  const pending = summaryStats ? summaryStats.pending : 33;
  const overdue = summaryStats ? summaryStats.overdue : 34;

  // Build status segments dataset with colors matching screenshot
  const rawSegments = [
    {
      id: "completed",
      name: "Completed",
      count: completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      icon: <CheckIcon />,
      activeGrad: "url(#neoEmeraldGrad)",
      inactiveFill: "#e6f7f0",
      strokeColor: "#10b981",
      badgeColor: "#059669",
    },
    {
      id: "pending",
      name: "Pending",
      count: pending,
      pct: total > 0 ? Math.round((pending / total) * 100) : 0,
      icon: <ClockIcon />,
      activeGrad: "url(#neoAmberGrad)",
      inactiveFill: "#fffbeb",
      strokeColor: "#f59e0b",
      badgeColor: "#d97706",
    },
    {
      id: "overdue",
      name: "Overdue",
      count: overdue,
      pct: total > 0 ? Math.round((overdue / total) * 100) : 0,
      icon: <AlertIcon />,
      activeGrad: "url(#neoRoseGrad)",
      inactiveFill: "#fff1f2",
      strokeColor: "#ef4444",
      badgeColor: "#dc2626",
    },
  ];

  // Calculate sector angles totaling 360 degrees
  let currentAngle = 180; // Start at left quarter
  const segmentsWithAngles = rawSegments.map((seg) => {
    let sweep = (seg.pct / 100) * 360;
    if (total === 0) sweep = 120; // Equal 120-deg sectors if no tasks exist yet
    else if (sweep === 0) sweep = 10; // Minimum 10-deg slice so zero count items stay clickable

    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      ...seg,
      startAngle,
      endAngle,
      sweep,
    };
  });

  const [activeId, setActiveId] = useState("completed");
  const [pulseCenter, setPulseCenter] = useState(false);

  const activeSegment = segmentsWithAngles.find((s) => s.id === activeId) || segmentsWithAngles[0];

  // What the Red Center Button does: Cycles through Completed -> Pending -> Overdue
  const handleCenterPress = () => {
    setPulseCenter(true);
    setTimeout(() => setPulseCenter(false), 400);

    const currentIndex = segmentsWithAngles.findIndex((s) => s.id === activeId);
    const nextIndex = (currentIndex + 1) % segmentsWithAngles.length;
    const nextSegment = segmentsWithAngles[nextIndex];
    setActiveId(nextSegment.id);

    if (onCenterClick) onCenterClick(nextSegment);
  };

  // SVG Geometry Constants for Compact Widget
  const viewBoxSize = 220;
  const cx = 110;
  const cy = 110;
  const rInner = 48;
  const rOuter = 92;
  const rMidText = 70;

  return (
    <div className="neo-compact-progress-wrapper">
      {/* ── Neumorphic Dial Stage ── */}
      <div className="neo-compact-dial-stage">
        <div className="neo-compact-outer-shadow">
          <div className="neo-compact-track-bevel">
            <svg
              className="neo-compact-svg"
              width={size}
              height={size}
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            >
              <defs>
                {/* Emerald Gradient (Completed) */}
                <linearGradient id="neoEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Amber / Yellow Gradient (Pending) */}
                <linearGradient id="neoAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>

                {/* Rose / Red Gradient (Overdue) */}
                <linearGradient id="neoRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>

                {/* Soft Active Sector Drop Shadow */}
                <filter id="neoActiveSectorShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.25" />
                  <feDropShadow dx="-1" dy="-1" stdDeviation="3" floodColor="#FFFFFF" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Base Outer Grooved Track Circle */}
              <circle
                cx={cx}
                cy={cy}
                r={rOuter + 2}
                fill="none"
                stroke="#e2e9f3"
                strokeWidth="1.5"
              />

              {/* Render Status Sectors */}
              {segmentsWithAngles.map((seg) => {
                const isActive = seg.id === activeId;
                const pathData = getAnnularSectorPath(
                  cx,
                  cy,
                  rInner,
                  rOuter,
                  seg.startAngle,
                  seg.endAngle,
                  2.5
                );

                const { x: textX, y: textY, midAngleDeg } = getArcCenterPoint(
                  cx,
                  cy,
                  rMidText,
                  seg.startAngle,
                  seg.endAngle
                );

                const textRotation = midAngleDeg > 90 && midAngleDeg < 270 ? midAngleDeg + 180 : midAngleDeg;

                return (
                  <g
                    key={seg.id}
                    className={`neo-compact-segment-group ${isActive ? "active" : ""}`}
                    onClick={() => setActiveId(seg.id)}
                  >
                    {/* Sector Arc Path */}
                    <path
                      d={pathData}
                      fill={isActive ? seg.activeGrad : seg.inactiveFill}
                      filter={isActive ? "url(#neoActiveSectorShadow)" : undefined}
                      className="neo-compact-segment-path"
                    />

                    {/* Sector Outline Border */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isActive ? "#ffffff" : "#d2dce8"}
                      strokeWidth={isActive ? "1.8" : "1.2"}
                    />

                    {/* Percentage Text on Arc */}
                    {seg.sweep >= 18 && (
                      <text
                        x={textX}
                        y={textY}
                        transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`neo-compact-segment-text ${isActive ? "active-text" : "inactive-text"}`}
                        style={{ fill: isActive ? "#ffffff" : seg.strokeColor }}
                      >
                        {seg.pct}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Inner Rim Outline */}
              <circle
                cx={cx}
                cy={cy}
                r={rInner - 1}
                fill="none"
                stroke="#d2dce8"
                strokeWidth="1.5"
              />
            </svg>

            {/* ── Center Concentric Neumorphic Hub ── */}
            <div className="neo-compact-center-hub">
              <div className="neo-compact-ring-outer">
                <div className="neo-compact-ring-inset">
                  {/* Micro Ticks Ring */}
                  <div className="neo-compact-ticks-ring" />

                  {/* Red Action Hub Button: Click to cycle active status sector */}
                  <button
                    className={`neo-compact-red-btn ${pulseCenter ? "pulse" : ""}`}
                    onClick={handleCenterPress}
                    title="Click to switch status (Completed -> Pending -> Overdue)"
                  >
                    <ArrowUpRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Display Label (Updates when any sector or center button is clicked!) */}
      <div
        className="neo-compact-center-pct-label"
        style={{ cursor: "pointer" }}
        onClick={handleCenterPress}
        title="Click to switch status sector"
      >
        <span className="neo-pct-number" style={{ color: activeSegment.badgeColor }}>
          {activeSegment.pct}%
        </span>
        <span className="neo-pct-sub" style={{ color: "#4a5568", fontWeight: 700 }}>
          {activeSegment.name} ({activeSegment.count} tasks)
        </span>
      </div>

      {/* Detail Card if requested */}
      {showDetailCard && (
        <div className="neo-detail-card">
          <div className="neo-detail-left">
            <div className="neo-icon-box" style={{ color: activeSegment.strokeColor }}>
              {activeSegment.icon}
            </div>
            <div className="neo-detail-info">
              <div className="neo-detail-name">{activeSegment.name} Tasks</div>
              <div className="neo-detail-subtext">{activeSegment.count} tasks total</div>
            </div>
          </div>
          <div className="neo-detail-right">
            <div className="neo-detail-pct" style={{ color: activeSegment.badgeColor }}>
              {activeSegment.pct}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
