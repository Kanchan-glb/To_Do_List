import React from "react";
import "./NeumorphicSearchBar.css";

export default function NeumorphicSearchBar({
  value = "",
  onChange,
  placeholder = "search for",
  className = "",
  style = {},
}) {
  return (
    <div className={`neo-search-container ${className}`} style={style}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="neo-search-input"
      />
      <span className="neo-search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
    </div>
  );
}
