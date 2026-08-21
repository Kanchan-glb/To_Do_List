import React, { useState, useRef, useEffect } from "react";
import "./NeumorphicComboSelect.css";

export default function NeumorphicComboSelect({
  selectedCombo = [],
  onComboChange,
  comboOptions = [],
  placeholder = "Combo Select",
  className = "",
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleToggle = (optVal) => {
    let updated;
    if (optVal === "All") {
      updated = [];
    } else if (selectedCombo.includes(optVal)) {
      updated = selectedCombo.filter((item) => item !== optVal);
    } else {
      updated = [...selectedCombo, optVal];
    }
    if (onComboChange) {
      onComboChange(updated);
    }
  };

  const getDisplayLabel = () => {
    if (!selectedCombo || selectedCombo.length === 0) return placeholder;
    if (selectedCombo.length === 1) return selectedCombo[0];
    return `Combo (${selectedCombo.length})`;
  };

  return (
    <div className={`neo-combo-container ${isOpen ? "open-active" : ""} ${className}`} style={style} ref={dropdownRef}>
      {/* Neumorphic Combo Trigger Button */}
      <button
        type="button"
        className={`neo-combo-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="neo-combo-label">{getDisplayLabel()}</span>
        <span className={`neo-combo-arrow ${isOpen ? "rotate" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Neumorphic Options Combo Dropdown */}
      {isOpen && (
        <div className="neo-combo-dropdown-card">
          <div className="neo-combo-header">
            <span>Combo Select</span>
            {selectedCombo.length > 0 && (
              <span className="neo-combo-reset" onClick={() => onComboChange([])}>
                Clear
              </span>
            )}
          </div>

          <div className="neo-combo-options-list">
            <div
              className={`neo-combo-option ${selectedCombo.length === 0 ? "selected" : ""}`}
              onClick={() => handleToggle("All")}
            >
              <input type="checkbox" checked={selectedCombo.length === 0} readOnly />
              <span className="neo-combo-option-text">All Items</span>
            </div>

            {comboOptions.map((opt, index) => {
              const optVal = typeof opt === "object" ? opt.value : opt;
              const optLabel = typeof opt === "object" ? opt.label : opt;
              const isChecked = selectedCombo.includes(optVal);

              return (
                <div
                  key={index}
                  className={`neo-combo-option ${isChecked ? "selected" : ""}`}
                  onClick={() => handleToggle(optVal)}
                >
                  <input type="checkbox" checked={isChecked} readOnly />
                  <span className="neo-combo-option-text">{optLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
