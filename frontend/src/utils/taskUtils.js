import { addMinutes, format } from "date-fns";

export const CATEGORY_DEFAULT_DURATION = {
  Work: 60,
  Study: 120,
  Personal: 30,
  Health: 60,
  Fitness: 90,
  Shopping: 45,
  Meeting: 60,
  Home: 120,
  Other: 60
};

export const CATEGORY_SUGGESTIONS = {
  Work: [
    "Reply to Emails", "Team Meeting", "Write Code", "Fix Bugs",
    "Review Pull Requests", "Prepare Presentation", "Update Documentation", "Client Follow-up"
  ],
  Study: [
    "Study Mathematics", "Complete Assignment", "Revise Notes", "Practice Coding",
    "Read Chapter", "Solve Mock Test", "Watch Lecture", "Prepare for Exam"
  ],
  Personal: [
    "Buy Groceries", "Pay Bills", "Clean Room", "Call Family",
    "Organize Desk", "Water Plants", "Read a Book", "Plan Tomorrow"
  ],
  Health: [
    "Morning Walk", "Drink Water", "Take Medicine", "Meditation",
    "Yoga Session", "Doctor Appointment"
  ],
  Fitness: [
    "Gym Workout", "Running", "Stretching", "Cycling", "Home Workout"
  ],
  Shopping: [
    "Buy Groceries", "Buy Clothes", "Purchase Essentials", "Order Online"
  ],
  Meeting: [
    "Client Meeting", "Team Sync", "Project Discussion", "One-on-One Meeting"
  ],
  Home: [
    "Clean Kitchen", "Laundry", "Cook Dinner", "Home Maintenance"
  ],
  Other: [
    "Daily Task", "Important Task", "Follow Up", "Reminder", "Miscellaneous Work"
  ],
  Default: [
    "Daily Routine", "Morning Planning", "Complete Pending Tasks",
    "Follow Up", "Review Today's Goals", "Finish Important Work"
  ]
};

/**
 * Calculates a default due time based on the task category.
 * @param {string} category - The task category (e.g., 'Work', 'Study')
 * @param {Date} startTime - The base time to add the duration to (defaults to now)
 * @returns {string} The formatted due time "HH:mm"
 */
export const calculateDefaultDueTime = (category, startTime = new Date()) => {
  const duration = CATEGORY_DEFAULT_DURATION[category] || CATEGORY_DEFAULT_DURATION.Other;
  const dueTimeObj = addMinutes(startTime, duration);
  return format(dueTimeObj, "HH:mm");
};
