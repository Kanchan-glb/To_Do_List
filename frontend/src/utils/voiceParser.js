import { format } from "date-fns";

export function translateHinglishToEnglish(transcript) {
  let text = transcript.toLowerCase();

  const replacements = [
    { regex: /\bkal subah\b/g, repl: "tomorrow morning" },
    { regex: /\bkal shyam\b/g, repl: "tomorrow evening" },
    { regex: /\bkal shaam\b/g, repl: "tomorrow evening" },
    { regex: /\bkal\b/g, repl: "tomorrow" },
    { regex: /\baaj\b/g, repl: "today" },
    { regex: /\bsubah\b/g, repl: "morning" },
    { regex: /\bshyam\b/g, repl: "evening" },
    { regex: /\bshaam\b/g, repl: "evening" },
    { regex: /\bdopahar\b/g, repl: "afternoon" },
    { regex: /\bbaje\b/g, repl: "o'clock" },
    { regex: /\bbajhe\b/g, repl: "o'clock" },
    { regex: /\bpehle\b/g, repl: "before" },
    { regex: /\bke liye\b/g, repl: "for" },
    { regex: /\bke saath\b/g, repl: "with" },
    { regex: /\bke sath\b/g, repl: "with" },
    { regex: /\bhar\b/g, repl: "every" },
    { regex: /\bhafta\b/g, repl: "week" },
    { regex: /\bghante\b/g, repl: "hours" },
    { regex: /\bghanta\b/g, repl: "hour" },
    { regex: /\bminute\b/g, repl: "minutes" },
    { regex: /\bcall karna\b/g, repl: "call" },
    { regex: /\bmeeting hai\b/g, repl: "meeting" },
    { regex: /\brakhna\b/g, repl: "set" },
    { regex: /\bko\b/g, repl: "to" },
    { regex: /\bmein\b/g, repl: "in" }
  ];

  replacements.forEach(r => {
    text = text.replace(r.regex, r.repl);
  });

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function extractTaskDetails(originalText, translatedText) {
  const fullText = (originalText + " | " + translatedText).toLowerCase();

  const details = {
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    dueDate: "",
    dueTime: "",
    startTime: "",
    endTime: "",
    reminder: "",
    person: "",
    location: "",
    tags: [],
    recurrence: "",
    notes: ""
  };

  // 1. Priority extraction — handle natural patterns like "priority is low", "the priority is high", etc.
  const priorityText = fullText;

  const isHighPriority =
    priorityText.includes("urgent") ||
    priorityText.includes("high priority") ||
    priorityText.includes("high-priority") ||
    priorityText.includes("priority is high") ||
    priorityText.includes("priority high") ||
    priorityText.includes("is high") ||
    /\bhigh\b/.test(priorityText) ||
    priorityText.includes("bahut zaruri") ||
    priorityText.includes("bahut zaroori") ||
    priorityText.includes("important");

  const isLowPriority =
    priorityText.includes("low priority") ||
    priorityText.includes("low-priority") ||
    priorityText.includes("priority is low") ||
    priorityText.includes("priority low") ||
    priorityText.includes("is low") ||
    /\blow\b/.test(priorityText) ||
    priorityText.includes("not urgent") ||
    priorityText.includes("not-urgent") ||
    priorityText.includes("kam zaruri") ||
    priorityText.includes("chill") ||
    priorityText.includes("relax");

  const isMediumPriority =
    priorityText.includes("medium priority") ||
    priorityText.includes("medium-priority") ||
    priorityText.includes("priority is medium") ||
    priorityText.includes("medium");

  // High takes precedence, then Low, then Medium (order matters)
  if (isHighPriority) {
    details.priority = "High";
  } else if (isLowPriority) {
    details.priority = "Low";
  } else if (isMediumPriority) {
    details.priority = "Medium";
  }

  // 2. Category extraction
  const categories = [
    "work",
    "personal",
    "health",
    "study",
    "shopping",
    "travel",
    "finance",
    "interview",
    "wedding",
    "fitness",
    "cooking",
    "photography",
    "gardening"
  ];
  for (const cat of categories) {
    if (fullText.includes(cat)) {
      details.category = cat.charAt(0).toUpperCase() + cat.slice(1);
      break;
    }
  }

  // 3. Date extraction
  const today = new Date();
  let calculatedDate = null;

  if (fullText.includes("tomorrow") || fullText.includes("kal")) {
    calculatedDate = new Date();
    calculatedDate.setDate(today.getDate() + 1);
  } else if (fullText.includes("today") || fullText.includes("aaj")) {
    calculatedDate = today;
  } else {
    const daysMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    let foundDay = null;
    let isNext = fullText.includes("next") || fullText.includes("agle");

    Object.keys(daysMap).forEach(day => {
      if (fullText.includes(day)) {
        foundDay = day;
      }
    });

    if (foundDay) {
      calculatedDate = new Date();
      const currentDay = today.getDay();
      const targetDay = daysMap[foundDay];
      let distance = (targetDay + 7 - currentDay) % 7;
      if (distance === 0 || isNext) distance += 7;
      calculatedDate.setDate(today.getDate() + distance);
    }
  }

  if (calculatedDate) {
    details.dueDate = format(calculatedDate, "yyyy-MM-dd");
  } else {
    // Default to today
    details.dueDate = format(today, "yyyy-MM-dd");
  }

  // 4. Time extraction
  const timeRegexes = [
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi,  // rIdx 0: "8:00 am", "8 am"
    /(\d{1,2})\s*(am|pm)/gi,               // rIdx 1: "8am"
    /\bat\s+(\d{1,2}):(\d{2})\b/g,         // rIdx 2: "at 8:00" (scoped to "at")
    /(\d{1,2})\s*baje/gi                    // rIdx 3: "8 baje"
  ];

  let matches = [];
  timeRegexes.forEach((regex, rIdx) => {
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      let hours = parseInt(match[1]);
      let minutes = 0;
      let ampm = null;

      if (rIdx === 0) {
        minutes = match[2] ? parseInt(match[2]) : 0;
        ampm = match[3] ? match[3].toLowerCase() : null;
      } else if (rIdx === 1) {
        ampm = match[2] ? match[2].toLowerCase() : null;
      } else if (rIdx === 2) {
        // "at X:XX" — grab groups 1 and 2
        hours = parseInt(match[1]);
        minutes = match[2] ? parseInt(match[2]) : 0;
      }

      // Skip if hours out of valid range
      if (isNaN(hours) || hours > 23) continue;

      matches.push({
        index: match.index,
        match: match[0],
        hours,
        minutes,
        ampm
      });
    }
  });

  // Deduplicate by choosing the best match at each text position
  // Prefer match with explicit ampm over ambiguous ones
  matches.sort((a, b) => a.index - b.index);

  if (matches.length > 0) {
    // Prefer first match with explicit am/pm, fallback to first match overall
    const ampmMatch = matches.find(m => m.ampm !== null);
    const bestTime = ampmMatch || matches[0];

    let hr = bestTime.hours;
    if (bestTime.ampm === "pm" && hr < 12) hr += 12;
    if (bestTime.ampm === "am" && hr === 12) hr = 0;

    if (!bestTime.ampm) {
      // Context-based AM/PM guess
      const isMorning = fullText.includes("morning") || fullText.includes("subah");
      const isEvening = fullText.includes("evening") || fullText.includes("shyam") ||
                        fullText.includes("shaam") || fullText.includes("pm") ||
                        fullText.includes("tonight") || fullText.includes("night");
      if (isMorning && hr <= 12) {
        // Keep as AM — no change
      } else if (isEvening && hr < 12) {
        hr += 12;
      } else if (hr >= 1 && hr <= 7) {
        hr += 12; // Ambiguous small hour → assume PM
      }
    }

    // Safety: don't produce 00:00 from a valid-seeming match unless truly 12 AM
    if (hr === 0 && bestTime.ampm !== "am") {
      hr = 8; // Fallback
    }

    details.dueTime = `${String(hr).padStart(2, '0')}:${String(bestTime.minutes).padStart(2, '0')}`;
    details.startTime = details.dueTime;

    const durationMatch = fullText.match(/(\d+)\s*(hour|hr|ghante|hours)/i);
    if (durationMatch) {
      const hoursCount = parseInt(durationMatch[1]);
      let endHr = hr + hoursCount;
      if (endHr >= 24) endHr = endHr % 24;
      details.endTime = `${String(endHr).padStart(2, '0')}:${String(bestTime.minutes).padStart(2, '0')}`;
    }
  }

  // 5. Related person extraction
  const personMatch = originalText.match(
    /(?:with|meet|call|meeting with|sath|saath|discuss with|talk to)\s+([A-Z][a-z]+)/i
  );
  if (personMatch) {
    details.person = personMatch[1];
  }

  // 6. Location extraction
  const locationMatch = fullText.match(
    /(?:at|in|location)\s+(office|home|gym|school|college|cafe|restaurant|hotel|venue)/i
  );
  if (locationMatch) {
    details.location =
      locationMatch[1].charAt(0).toUpperCase() + locationMatch[1].slice(1);
  }

  // 7. Reminder extraction
  const reminderMatch = fullText.match(
    /(\d+)\s*(?:minute|minutes|min|pehle|before)/i
  );
  if (reminderMatch) {
    details.reminder = `${reminderMatch[1]} minutes before`;
  }

  // 8. Recurrence extraction
  if (
    fullText.includes("every weekday") ||
    fullText.includes("weekday ko") ||
    fullText.includes("daily except weekend")
  ) {
    details.recurrence = "Every Weekday";
  } else if (
    fullText.includes("every day") ||
    fullText.includes("daily") ||
    fullText.includes("har roz") ||
    fullText.includes("har din")
  ) {
    details.recurrence = "Daily";
  } else if (
    fullText.includes("every monday") ||
    fullText.includes("har monday")
  ) {
    details.recurrence = "Weekly on Monday";
  } else if (
    fullText.includes("every week") ||
    fullText.includes("weekly") ||
    fullText.includes("har hafte")
  ) {
    details.recurrence = "Weekly";
  }

  // 9. Tags extraction
  const tagWords = [
    "urgent",
    "meeting",
    "invoice",
    "call",
    "appointment",
    "presentation",
    "update"
  ];
  tagWords.forEach(word => {
    if (fullText.includes(word)) {
      details.tags.push(word);
    }
  });

  // 10. Title & Description extraction
  let cleanOriginal = originalText;
  const cleanRegexes = [
    /tomorrow/gi,
    /kal subah/gi,
    /kal shyam/gi,
    /kal shaam/gi,
    /kal/gi,
    /today/gi,
    /aaj/gi,
    /at \d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*baje/gi,
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
    /next monday/gi,
    /agle monday/gi,
    /friday ko/gi,
    /friday/gi,
    /high priority/gi,
    /urgent/gi,
    /medium priority/gi,
    /low priority/gi,
    /work category/gi,
    /remind me/gi,
    /reminder/gi
  ];

  cleanRegexes.forEach(regex => {
    cleanOriginal = cleanOriginal.replace(regex, "");
  });

  cleanOriginal = cleanOriginal
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const splitKeywords = [
    "regarding",
    "for",
    "discuss",
    "ke liye",
    "ke sath",
    "ke saath",
    "about"
  ];
  let titleCandidate = cleanOriginal;
  let descCandidate = "";

  for (const keyword of splitKeywords) {
    const parts = cleanOriginal.split(new RegExp(`\\b${keyword}\\b`, "i"));
    if (parts.length > 1) {
      titleCandidate = parts[0].trim();
      descCandidate = parts
        .slice(1)
        .join(` ${keyword} `)
        .trim();
      break;
    }
  }

  if (titleCandidate) {
    details.title =
      titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
  } else {
    details.title = "New Voice Task";
  }

  if (descCandidate) {
    details.description =
      descCandidate.charAt(0).toUpperCase() + descCandidate.slice(1);
  }

  return details;
}
