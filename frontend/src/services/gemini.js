/**
 * Service to handle communication with the Gemini API or run local fallbacks.
 */

// Local fallback database of subtasks for popular productivity words
const FALLBACK_SUBTASKS = {
  build: ["Sketch wireframes & layout", "Write HTML structure", "Style with CSS classes", "Implement interactivity", "Deploy to Vercel/Netlify"],
  create: ["Brainstorm key ideas", "Draft rough outline", "Refine content & format", "Proofread and polish"],
  design: ["Research design inspiration", "Select color scheme & fonts", "Create mockups in Figma", "Gather assets & icons"],
  study: ["Gather study notes/materials", "Review core concepts", "Complete practice exercises", "Self-test with flashcards"],
  learn: ["Read documentation / tutorials", "Write small test programs", "Take notes on key concepts", "Build a practice demo"],
  project: ["Define project requirements", "Setup folder structure & tools", "Implement basic prototype", "Refine, debug, and test", "Deploy project"],
  buy: ["List items needed", "Compare prices / brands", "Visit shop or place online order"],
  clean: ["De-clutter desk / room", "Dust and wipe surfaces", "Sweep/vacuum floor", "Take out trash"],
  workout: ["Warm up (5-10 mins)", "Follow exercise routing", "Cool down & stretch"],
  gym: ["Warm up (5-10 mins)", "Perform resistance exercises", "Stretch & hydrate"],
  meeting: ["Define agenda points", "Draft speaking notes", "Prepare presentation / slides", "Write follow-up items after meeting"],
  read: ["Find a quiet space", "Read selected chapters", "Highlight/write down key takeaways"],
  groceries: ["Check fridge & pantry", "Make shopping list", "Go to supermarket", "Organize items in shelves"]
};

// Local fallback suggestions
const FALLBACK_PLANNING_SUGGESTIONS = [
  "Prioritize completing your highest value task first thing in the morning when focus is highest.",
  "Consider breaking down your large goals into smaller 25-minute focus intervals today.",
  "Schedule a short physical break after deep-work tasks to keep energy up.",
  "Dedicate the first hour of your afternoon to client correspondence and replies.",
  "Make sure to allocate time for self-reflection and stretching during your break blocks."
];

const FALLBACK_NIGHT_SUGGESTIONS = [
  "You made steady progress today. Make sure to schedule your main task for tomorrow in the morning.",
  "A few items are pending. Consider rescheduling them to a less busy slot tomorrow.",
  "Remember to rest well tonight - sleep is the best booster for tomorrow's performance.",
  "Try preparing your desk and checklist tonight to hit the ground running tomorrow morning.",
  "Focus on consistency rather than speed. You're building great habits."
];

const FALLBACK_WEEKLY_SUGGESTIONS = [
  "Focus peaks in the first half of the week. Try scheduling your hardest tasks on Mondays and Tuesdays.",
  "You rescheduled several tasks this week. Try allocating more buffer time or choosing smaller tasks.",
  "Learning and health tasks are consistently completed - excellent balance!",
  "Make sure to set one 'non-negotiable' win for each day next week to build strong momentum."
];

/**
 * Call Gemini API directly via HTTP
 */
async function callGemini(prompt, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API error");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Empty response from Gemini");
    return resultText;
  } catch (error) {
    console.error("Gemini API Error, falling back...", error);
    throw error;
  }
}

export async function generateSubtasks(taskTitle, apiKey) {
  if (apiKey) {
    const prompt = `You are a productivity assistant. Give me a simple checklist of subtasks (4 to 6 items) to complete the following task: "${taskTitle}". 
    Provide ONLY a valid JSON array of strings, like this: ["item 1", "item 2", "item 3"]. No extra conversational text or markdown blocks.`;
    try {
      const text = await callGemini(prompt, apiKey);
      // Clean potential markdown blocks
      const cleanJson = text.replace(/```json/i, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Gemini subtask failed, using local rules");
    }
  }

  // Local fallback
  const titleLower = taskTitle.toLowerCase();
  for (const [key, list] of Object.entries(FALLBACK_SUBTASKS)) {
    if (titleLower.includes(key)) {
      return list;
    }
  }
  
  // Generic fallback if no keywords match
  return [
    `Analyze requirements and set goals for "${taskTitle}"`,
    `Identify necessary resources and tools`,
    `Execute the primary action steps for "${taskTitle}"`,
    `Review completed work and refine details`,
    `Verify and mark "${taskTitle}" as fully completed`
  ];
}

export async function generateSuggestions(tasksToday, pendingTasks, apiKey) {
  if (apiKey) {
    const prompt = `You are a productivity coach. Today's scheduled tasks: ${JSON.stringify(tasksToday)}. Pending/Uncompleted: ${JSON.stringify(pendingTasks)}.
    Give me 3 short, actionable, bulleted suggestions (1-2 sentences each) for planning today. Keep the response brief. Do not use markdown headers, write only the bullet points.`;
    try {
      const text = await callGemini(prompt, apiKey);
      return text.trim();
    } catch (e) {
      console.warn("Gemini suggestions failed");
    }
  }

  // Local Fallback: Pick 3 random
  const shuffled = [...FALLBACK_PLANNING_SUGGESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map(s => `• ${s}`).join("\n");
}

export async function generateNightReview(completedTasks, pendingTasks, apiKey) {
  if (apiKey) {
    const prompt = `You are a productivity coach. The user completed these tasks today: ${JSON.stringify(completedTasks)}. They left these pending: ${JSON.stringify(pendingTasks)}.
    Give me a brief encouraging summary and 2 quick tips for tomorrow. Keep it under 100 words. Bullet points are fine.`;
    try {
      const text = await callGemini(prompt, apiKey);
      return text.trim();
    } catch (e) {
      console.warn("Gemini night review failed");
    }
  }

  const shuffled = [...FALLBACK_NIGHT_SUGGESTIONS].sort(() => 0.5 - Math.random());
  const tip1 = shuffled[0];
  const tip2 = shuffled[1];
  return `Great effort today! You successfully crossed off ${completedTasks.length} tasks and have ${pendingTasks.length} left for later. Let's wrap up with these tips:
• ${tip1}
• ${tip2}`;
}

export async function generateWeeklyReview(completedTasks, pendingTasks, apiKey) {
  if (apiKey) {
    const prompt = `You are an AI productivity coach analyzing the past week. Completed tasks: ${JSON.stringify(completedTasks)}. Pending/Overdue: ${JSON.stringify(pendingTasks)}.
    Generate 3 productivity insights and recommendations for the upcoming week. Use bullet points and keep it short.`;
    try {
      const text = await callGemini(prompt, apiKey);
      return text.trim();
    } catch (e) {
      console.warn("Gemini weekly review failed");
    }
  }

  const shuffled = [...FALLBACK_WEEKLY_SUGGESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map(s => `• ${s}`).join("\n");
}
