import { format, addDays, nextDay, parse, addHours } from "date-fns";
import { calculateDefaultDueTime } from "../utils/taskUtils";

/**
 * Custom Speech Recognition wrapper.
 */
export function getSpeechRecognizer(onResult, onError, onEnd) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.onerror = (event) => {
    if (onError) {
      if (event.error === 'not-allowed') {
        onError("Microphone access is blocked. Please allow microphone permission in your browser settings and try again.");
      } else {
        onError(`Voice Error: ${event.error}`);
      }
    }
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

/**
 * Intelligent natural-language parser for task details.
 * Extracts title, date, time, priority, and category.
 */
export function parseSpeechToTask(text) {
  const textLower = text.toLowerCase().trim();

  // Default values
  let title = text;
  let dueDate = format(new Date(), "yyyy-MM-dd");
  let dueTime = null; // Will calculate at the end based on category if not explicitly found
  let priority = "Medium";
  let category = "General";

  // 1. Detect priority
  if (textLower.includes("high") || textLower.includes("urgent") || textLower.includes("important")) {
    priority = "High";
  } else if (textLower.includes("low") || textLower.includes("chill") || textLower.includes("relax")) {
    priority = "Low";
  }

  // 2. Detect category
  if (textLower.includes("work") || textLower.includes("office") || textLower.includes("meeting") || textLower.includes("project")) {
    category = "Work";
  } else if (textLower.includes("gym") || textLower.includes("workout") || textLower.includes("run") || textLower.includes("health") || textLower.includes("exercise")) {
    category = "Health";
  } else if (textLower.includes("learn") || textLower.includes("study") || textLower.includes("assignment") || textLower.includes("react") || textLower.includes("read")) {
    category = "Learning";
  } else if (textLower.includes("buy") || textLower.includes("groceries") || textLower.includes("shop") || textLower.includes("order")) {
    category = "Shopping";
  } else if (textLower.includes("call") || textLower.includes("friend") || textLower.includes("family") || textLower.includes("personal")) {
    category = "Personal";
  }

  // 3. Date Parsing
  let dateObj = new Date();
  let timeStr = null;

  // Check for "tomorrow"
  if (textLower.includes("tomorrow")) {
    dateObj = addDays(new Date(), 1);
  }
  // Check for "day after tomorrow" or "in 2 days"
  else if (textLower.includes("day after tomorrow")) {
    dateObj = addDays(new Date(), 2);
  }
  // Check for specific days of the week
  else {
    const daysOfWeek = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    for (const [day, val] of Object.entries(daysOfWeek)) {
      if (textLower.includes(`on ${day}`) || textLower.includes(`next ${day}`)) {
        // Find next occurance of this day
        const currentDay = new Date().getDay();
        const daysToAdd = (val + 7 - currentDay) % 7 || 7;
        dateObj = addDays(new Date(), daysToAdd);
        break;
      }
    }
  }
  dueDate = format(dateObj, "yyyy-MM-dd");

  // 4. Time Parsing (e.g. "at 5 pm", "at 11:30 am", "at 8 o'clock", "this evening")
  // Match "at XX:XX pm/am", "at XX pm/am", or "at XX o'clock"
  const timeRegex = /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|o'clock)?/i;
  const match = text.match(timeRegex);

  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? match[2] : "00";
    const ampmRaw = match[3] ? match[3].toLowerCase() : null;
    const ampm = (ampmRaw === "o'clock") ? null : ampmRaw;

    if (ampm === "pm" && hour < 12) {
      hour += 12;
    } else if (ampm === "am" && hour === 12) {
      hour = 0;
    } else if (!ampm) {
      // Use context clues: morning → AM, evening/night/tonight → PM
      const isMorningCtx = textLower.includes("morning") || textLower.includes("subah");
      const isEveningCtx = textLower.includes("evening") || textLower.includes("shyam") || textLower.includes("tonight") || textLower.includes("night");
      if (isMorningCtx && hour <= 12) {
        // Keep as AM (no change needed)
      } else if (isEveningCtx && hour < 12) {
        hour += 12;
      } else if (hour >= 1 && hour <= 7) {
        // Default guess: ambiguous small hours assume PM
        hour += 12;
      }
    }

    // Safety: never produce "00:00" from a valid match — treat as midnight only if truly 12 AM
    if (hour === 0 && ampm !== "am") {
      hour = 8; // fallback to 8 AM if something went wrong
    }

    dueTime = `${hour.toString().padStart(2, "0")}:${minute}`;
  } else if (textLower.includes("this evening") || textLower.includes("tonight")) {
    dueTime = "19:00";
  } else if (textLower.includes("this afternoon")) {
    dueTime = "15:00";
  } else if (textLower.includes("morning") || textLower.includes("subah")) {
    dueTime = "09:00";
  }

  // 5. Clean Title (remove trigger phrases like "add", "tomorrow", "at X pm", "urgently")
  let cleanTitle = text
    .replace(/add\s+/i, "")
    .replace(/tomorrow/i, "")
    .replace(/day after tomorrow/i, "")
    .replace(/this evening/i, "")
    .replace(/this afternoon/i, "")
    .replace(/tonight/i, "")
    .replace(/at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?/i, "")
    .replace(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i, "")
    .replace(/on\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter
  if (cleanTitle) {
    title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  if (!dueTime) {
    dueTime = calculateDefaultDueTime(category);
  }

  return {
    title,
    dueDate,
    dueTime,
    priority,
    category
  };
}
