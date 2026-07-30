import React, { useState, useRef, useEffect } from "react";
import "./NeumorphicFilterPill.css";

export default function NeumorphicFilterPill({
  label = "Category",
  selectedValues = [],
  onSelectionChange,
  options = [],
  placeholder = "",
  className = "",
  style = {},
  alignRight = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 200);
    }
    setIsOpen(!isOpen);
  };

  const handleToggle = (val) => {
    let updated;
    if (selectedValues.includes(val)) {
      updated = selectedValues.filter((v) => v !== val);
    } else {
      updated = [...selectedValues, val];
    }
    if (onSelectionChange) {
      onSelectionChange(updated);
    }
  };

  const count = selectedValues.length;

  return (
    <div className={`neo-filter-pill-container ${isOpen ? "open-active" : ""} ${className}`} style={style} ref={dropdownRef}>
      {/* Neumorphic Filter Pill Trigger Button */}
      <button
        type="button"
        className={`neo-filter-pill-trigger ${count > 0 ? "has-count" : ""} ${isOpen ? "open" : ""}`}
        onClick={toggleOpen}
      >
        <span className="neo-filter-pill-label">{label}</span>
        
        {/* Count Badge (Matching Screenshot Green Circle) */}
        {count > 0 && <span className="neo-filter-count-badge">{count}</span>}

        <span className={`neo-filter-pill-arrow ${isOpen ? "rotate" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Expanded Dropdown Card (Matching Screenshot) */}
      {isOpen && (
        <div className={`neo-filter-dropdown-card ${dropUp ? "open-up" : "open-down"} ${alignRight ? "align-right" : ""}`}>
          <div className="neo-filter-card-header">
            <span>Select {label.toLowerCase()}</span>
            {count > 0 && (
              <span className="neo-filter-clear" onClick={() => onSelectionChange([])}>
                Clear
              </span>
            )}
          </div>

          <div className="neo-filter-options-list">
            {options.map((opt, index) => {
              const optVal = typeof opt === "object" ? opt.value : opt;
              const optLabel = typeof opt === "object" ? opt.label : opt;
              const isChecked = selectedValues.includes(optVal);

              return (
                <div
                  key={index}
                  className={`neo-filter-option-row ${isChecked ? "checked" : ""}`}
                  onClick={() => handleToggle(optVal)}
                >
                  {/* Green Rounded Checkbox (Matching Screenshot) */}
                  <div className={`neo-green-checkbox ${isChecked ? "active" : ""}`}>
                    {isChecked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="neo-filter-option-label">{optLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
