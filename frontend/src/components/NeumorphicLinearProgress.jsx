import React, { useState } from "react";
import "./NeumorphicLinearProgress.css";

export default function NeumorphicLinearProgress({
  completionPct = 0,
  completedCount = 0,
  totalCount = 0,
  title = "Today Progress",
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Clamp percentage between 0 and 100
  const pct = Math.max(0, Math.min(100, Math.round(completionPct)));

  return (
    <div className="neo-linear-card">
      {/* Top Header */}
      <div className="neo-linear-header">
        <span className="neo-linear-title">{title}</span>
        <span className="neo-linear-badge">
          {completedCount} / {totalCount} Tasks Completed
        </span>
      </div>

      {/* Neumorphic Capsule Progress Bar Container (Matching Image 1) */}
      <div className="neo-capsule-container">
        {/* Recessed Groove Track */}
        <div className="neo-groove-track">
          {/* Gradient Fill */}
          <div
            className="neo-groove-fill"
            style={{ width: `${pct}%` }}
          />

          {/* Elevated Neumorphic Knob / Handle */}
          <div
            className="neo-knob-wrapper"
            style={{ left: `calc(${pct}% - 16px)` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
          >
            <div className="neo-knob-outer">
              <div className="neo-knob-dot" />
            </div>

            {/* Speech Bubble Tooltip (Matching Image 1 speech bubble) */}
            <div className={`neo-speech-bubble ${showTooltip ? "visible" : ""}`}>
              <div className="neo-bubble-text">
                {completedCount} of {totalCount} tasks completed ({pct}%)
              </div>
            </div>
          </div>
        </div>

        {/* Percentage Display on Right Side */}
        <div className="neo-pct-text">{pct}%</div>
      </div>
    </div>
  );
}
