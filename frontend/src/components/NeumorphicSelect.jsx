import React, { useState, useRef, useEffect } from "react";
import "./NeumorphicSelect.css";

export default function NeumorphicSelect({
  value,
  onChange,
  options = [],
  placeholder = "droplist",
  className = "",
  style = {},
  alignRight = false,
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

  const selectedOption = options.find((opt) => opt.value === value || opt === value);
  const displayLabel = selectedOption
    ? typeof selectedOption === "object"
      ? selectedOption.label
      : selectedOption
    : placeholder;

  const handleSelect = (opt) => {
    const val = typeof opt === "object" ? opt.value : opt;
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  return (
    <div className={`neo-select-container ${isOpen ? "open-active" : ""} ${className}`} style={style} ref={dropdownRef}>
      {/* Neumorphic Dropdown Trigger */}
      <button
        type="button"
        className={`neo-select-trigger ${isOpen ? "open" : ""}`}
        onClick={toggleOpen}
      >
        <span className="neo-select-label">{displayLabel}</span>
        <span className={`neo-select-arrow ${isOpen ? "rotate" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Neumorphic Options Card Dropdown (Matching Image 1) */}
      {isOpen && (
        <div className={`neo-select-dropdown-card ${dropUp ? "open-up" : "open-down"} ${alignRight ? "align-right" : ""}`}>
          <div className="neo-select-options-list">
            {options.map((opt, index) => {
              const optVal = typeof opt === "object" ? opt.value : opt;
              const optLabel = typeof opt === "object" ? opt.label : opt;
              const isSelected = optVal === value;

              return (
                <div
                  key={index}
                  className={`neo-select-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="neo-option-text">{optLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
