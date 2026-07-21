import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTasks } from "../context/TaskContext";
import { format, isAfter, parseISO } from "date-fns";
import { generateSubtasks } from "../services/gemini";
import { getSpeechRecognizer, parseSpeechToTask } from "../services/speech";
import { calculateDefaultDueTime } from "../utils/taskUtils";
import { translateHinglishToEnglish, extractTaskDetails } from "../utils/voiceParser";
import TaskDetailsModal from "./TaskDetailsModal";
import toast from "react-hot-toast";
import axios from "axios";
import "../tasks.css";


function getEmptyStateMessage(status, filterCategory, filterPriority) {
  const isCategoryFiltered = filterCategory !== "All";
  const isPriorityFiltered = filterPriority !== "All";

  if (isCategoryFiltered && isPriorityFiltered) {
    return `No ${filterPriority} priority tasks found in "${filterCategory}" category.`;
  } else if (isCategoryFiltered) {
    return `No tasks found in "${filterCategory}" category.`;
  } else if (isPriorityFiltered) {
    return `No ${filterPriority} priority tasks found.`;
  } else {
    switch (status) {
      case "Pending": return "No pending tasks 🎉";
      case "Overdue": return "No overdue tasks";
      case "Completed": return "No completed tasks yet";
      case "Incoming": return "No incoming tasks";
      default: return "No tasks found";
    }
  }
}

function TaskPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleSubtask, geminiApiKey } = useTasks();
  const navigate = useNavigate();
  const { statusOrId } = useParams();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All"); // All, Pending, Completed, Overdue
  const [filterLimit, setFilterLimit] = useState("5");
  const [viewAllStatus, setViewAllStatus] = useState(null); // null, Pending, Overdue, Completed, Incoming

  const [selectedTask, setSelectedTask] = useState(null);

  // Modal / Add Form State
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(location.state?.openAddTaskModal || false);
  const [editTaskId, setEditTaskId] = useState(null);

  // Scroll to top when viewAllStatus opens
  useEffect(() => {
    if (viewAllStatus) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [viewAllStatus]);

  // Synchronize routing parameter only for task details view (not status cards navigation)
  useEffect(() => {
    if (!statusOrId) {
      setSelectedTask(null);
      return;
    }

    const lowerStatus = statusOrId.toLowerCase();
    if (!["pending", "overdue", "completed", "incoming"].includes(lowerStatus)) {
      // It's a task ID! Find the task from the list and open details
      const task = tasks.find(t => String(t.id) === statusOrId || String(t._id) === statusOrId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [statusOrId, tasks]);

  useEffect(() => {
    if (location.state?.openAddTaskModal) {
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
      setViewAllStatus(location.state.filterStatus);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal overlay scroll lock, position restoration, and element focus preservation
  useEffect(() => {
    if (showAddModal || viewAllStatus) {
      if (!showAddModal) {
        triggerElementRef.current = document.activeElement;
        scrollPositionRef.current = window.scrollY;
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (scrollPositionRef.current !== null && scrollPositionRef.current !== undefined) {
        window.scrollTo(0, scrollPositionRef.current);
      }
      triggerElementRef.current?.focus();
    }
  }, [showAddModal, viewAllStatus]);
  const addSubtaskItem = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    setSubtasksList((prev) => [...prev, newSubtask]);
    setNewSubtaskTitle("");
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isTitleSuggested, setIsTitleSuggested] = useState(false);
  const [categoryChangeMsg, setCategoryChangeMsg] = useState("");
  const [category, setCategory] = useState("Work");
  const [customCategory, setCustomCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [priority, setPriority] = useState("Medium");

  // Voice recognition states
  const [modalView, setModalView] = useState("edit"); // voice, processing, review, edit
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceState, setVoiceState] = useState("idle"); // idle, recording, paused, processing, success, error
  const [voiceLanguage, setVoiceLanguage] = useState("english"); // english, hindi
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [translatedTranscript, setTranslatedTranscript] = useState("");
  const [filledFields, setFilledFields] = useState({});
  const [voiceErrorText, setVoiceErrorText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [voiceExtractedData, setVoiceExtractedData] = useState({
    startTime: null,
    endTime: null,
    reminder: null,
    person: null,
    location: null,
    tags: [],
    recurrence: null,
    notes: null,
    originalTranscript: null,
    translatedTranscript: null
  });
  /* =================================================
     STATUS CARD AND SUBTASK POPUP
  ================================================= */

  const [subtaskPopupTask, setSubtaskPopupTask] = useState(null);

  /* Safe task ID */
  const getTaskId = (task) => task?.id || task?._id;

  /* Safe date formatter */
  const formatTaskDate = (dateValue, includeTime = false) => {
    if (!dateValue) return "Date not available";

    try {
      const parsedDate = new Date(dateValue);

      if (Number.isNaN(parsedDate.getTime())) {
        return "Date not available";
      }

      return includeTime
        ? format(parsedDate, "dd MMM yyyy, h:mm a")
        : format(parsedDate, "dd MMM yyyy");
    } catch (error) {
      return "Date not available";
    }
  };

  /* Check whether every subtask is completed */
  const areAllSubtasksCompleted = (task) => {
    if (!task?.subtasks?.length) return true;

    return task.subtasks.every(
      (subtask) => subtask.completed === true
    );
  };

  /* Complete main task */
  const handleCompleteTask = async (task) => {
    if (task.completed) return;

    if (!areAllSubtasksCompleted(task)) {
      setSubtaskPopupTask(task);

      alert(
        "Please complete all subtasks before completing the main task."
      );

      return;
    }

    const taskId = getTaskId(task);
    const completedTime = new Date().toISOString();

    try {
      await updateTask(taskId, {
        ...task,
        completed: true,
        status: "Completed",
        completedAt: completedTime,
        completedDate: format(new Date(), "yyyy-MM-dd")
      });
    } catch (error) {
      console.error("Unable to complete task:", error);
      alert("Task could not be completed.");
    }
  };

  /* Complete or uncomplete a subtask */
  const handleSubtaskToggle = async (
    parentTask,
    subtaskIndex
  ) => {
    const taskId = getTaskId(parentTask);

    const updatedSubtasks = parentTask.subtasks.map(
      (subtask, index) => {
        if (index !== subtaskIndex) {
          return subtask;
        }

        return {
          ...subtask,
          completed: !subtask.completed,
          completedAt: !subtask.completed
            ? new Date().toISOString()
            : null
        };
      }
    );

    const updatedTask = {
      ...parentTask,
      subtasks: updatedSubtasks
    };

    try {
      await updateTask(taskId, updatedTask);

      /*
        Popup ko bhi immediately update karega.
        Isse checkbox click karte hi UI change dikhega.
      */
      setSubtaskPopupTask(updatedTask);
    } catch (error) {
      console.error("Unable to update subtask:", error);
      alert("Subtask could not be updated.");
    }
  };

  /* Complete all subtasks */
  const handleCompleteAllSubtasks = async (task) => {
    const taskId = getTaskId(task);
    const completedTime = new Date().toISOString();

    const updatedSubtasks = task.subtasks.map(
      (subtask) => ({
        ...subtask,
        completed: true,
        completedAt:
          subtask.completedAt || completedTime
      })
    );

    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks
    };

    try {
      await updateTask(taskId, updatedTask);
      setSubtaskPopupTask(updatedTask);
    } catch (error) {
      console.error(
        "Unable to complete all subtasks:",
        error
      );

      alert("Subtasks could not be completed.");
    }
  };

  /* Subtask progress */
  const getSubtaskProgress = (task) => {
    const total = task?.subtasks?.length || 0;

    const completed =
      task?.subtasks?.filter(
        (subtask) => subtask.completed
      ).length || 0;

    return {
      total,
      completed
    };
  };
  const userEmail = localStorage.getItem("smartEmail") || "guest";
  const [draftStatus, setDraftStatus] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);

  const isRestoringDraftRef = useRef(false);
  const triggerElementRef = useRef(null);
  const scrollPositionRef = useRef(0);

  const titleInputRef = useRef(null);
  const descInputRef = useRef(null);
  const categorySelectRef = useRef(null);
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const prioritySelectRef = useRef(null);
  const micButtonRef = useRef(null);
  const transcriptTextareaRef = useRef(null);
  const reviewAddButtonRef = useRef(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const presetCategories = ["Work", "Personal", "Health", "Learning", "Shopping"];
  const dynamicCategories = [...new Set([...tasks.map(t => t.category), category].filter(Boolean))];
  const allCategories = [...new Set([...presetCategories, ...dynamicCategories])].filter(cat => cat !== "Custom");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentTimeStr = format(new Date(), "HH:mm");

  const [dueDate, setDueDate] = useState(todayStr);
  const [isTimeManuallySet, setIsTimeManuallySet] = useState(false);
  const [dueTime, setDueTime] = useState(() => calculateDefaultDueTime("Work"));
  const [timeError, setTimeError] = useState("");
  const [isLargeTask, setIsLargeTask] = useState(false);

  // Automatically recalculate due time when category changes (if not manually overridden)
  useEffect(() => {
    if (!editTaskId && !isTimeManuallySet) {
      setDueTime(calculateDefaultDueTime(category));
    }
  }, [category, editTaskId, isTimeManuallySet]);

  // Subtasks building state
  const [subtasksList, setSubtasksList] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Category title suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  const categoryName = useMemo(() => {
    if (isAddingCategory) return "";
    if (!category) return "";

    // If dropdown stores only an ID, find the complete category from categories list
    const selectedCategoryData = allCategories.find(
      cat =>
        (cat && typeof cat === 'object') &&
        (cat._id === category || cat.id === category)
    );

    const resolvedName =
      (selectedCategoryData && (selectedCategoryData.name || selectedCategoryData.label)) ||
      (category && (category.name || category.label || category.title || category));

    return typeof resolvedName === 'string' ? resolvedName.trim() : "";
  }, [category, isAddingCategory, allCategories]);
  const handleAIBreakdown = () => {
    if (!title.trim()) {
      alert("Enter task title first");
      return;
    }

    const task = title.toLowerCase();
    let aiSubtasks = [];

    // Example breakdowns
    if (task.includes("project")) {
      aiSubtasks = [
        "Understand requirements",
        "Create project structure",
        "Implement core features",
        "Test functionality",
        "Fix bugs",
        "Deploy project",
      ];
    } else if (task.includes("assignment")) {
      aiSubtasks = [
        "Read assignment",
        "Research the topic",
        "Prepare outline",
        "Write first draft",
        "Review and edit",
        "Submit assignment",
      ];
    } else if (task.includes("presentation")) {
      aiSubtasks = [
        "Research topic",
        "Create slide outline",
        "Design slides",
        "Add visuals",
        "Practice presentation",
      ];
    } else if (task.includes("react")) {
      aiSubtasks = [
        "Create components",
        "Manage state",
        "Connect API",
        "Style UI",
        "Test application",
      ];
    } else {
      aiSubtasks = [
        "Plan the task",
        "Break into smaller steps",
        "Start implementation",
        "Review progress",
        "Complete remaining work",
        "Final review",
      ];
    }

    const newSubtasks = aiSubtasks.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      title: item,
      completed: false,
    }));

    setSubtasksList(newSubtasks);
  };
  const selectedCategory = useMemo(() => {
    if (!categoryName) return null;
    return {
      _id: category,
      name: categoryName
    };
  }, [category, categoryName]);

  useEffect(() => {
    if (!showAddModal) return;

    setSuggestions([]);
    setSuggestionError("");

    if (
      !categoryName ||
      categoryName.trim() === "" ||
      categoryName.toLowerCase() === "category"
    ) {
      return;
    }

    const cleanName = categoryName.trim();
    const cleanLower = cleanName.toLowerCase();


    const keywordMappings = {
      customer: [
        "Follow Up with Customer",
        "Resolve Customer Query",
        "Schedule Customer Meeting",
        "Update Customer Details",
        "Collect Customer Feedback",
        "Send Customer Invoice"
      ],
      shopping: [
        "Buy Groceries",
        "Purchase Essentials",
        "Compare Prices",
        "Order Online",
        "Check Shopping List",
        "Buy Household Items"
      ],
      health: [
        "Book Doctor Appointment",
        "Morning Exercise",
        "Take Medicines",
        "Drink Water",
        "Evening Walk",
        "Schedule Health Checkup"
      ],
      travel: [
        "Book Tickets",
        "Reserve Hotel",
        "Pack Luggage",
        "Plan Itinerary",
        "Check Travel Documents",
        "Exchange Currency"
      ],
      finance: [
        "Pay Bills",
        "Review Expenses",
        "Update Budget",
        "Check Bank Balance",
        "Track Investments",
        "Download Statement"
      ],
      interview: [
        "Practice Coding",
        "Revise Interview Questions",
        "Update Resume",
        "Research Company",
        "Mock Interview",
        "Apply for Jobs"
      ],
      wedding: [
        "Finalize Guest List",
        "Book Venue",
        "Confirm Catering",
        "Buy Decorations",
        "Send Invitations",
        "Meet Photographer"
      ],
      study: [
        "Complete Assignment",
        "Revise Notes",
        "Practice Questions",
        "Attend Online Class",
        "Prepare for Exam",
        "Read Chapter"
      ],
      fitness: [
        "Gym Workout",
        "Morning Run",
        "Yoga Session",
        "Track Calories",
        "Stretching Routine",
        "Drink Protein Shake"
      ],
      cooking: [
        "Plan Cooking Tasks",
        "Buy Ingredients",
        "Prepare Meal",
        "Try New Recipe",
        "Clean Kitchen",
        "Organize Pantry"
      ],
      photography: [
        "Plan Photography Session",
        "Edit Photos",
        "Organize Camera Gear",
        "Review Photography Notes",
        "Schedule Photography Work",
        "Backup Photos"
      ],
      gardening: [
        "Plan Gardening Tasks",
        "Buy Gardening Supplies",
        "Complete Gardening Work",
        "Review Gardening Checklist",
        "Schedule Gardening Activity",
        "Organize Gardening Items"
      ]
    };

    // Find if the category clean name contains or matches any of the mapping keys
    let matchedKey = Object.keys(keywordMappings).find(
      key => cleanLower.includes(key) || key.includes(cleanLower)
    );

    let list = [];
    if (matchedKey) {
      list = keywordMappings[matchedKey];
    } else {
      const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      list = [
        `Plan ${capitalized} Tasks`,
        `Buy ${capitalized} Supplies`,
        `Complete ${capitalized} Work`,
        `Review ${capitalized} Checklist`,
        `Schedule ${capitalized} Activity`,
        `Organize ${capitalized} Items`
      ];
    }

    setSuggestions(list.slice(0, 6));
  }, [categoryName, showAddModal]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };
  }, []);

  const stopVoiceRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
      recognitionRef.current = null;
    }
    setVoiceState("paused");
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      stopVoiceRecording();
    }, 4000);
  };

  const startVoiceRecording = () => {
    setVoiceErrorText("");
    setOriginalTranscript("");
    setLiveTranscript("");
    setTranslatedTranscript("");
    setVoiceState("recording");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceErrorText("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      setVoiceState("error");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;

      if (voiceLanguage === "hindi") {
        rec.lang = "hi-IN";
      } else {
        rec.lang = "en-US";
      }

      let finalResult = "";

      rec.onresult = (event) => {
        resetSilenceTimer();
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalResult += trans;
          } else {
            interim += trans;
          }
        }
        setLiveTranscript(interim);
        if (finalResult) {
          setOriginalTranscript(finalResult.trim());
        }
      };

      rec.onerror = (event) => {
        console.error("Speech error:", event.error);
        if (event.error === "not-allowed") {
          setVoiceErrorText("Microphone access denied. Please allow microphone permission in browser settings.");
        } else if (event.error !== "no-speech") {
          setVoiceErrorText(`Recognition error: ${event.error}`);
        }
        setVoiceState("error");
      };

      rec.onend = () => {
        setVoiceState(prev => prev === "recording" ? "paused" : prev);
      };

      recognitionRef.current = rec;
      rec.start();
      resetSilenceTimer();
    } catch (err) {
      setVoiceErrorText(`Failed to initialize: ${err.message}`);
      setVoiceState("error");
    }
  };

  const isDraftEmpty = (draftData) => {
    if (!draftData) return true;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return (
      (!draftData.originalTranscript || !draftData.originalTranscript.trim()) &&
      (!draftData.title || !draftData.title.trim()) &&
      (!draftData.description || !draftData.description.trim()) &&
      (!draftData.subtasksList || draftData.subtasksList.length === 0) &&
      (!draftData.customCategory || !draftData.customCategory.trim()) &&
      (draftData.category === "Work" || !draftData.category) &&
      (draftData.priority === "Medium" || !draftData.priority) &&
      (draftData.dueDate === todayStr || !draftData.dueDate)
    );
  };

const saveDraftImmediately = () => {
    const draftData = {
      modalView,
      originalTranscript,
      translatedTranscript,
      title,
      description,
      category,
      priority,
      dueDate,
      dueTime,
      subtasksList,
      filledFields,
      voiceExtractedData,
      isAddingCategory,
      customCategory,
      isLargeTask,
      updatedAt: new Date().toISOString()
    };

    if (isDraftEmpty(draftData)) {
      localStorage.removeItem(`smartPlanner_addTaskDraft_${userEmail}`);
    } else {
      localStorage.setItem(`smartPlanner_addTaskDraft_${userEmail}`, JSON.stringify(draftData));
    }
  };

  const closeModalCleanly = (shouldSaveDraft = true) => {
    if (isSaving) return;
    resetForm(shouldSaveDraft);
    if (window.history.state?.modalOpen === true) {
      window.history.back();
    }
  };

  const focusFirstField = () => {
    if (!showAddModal) return;

    if (modalView === "voice") {
      if (originalTranscript) {
        transcriptTextareaRef.current?.focus();
      } else {
        micButtonRef.current?.focus();
      }
    } else if (modalView === "review") {
      reviewAddButtonRef.current?.focus();
    } else if (modalView === "edit") {
      if (!title || !title.trim()) {
        titleInputRef.current?.focus();
      } else if (!description || !description.trim()) {
        descInputRef.current?.focus();
      } else if (!category) {
        categorySelectRef.current?.focus();
      } else if (!dueDate) {
        dateInputRef.current?.focus();
      } else if (!dueTime) {
        timeInputRef.current?.focus();
      } else if (!priority) {
        prioritySelectRef.current?.focus();
      } else {
        titleInputRef.current?.focus();
      }
    }
  };

  const handleClearAllAction = () => {
    stopVoiceRecording();
    localStorage.removeItem(`smartPlanner_addTaskDraft_${userEmail}`);

    const isVoiceMode = modalView === "voice" || modalView === "review";

    resetForm(false, false);
    
    if (isVoiceMode) {
      toast.success("Transcript cleared successfully.", { position: "top-right", duration: 3000 });
      setModalView("voice");
      setVoiceState("idle");
    } else {
      toast.success("Draft cleared successfully.", { position: "top-right", duration: 3000 });
      setModalView("edit");
    }
    
    setDraftStatus("");
    setTimeError("");
    setVoiceErrorText("");

    setTimeout(() => {
      if (!isVoiceMode) {
        focusFirstField();
      }
    }, 50);
  };

  // Load draft on mount (Automatically restores)
  useEffect(() => {
    if (showAddModal) {
      const stored = localStorage.getItem(`smartPlanner_addTaskDraft_${userEmail}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!isDraftEmpty(parsed)) {
            isRestoringDraftRef.current = true;

            setModalView(parsed.modalView || "edit");
            setOriginalTranscript(parsed.originalTranscript || "");
            setTranslatedTranscript(parsed.translatedTranscript || "");
            setTitle(parsed.title || "");
            setDescription(parsed.description || "");
            setCategory(parsed.category || "Work");
            setPriority(parsed.priority || "Medium");
            setDueDate(parsed.dueDate || todayStr);
            setDueTime(parsed.dueTime || calculateDefaultDueTime(parsed.category || "Work"));
            setSubtasksList(parsed.subtasksList || []);
            setFilledFields(parsed.filledFields || {});
            setVoiceExtractedData(parsed.voiceExtractedData || {
              startTime: null,
              endTime: null,
              reminder: null,
              person: null,
              location: null,
              tags: [],
              recurrence: null,
              notes: null,
              originalTranscript: null,
              translatedTranscript: null
            });
            setIsAddingCategory(parsed.isAddingCategory || false);
            setCustomCategory(parsed.customCategory || "");
            setIsLargeTask(parsed.isLargeTask || false);

            setDraftStatus("Draft restored");

            setTimeout(() => {
              isRestoringDraftRef.current = false;
              focusFirstField();
            }, 120);

            // Auto-dismiss indicator message after 3 seconds
            setTimeout(() => {
              setDraftStatus("");
            }, 3000);
          }
        } catch (e) {
          console.error("Failed to parse draft:", e);
        }
      }
    }
  }, [showAddModal, userEmail]);

  // Esc key down listener
  useEffect(() => {
    if (!showAddModal) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isSaving) return;
        closeModalCleanly(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSaving, modalView, originalTranscript, title, description, category, priority, dueDate, dueTime, subtasksList, customCategory, isAddingCategory]);

  // Auto-save draft effect
  useEffect(() => {
    if (!showAddModal) return;
    if (isRestoringDraftRef.current) return;

    const draftData = {
      modalView,
      originalTranscript,
      translatedTranscript,
      title,
      description,
      category,
      priority,
      dueDate,
      dueTime,
      subtasksList,
      filledFields,
      voiceExtractedData,
      isAddingCategory,
      customCategory,
      isLargeTask,
      updatedAt: new Date().toISOString()
    };

    if (isDraftEmpty(draftData)) {
      localStorage.removeItem(`smartPlanner_addTaskDraft_${userEmail}`);
      setDraftStatus("");
      return;
    }

    setDraftStatus("Saving draft...");

    const handler = setTimeout(() => {
      localStorage.setItem(`smartPlanner_addTaskDraft_${userEmail}`, JSON.stringify(draftData));
      setDraftStatus("Draft saved");
    }, 300);

    return () => clearTimeout(handler);
  }, [
    showAddModal,
    modalView,
    originalTranscript,
    translatedTranscript,
    title,
    description,
    category,
    priority,
    dueDate,
    dueTime,
    subtasksList,
    filledFields,
    voiceExtractedData,
    isAddingCategory,
    customCategory,
    isLargeTask
  ]);

  // Popstate history browser back listener
  useEffect(() => {
    if (showAddModal) {
      if (window.history.state?.modalOpen !== true) {
        window.history.pushState({ modalOpen: true }, "");
      }
    }

    const handlePopState = (e) => {
      if (showAddModal) {
        if (isSaving) {
          window.history.pushState({ modalOpen: true }, "");
          return;
        }
        resetForm(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showAddModal, isSaving, modalView, originalTranscript, title, description, category, priority, dueDate, dueTime, subtasksList, customCategory, isAddingCategory]);

  // Auto-focus effect
  useEffect(() => {
    if (!showAddModal) return;

    const timer = setTimeout(() => {
      focusFirstField();
    }, 120);

    return () => clearTimeout(timer);
  }, [showAddModal, modalView]);

  const handleProcessTask = () => {
    if (!originalTranscript.trim()) {
      setVoiceErrorText("Please speak or write a transcript first.");
      setVoiceState("error");
      return;
    }

    setVoiceState("processing");
    setModalView("processing");

    setTimeout(() => {
      try {
        let translated = originalTranscript;
        if (voiceLanguage === "hindi") {
          translated = translateHinglishToEnglish(originalTranscript);
        }
        setTranslatedTranscript(translated);

        const details = extractTaskDetails(originalTranscript, translated);

        // ⚡ Set isTimeManuallySet=true FIRST — before any setCategory/setDueTime
        // This prevents the useEffect from overwriting the voice-parsed time
        // when category changes trigger it.
        const hasValidTime = details.dueTime && details.dueTime !== "00:00";
        if (hasValidTime) {
          setIsTimeManuallySet(true);
        }

        if (details.title) setTitle(details.title);
        if (details.description) setDescription(details.description);

        if (details.category) {
          if (allCategories.includes(details.category)) {
            setCategory(details.category);
          } else {
            setIsAddingCategory(true);
            setCustomCategory(details.category);
            setCategory(details.category);
          }
        }
        if (details.priority) setPriority(details.priority);
        if (details.dueDate) setDueDate(details.dueDate);
        if (hasValidTime) {
          setDueTime(details.dueTime);
        }

        setVoiceExtractedData({
          startTime: details.startTime || null,
          endTime: details.endTime || null,
          reminder: details.reminder || null,
          person: details.person || null,
          location: details.location || null,
          tags: details.tags || [],
          recurrence: details.recurrence || null,
          notes: details.notes || null,
          originalTranscript: originalTranscript,
          translatedTranscript: translated !== originalTranscript ? translated : null
        });

        const filled = {};
        if (details.title) filled.title = true;
        if (details.description) filled.description = true;
        if (details.category) filled.category = true;
        if (details.priority) filled.priority = true;
        if (details.dueDate) filled.dueDate = true;
        if (details.dueTime) filled.dueTime = true;
        if (details.person) filled.person = true;
        if (details.location) filled.location = true;
        if (details.reminder) filled.reminder = true;
        if (details.recurrence) filled.recurrence = true;
        if (details.tags && details.tags.length > 0) filled.tags = true;

        setFilledFields(filled);
        setVoiceState("success");
        setModalView("review");
      } catch (err) {
        console.error("Voice extract failed:", err);
        setVoiceErrorText(`Failed to extract details: ${err.message}`);
        setVoiceState("error");
        setModalView("voice");
      }
    }, 800);
  };

  // Submit form handler
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);

    const taskObj = {
      title: title.trim(),
      description: description.trim(),
      category: isAddingCategory ? (customCategory.trim() || "General") : category,
      priority,
      dueDate,
      dueTime,
      subtasks: subtasksList,
      ...voiceExtractedData
    };

    try {
      let createdTask = null;
      if (editTaskId) {
        createdTask = updateTask(editTaskId, taskObj);
        toast.success("Task updated successfully.");
      } else {
        createdTask = addTask(taskObj);

        toast.custom((t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
            style={{
              background: "white",
              color: "#0f172a",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "360px",
              width: "100%",
              marginTop: "70px" // Spacing below main navbar
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Task added successfully.</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                  Would you like to review this task?
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                style={{ background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedTask(createdTask);
                  toast.dismiss(t.id);
                }}
                style={{
                  flex: 1,
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                View Task
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 10000 });
      }

      resetForm(false);
    } catch (err) {
      toast.custom((t) => (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: "12px", border: "1px solid #fca5a5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <span>Failed to save task: {err.message}</span>
          <button 
            type="button"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation();
              toast.dismiss(t.id); 
              handleSubmit(); 
            }} 
            style={{ background: "#991b1b", color: "white", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      ));
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = (shouldSaveDraft = true, closeModal = true) => {
    if (showAddModal) {
      if (shouldSaveDraft) {
        saveDraftImmediately();
        const draftData = {
          modalView,
          originalTranscript,
          translatedTranscript,
          title,
          description,
          category,
          priority,
          dueDate,
          dueTime,
          subtasksList,
          filledFields,
          voiceExtractedData,
          isAddingCategory,
          customCategory,
          isLargeTask
        };
        if (!isDraftEmpty(draftData)) {
          toast.success("Your task has been saved as a draft.");
        }
      } else {
        localStorage.removeItem(`smartPlanner_addTaskDraft_${userEmail}`);
      }
    }

    setTitle("");
    setDescription("");
    setIsTitleSuggested(false);
    setCategoryChangeMsg("");
    setCategory("Work");
    setCustomCategory("");
    setIsAddingCategory(false);
    setPriority("Medium");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setIsTimeManuallySet(false);
    setDueTime(calculateDefaultDueTime("Work"));
    setIsLargeTask(false);
    setSubtasksList([]);
    setEditTaskId(null);
    if (closeModal) {
      setShowAddModal(false);
      setModalView("edit");
      setIsVoiceModeActive(false);
    }
    setVoiceState("idle");
    setOriginalTranscript("");
    setLiveTranscript("");
    setTranslatedTranscript("");
    setFilledFields({});
    setVoiceExtractedData({
      startTime: null,
      endTime: null,
      reminder: null,
      person: null,
      location: null,
      tags: [],
      recurrence: null,
      notes: null,
      originalTranscript: null,
      translatedTranscript: null
    });
  };

  const handleEditClick = (task) => {
    setTitle(task.title);
    setDescription(task.description || "");
    setIsTitleSuggested(false);
    setCategoryChangeMsg("");
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setDueTime(task.dueTime);
    setIsTimeManuallySet(true);
    setSubtasksList(task.subtasks || []);
    setIsLargeTask(task.subtasks?.length > 0);
    setEditTaskId(task.id);

    setVoiceExtractedData({
      startTime: task.startTime || null,
      endTime: task.endTime || null,
      reminder: task.reminder || null,
      person: task.person || null,
      location: task.location || null,
      tags: task.tags || [],
      recurrence: task.recurrence || null,
      notes: task.notes || null,
      originalTranscript: task.originalTranscript || null,
      translatedTranscript: task.translatedTranscript || null
    });
    setFilledFields({});
    setVoiceState("idle");
    setModalView("edit");
    setShowAddModal(true);
  };

  const getTaskStatus = (task) => {
    if (task.completed) return "Completed";
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const taskDateObj = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
    if (taskDateObj < now) return "Overdue";
    if (task.dueDate === today) return "Pending";
    return "Incoming";
  };

  // Helper to determine task status, color, and sort priority
  const getTaskStatusInfo = (task) => {
    const status = getTaskStatus(task);
    if (status === "Completed") return { label: "Completed", colorClass: "green" };
    if (status === "Overdue") return { label: "Overdue", colorClass: "red" };
    if (status === "Pending") return { label: "Pending", colorClass: "yellow" };
    return { label: "Incoming", colorClass: "blue" };
  };

  const TaskStatusDropdown = ({ task }) => {
    const isCompleted = task.completed || task.status === "completed";

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={isCompleted}
          title={isCompleted ? "This task has already been completed." : "Mark as Completed"}
          onChange={async (e) => {
            if (isCompleted) return;

            // Subtasks validation
            const hasIncompleteSubtasks = task.subtasks && task.subtasks.length > 0 && task.subtasks.some(s => !s.completed);
            if (hasIncompleteSubtasks) {
              const completedCount = task.subtasks.filter(s => s.completed).length;
              toast.error(`Complete all subtasks before marking this task as completed. (${completedCount} of ${task.subtasks.length} completed)`);
              return;
            }

            try {
              await updateTask(task.id, { completed: true, status: "completed" });
            } catch (err) { }
          }}
          style={{
            width: "16px",
            height: "16px",
            accentColor: "#10b981",
            cursor: isCompleted ? "not-allowed" : "pointer"
          }}
        />
        <span style={{ fontSize: "0.82rem", fontWeight: "700", color: isCompleted ? "#10b981" : "var(--text-muted)" }}>
          {isCompleted ? "Completed ✓" : "Mark Complete"}
        </span>
      </div>
    );
  };

  // Base filtered tasks (excluding status filter)
  const baseFilteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search Query matching
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = filterCategory === "All" || task.category === filterCategory;

      // Priority filter
      const matchesPriority = filterPriority === "All" || task.priority === filterPriority;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [tasks, searchQuery, filterCategory, filterPriority]);

  
  const totalPendingCount = useMemo(() => tasks.filter(task => getTaskStatus(task) === 'Pending').length, [tasks]);
  const totalOverdueCount = useMemo(() => tasks.filter(task => getTaskStatus(task) === 'Overdue').length, [tasks]);
  const totalCompletedCount = useMemo(() => tasks.filter(task => getTaskStatus(task) === 'Completed').length, [tasks]);
  const totalIncomingCount = useMemo(() => tasks.filter(task => getTaskStatus(task) === 'Incoming').length, [tasks]);

  const pendingTasksList = useMemo(() => {
    return baseFilteredTasks.filter(task => getTaskStatus(task) === "Pending");
  }, [baseFilteredTasks]);

  const overdueTasksList = useMemo(() => {
    return baseFilteredTasks.filter(task => getTaskStatus(task) === "Overdue");
  }, [baseFilteredTasks]);

  const completedTasksList = useMemo(() => {
    return baseFilteredTasks.filter(task => getTaskStatus(task) === "Completed");
  }, [baseFilteredTasks]);

  const incomingTasksList = useMemo(() => {
    return baseFilteredTasks.filter(task => getTaskStatus(task) === "Incoming");
  }, [baseFilteredTasks]);

  // Intelligent Chronological Sorting Logic
  const sortedTasks = useMemo(() => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };

    const statusFiltered = baseFilteredTasks.filter(task => {
      if (filterStatus === "All") return true;
      return getTaskStatus(task) === filterStatus;
    });

    return [...statusFiltered].sort((a, b) => {
      // 1. Completed tasks always at the absolute bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // 2. Strict chronological sort (earliest deadline always appears first)
      const dateA = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`).getTime();
      const dateB = new Date(`${b.dueDate}T${b.dueTime || "23:59"}`).getTime();

      if (dateA !== dateB) {
        return dateA - dateB; // Ascending order (earliest first)
      }

      // 3. Tiebreaker: Sort by Priority (High > Medium > Low)
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;

      if (pA !== pB) {
        return pB - pA; // Descending order (highest weight first)
      }

      return 0; // Identical tasks
    });
  }, [baseFilteredTasks, filterStatus]);

  const displayedTasks = useMemo(() => {
    return filterLimit === "All" ? sortedTasks : sortedTasks.slice(0, parseInt(filterLimit, 10));
  }, [sortedTasks, filterLimit]);

  // Escape key listener to close View All modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setViewAllStatus(null);
        setFilterStatus("All");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStatusFilterChange = (val) => {
    setFilterStatus(val);
    if (val === "All") {
      setViewAllStatus(null);
    } else {
      setViewAllStatus(val);
    }
  };

  const getStatusIcon = (status) => {
    if (status === "Pending") return "🕒";
    if (status === "Overdue") return "🔴";
    if (status === "Completed") return "🟢";
    return "🔵";
  };

  const modalFilteredTasks = useMemo(() => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };

    // Filter by category, priority, search, and status (which is fixed to viewAllStatus)
    const list = tasks.filter(task => {
      if (getTaskStatus(task) !== viewAllStatus) return false;

      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory === "All" || task.category === filterCategory;
      const matchesPriority = filterPriority === "All" || task.priority === filterPriority;

      return matchesSearch && matchesCategory && matchesPriority;
    });

    // Sort chronologically (Sort by due date)
    return list.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      const dateA = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`).getTime();
      const dateB = new Date(`${b.dueDate}T${b.dueTime || "23:59"}`).getTime();

      if (dateA !== dateB) return dateA - dateB;

      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      return pB - pA;
    });
  }, [tasks, viewAllStatus, searchQuery, filterCategory, filterPriority]);

  return (
    <div className="tasks-page">
      <section className="tasks-hero">
        <div className="tasks-hero-content">
          <p className="tasks-eyebrow">Task Management</p>
          <h1 className="tasks-title">Keep your work moving</h1>
          {/* <p className="tasks-sub">Organize priorities, break down large tasks, and stay on track with interactive check-offs.</p> */}
        </div>
        <button
          type="button"
          className="tasks-new-btn"
          onClick={() => setShowAddModal(true)}
        >
          + New Task
        </button>
      </section>

      {/* Filter and Search Bar */}
      <section className="tasks-filter-bar">
        <div className="tasks-search-wrapper">
          <span className="tasks-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tasks-search-input"
          />
        </div>

        <div className="tasks-filters-group">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="tasks-select"
          >
            <option value="All">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="tasks-select"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

        </div>
      </section>

      {/* ── Always render the 4 status cards grid ── */}
      <section className="status-grid">
        {/* =================================================
      PENDING CARD
  ================================================= */}

        <div className="status-card pending">
          <header className="status-card-header">
            <div className="status-card-title-group">
              <span className="status-card-icon">🕒</span>

              <h3 className="status-card-title">
                Pending
              </h3>
            </div>

            <span className="status-card-count">
              {totalPendingCount} Tasks
            </span>
          </header>

          <div className="status-card-previews">
            {pendingTasksList.length === 0 ? (
              <div className="status-card-empty">{getEmptyStateMessage("Pending", filterCategory, filterPriority)}</div>
            ) : (
              pendingTasksList
                .slice(0, 2)
                .map((task) => {
                  const progress =
                    getSubtaskProgress(task);

                  return (
                    <div
                      key={getTaskId(task)}
                      className="task-preview-item"
                    >
                      {/* Top Row: Title & Due Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                        <div className="task-title-checkbox-row" style={{ display: "flex", alignItems: "flex-start", gap: "4px", margin: 0, flex: 1, minWidth: 0 }}>
                          
                          <label
                            className="task-complete-checkbox"
                            style={{ flexShrink: 0, marginTop: "2px" }}
                            title={
                              areAllSubtasksCompleted(task)
                                ? "Mark task as completed"
                                : "Complete all subtasks first"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => handleCompleteTask(task)}
                            />
                            <span className="custom-checkmark" />
                          </label>
                          
                          <h4 className="task-preview-title" style={{ margin: 0, lineHeight: 1.3 }}>
                            {task.title}
                          </h4>
                        </div>
                        <div className="task-preview-date" style={{ margin: 0, padding: 0, background: "none", flexShrink: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                          
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Due • </span>
                          {formatTaskDate(task.dueDate)}
                          
                        </div>
                      </div>

                      {/* Bottom Row: Subtasks on left, View Details on right (or left if no subtasks) */}
                      <div className="task-preview-actions" style={{ display: "flex", justifyContent: task.subtasks?.length > 0 ? "space-between" : "flex-start", alignItems: "center",gap: "8px" }}>
                        {task.subtasks?.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className="subtask-toggle-btn"
                              style={{ margin: 0 }}
                              onClick={() => setSubtaskPopupTask(task)}
                            >
                              Subtasks: {progress.completed}/{progress.total}
                            </button>
                            <button
                              type="button"
                              className="status-card-viewall"
                              style={{ margin: 0 }}
                              onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                            >
                              View Details →
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="status-card-viewall"
                            style={{ margin: 0 }}
                            onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                          >
                            View Details →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {pendingTasksList.length > 2 && (
              <div className="status-card-more">
                +{pendingTasksList.length - 2} more tasks
              </div>
            )}
          </div>

          <footer className="status-card-footer">
            <button
              type="button"
              className="status-card-viewall"
              onClick={() => {
                setViewAllStatus("Pending");
                setFilterStatus("Pending");
              }}
            >
              View All →
            </button>
          </footer>
        </div>

        {/* =================================================
      OVERDUE CARD
  ================================================= */}

        <div className="status-card overdue">
          <header className="status-card-header">
            <div className="status-card-title-group">
              <span className="status-card-icon">🔴</span>

              <h3 className="status-card-title">
                Overdue
              </h3>
            </div>

            <span className="status-card-count">
              {totalOverdueCount} Tasks
            </span>
          </header>

          <div className="status-card-previews">
            {overdueTasksList.length === 0 ? (
              <div className="status-card-empty">{getEmptyStateMessage("Overdue", filterCategory, filterPriority)}</div>
            ) : (
              overdueTasksList
                .slice(0, 2)
                .map((task) => {
                  const progress =
                    getSubtaskProgress(task);

                  return (
                    <div
                      key={getTaskId(task)}
                      className="task-preview-item"
                    >
                      {/* Top Row: Title & Due Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div className="task-title-checkbox-row" style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: 0, flex: 1, minWidth: 0 }}>
                          
                          <label
                            className="task-complete-checkbox"
                            style={{ flexShrink: 0 }}
                            title={
                              areAllSubtasksCompleted(task)
                                ? "Mark task as completed"
                                : "Complete all subtasks first"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => handleCompleteTask(task)}
                            />
                            <span className="custom-checkmark" />
                          </label>
                          
                          <h4 className="task-preview-title" style={{ margin: 0, lineHeight: 1.3 }}>
                            {task.title}
                          </h4>
                        </div>
                        <div className="task-preview-date" style={{ margin: 0, padding: 0, background: "none", flexShrink: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                          
                          <span style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>Overdue • </span>
                          {formatTaskDate(task.dueDate)}
                          
                        </div>
                      </div>

                      {/* Bottom Row: Subtasks on left, View Details on right (or left if no subtasks) */}
                      <div className="task-preview-actions" style={{ display: "flex", justifyContent: task.subtasks?.length > 0 ? "space-between" : "flex-start", alignItems: "center", gap: "8px" }}>
                        {task.subtasks?.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className="subtask-toggle-btn"
                              style={{ margin: 0 }}
                              onClick={() => setSubtaskPopupTask(task)}
                            >
                              Subtasks: {progress.completed}/{progress.total}
                            </button>
                            <button
                              type="button"
                              className="status-card-viewall"
                              style={{ margin: 0 }}
                              onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                            >
                              View Details →
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="status-card-viewall"
                            style={{ margin: 0 }}
                            onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                          >
                            View Details →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {overdueTasksList.length > 2 && (
              <div className="status-card-more">
                +{overdueTasksList.length - 2} more tasks
              </div>
            )}
          </div>

          <footer className="status-card-footer">
            <button
              type="button"
              className="status-card-viewall"
              onClick={() => {
                setViewAllStatus("Overdue");
                setFilterStatus("Overdue");
              }}
            >
              View All →
            </button>
          </footer>
        </div>

        {/* =================================================
      COMPLETED CARD
  ================================================= */}

        <div className="status-card completed">
          <header className="status-card-header">
            <div className="status-card-title-group">
              <span className="status-card-icon">🟢</span>

              <h3 className="status-card-title">
                Completed
              </h3>
            </div>

            <span className="status-card-count">
              {totalCompletedCount} Tasks
            </span>
          </header>

          <div className="status-card-previews">
            {completedTasksList.length === 0 ? (
              <div className="status-card-empty">{getEmptyStateMessage("Completed", filterCategory, filterPriority)}</div>
            ) : (
              completedTasksList
                .slice(0, 2)
                .map((task) => {
                  const completedDate =
                    task.completedAt ||
                    task.completedDate;

                  const progress =
                    getSubtaskProgress(task);

                  return (
                    <div
                      key={getTaskId(task)}
                      className="task-preview-item"
                    >
                      {/* Top Row: Title & Due Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1px" }}>
                        <div className="task-title-checkbox-row" style={{ display: "flex", alignItems: "flex-start", gap: "4px", margin: 0, flex: 1, minWidth: 0 }}>
                          
                          <div className="completed-static-checkbox" style={{ flexShrink: 0 }} title="Task completed">
                            ✓
                          </div>
                          
                          <h4 className="task-preview-title" style={{ margin: 0, lineHeight: 1.3 }}>
                            {task.title}
                          </h4>
                        </div>
                        <div className="task-preview-date" style={{ margin: 0, padding: 0, background: "none", flexShrink: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                          
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Completed • </span>
                          {formatTaskDate(task.completedAt || task.completedDate || task.dueDate, Boolean(task.completedAt))}
                          
                        </div>
                      </div>

                      {/* Bottom Row: Subtasks on left, View Details on right (or left if no subtasks) */}
                      <div className="task-preview-actions" style={{ display: "flex", justifyContent: task.subtasks?.length > 0 ? "space-between" : "flex-start", alignItems: "center", gap: "8px" }}>
                        {task.subtasks?.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className="subtask-toggle-btn"
                              style={{ margin: 0 }}
                              onClick={() => setSubtaskPopupTask(task)}
                            >
                              Subtasks: {progress.completed}/{progress.total}
                            </button>
                            <button
                              type="button"
                              className="status-card-viewall"
                              style={{ margin: 0 }}
                              onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                            >
                              View Details →
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="status-card-viewall"
                            style={{ margin: 0 }}
                            onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                          >
                            View Details →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {completedTasksList.length > 2 && (
              <div className="status-card-more">
                +{completedTasksList.length - 2} more tasks
              </div>
            )}
          </div>

          <footer className="status-card-footer">
            <button
              type="button"
              className="status-card-viewall"
              onClick={() => {
                setViewAllStatus("Completed");
                setFilterStatus("Completed");
              }}
            >
              View All →
            </button>
          </footer>
        </div>

        {/* =================================================
      INCOMING CARD
  ================================================= */}

        <div className="status-card incoming">
          <header className="status-card-header">
            <div className="status-card-title-group">
              <span className="status-card-icon">🔵</span>

              <h3 className="status-card-title">
                Incoming
              </h3>
            </div>

            <span className="status-card-count">
              {totalIncomingCount} Tasks
            </span>
          </header>

          <div className="status-card-previews">
            {incomingTasksList.length === 0 ? (
              <div className="status-card-empty">{getEmptyStateMessage("Incoming", filterCategory, filterPriority)}</div>
            ) : (
              incomingTasksList
                .slice(0, 2)
                .map((task) => {
                  const progress =
                    getSubtaskProgress(task);

                  return (
                    <div
                      key={getTaskId(task)}
                      className="task-preview-item"
                    >
                      {/* Top Row: Title & Due Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                        <div className="task-title-checkbox-row" style={{ display: "flex", alignItems: "flex-start", gap: "4px", margin: 0, flex: 1, minWidth: 0 }}>
                          
                          <label
                            className="task-complete-checkbox"
                            style={{ flexShrink: 0 }}
                            title={
                              areAllSubtasksCompleted(task)
                                ? "Mark task as completed"
                                : "Complete all subtasks first"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => handleCompleteTask(task)}
                            />
                            <span className="custom-checkmark" />
                          </label>
                          
                          <h4 className="task-preview-title" style={{ margin: 0, lineHeight: 1.3 }}>
                            {task.title}
                          </h4>
                        </div>
                        <div className="task-preview-date" style={{ margin: 0, padding: 0, background: "none", flexShrink: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                          
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Due • </span>
                          {formatTaskDate(task.dueDate)}
                          
                        </div>
                      </div>

                      {/* Bottom Row: Subtasks on left, View Details on right (or left if no subtasks) */}
                      <div className="task-preview-actions" style={{ display: "flex", justifyContent: task.subtasks?.length > 0 ? "space-between" : "flex-start", alignItems: "center", gap: "8px" }}>
                        {task.subtasks?.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className="subtask-toggle-btn"
                              style={{ margin: 0 }}
                              onClick={() => setSubtaskPopupTask(task)}
                            >
                              Subtasks: {progress.completed}/{progress.total}
                            </button>
                            <button
                              type="button"
                              className="status-card-viewall"
                              style={{ margin: 0 }}
                              onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                            >
                              View Details →
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="status-card-viewall"
                            style={{ margin: 0 }}
                            onClick={() => navigate(`/tasks/${getTaskId(task)}`)}
                          >
                            View Details →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {incomingTasksList.length > 2 && (
              <div className="status-card-more">
                +{incomingTasksList.length - 2} more tasks
              </div>
            )}
          </div>

          <footer className="status-card-footer">
            <button
              type="button"
              className="status-card-viewall"
              onClick={() => {
                setViewAllStatus("Incoming");
                setFilterStatus("Incoming");
              }}
            >
              View All →
            </button>
          </footer>
        </div>
      </section>
      {subtaskPopupTask && (
        <div
          className="subtask-popup-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSubtaskPopupTask(null);
            }
          }}
        >
          <div
            className="subtask-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subtask-popup-title"
          >
            <header className="subtask-popup-header">
              <div>
                <p className="subtask-popup-label">
                  Subtasks
                </p>

                <h3 id="subtask-popup-title">
                  {subtaskPopupTask.title}
                </h3>
              </div>

              <button
                type="button"
                className="subtask-popup-close"
                onClick={() =>
                  setSubtaskPopupTask(null)
                }
                aria-label="Close subtask popup"
              >
                ✕
              </button>
            </header>

            <div className="subtask-popup-progress">
              <span>
                {
                  getSubtaskProgress(
                    subtaskPopupTask
                  ).completed
                }
                /
                {
                  getSubtaskProgress(
                    subtaskPopupTask
                  ).total
                }{" "}
                completed
              </span>

              {!subtaskPopupTask.completed &&
                !areAllSubtasksCompleted(
                  subtaskPopupTask
                ) && (
                  <button
                    type="button"
                    className="complete-all-subtasks-btn"
                    onClick={() =>
                      handleCompleteAllSubtasks(
                        subtaskPopupTask
                      )
                    }
                  >
                    Complete All
                  </button>
                )}
            </div>

            <div className="subtask-popup-list">
              {subtaskPopupTask.subtasks?.length ? (
                subtaskPopupTask.subtasks.map(
                  (subtask, index) => (
                    <label
                      key={
                        subtask.id ||
                        subtask._id ||
                        `${subtask.title}-${index}`
                      }
                      className={`subtask-popup-item ${subtask.completed
                        ? "is-completed"
                        : ""
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            subtask.completed
                          )
                        }
                        disabled={
                          Boolean(
                            subtaskPopupTask.completed
                          )
                        }
                        onChange={() =>
                          handleSubtaskToggle(
                            subtaskPopupTask,
                            index
                          )
                        }
                      />

                      <span className="subtask-popup-checkmark">
                        {subtask.completed
                          ? "✓"
                          : ""}
                      </span>

                      <span className="subtask-popup-title">
                        {subtask.title ||
                          subtask.name ||
                          `Subtask ${index + 1}`}
                      </span>
                    </label>
                  )
                )
              ) : (
                <div className="subtask-popup-empty">
                  No subtasks available.
                </div>
              )}
            </div>

            {!subtaskPopupTask.completed && (
              <button
                type="button"
                className="complete-main-task-btn"
                disabled={
                  !areAllSubtasksCompleted(
                    subtaskPopupTask
                  )
                }
                onClick={() => {
                  handleCompleteTask(
                    subtaskPopupTask
                  );

                  if (
                    areAllSubtasksCompleted(
                      subtaskPopupTask
                    )
                  ) {
                    setSubtaskPopupTask(null);
                  }
                }}
              >
                {areAllSubtasksCompleted(
                  subtaskPopupTask
                )
                  ? "Complete Main Task"
                  : "Complete All Subtasks First"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── View All Large Modal Overlay ── */}
      {viewAllStatus && (
        <div className="modal-overlay" onClick={() => { setViewAllStatus(null); setFilterStatus("All"); }}>
          <div
            className="viewall-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 92vw)",
              maxHeight: "85vh",
              background: "var(--bg-card)",
              borderRadius: "24px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <header
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                background: "var(--bg-card)",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{getStatusIcon(viewAllStatus)}</span> {viewAllStatus} Tasks
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  {modalFilteredTasks.length} tasks found
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setViewAllStatus(null); setFilterStatus("All"); }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  padding: 0
                }}
                onMouseOver={(e) => e.target.style.background = "#f1f5f9"}
                onMouseOut={(e) => e.target.style.background = "transparent"}
                title="Close"
              >
                ✕
              </button>
            </header>

            {/* Compact Controls inside modal */}
            <div
              style={{
                padding: "12px 24px",
                background: "var(--bg-app)",
                borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center"
              }}
            >
              <div className="tasks-search-wrapper" style={{ flex: 1, minWidth: "200px" }}>
                <span className="tasks-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="tasks-search-input"
                  style={{ padding: "8px 12px 8px 36px", fontSize: "0.85rem" }}
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="tasks-select"
                style={{ padding: "8px 12px", fontSize: "0.82rem" }}
              >
                <option value="All">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="tasks-select"
                style={{ padding: "8px 12px", fontSize: "0.82rem" }}
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Scrollable Tasks list */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                background: "var(--bg-app)"
              }}
            >
              {modalFilteredTasks.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", margin: "auto" }}>
                  {viewAllStatus === "Pending" && "No pending tasks 🎉"}
                  {viewAllStatus === "Overdue" && "No overdue tasks"}
                  {viewAllStatus === "Completed" && "No completed tasks yet"}
                  {viewAllStatus === "Incoming" && "No incoming tasks"}
                </div>
              ) : (
                modalFilteredTasks.map((task) => {
                  const statusColors = {
                    Pending: "#eab308",
                    Overdue: "#ef4444",
                    Completed: "#22c55e",
                    Incoming: "#3b82f6"
                  };
                  const statusBorderColor = statusColors[viewAllStatus] || "#cbd5e1";

                  return (
                    <div
                      key={task.id}
                      style={{
                        background: "var(--bg-card)",
                        borderRadius: "16px",
                        border: "1px solid rgba(226, 232, 240, 0.8)",
                        borderLeft: `6px solid ${statusBorderColor}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        position: "relative"
                      }}
                    >
                      {/* Top Row: Title */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                          {task.title}
                        </h3>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span className={`task-preview-badge priority ${task.priority.toLowerCase()}`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                            {task.priority}
                          </span>
                          {task.category && (
                            <span className="task-preview-badge category" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                              {task.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <TaskStatusDropdown task={task} />
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                          {task.description}
                        </p>
                      )}

                      {/* Two Column Layout for details on Desktop/Tablet */}
                      <div className="task-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", padding: "10px 0", borderTop: "1px solid rgba(241, 245, 249, 0.8)", borderBottom: "1px solid rgba(241, 245, 249, 0.8)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        <div>
                          <strong>📁 Category:</strong> {task.category || "General"}
                        </div>
                        <div>
                          <strong>🕒 Status:</strong> {getTaskStatus(task)}
                        </div>
                        <div>
                          <strong>📅 Created At:</strong> {task.createdDate ? format(new Date(task.createdDate), "dd MMMM yyyy") : format(new Date(), "dd MMMM yyyy")}
                        </div>
                        <div>
                          <strong>📅 Due Date:</strong> {task.dueDate ? format(new Date(task.dueDate), "dd MMMM yyyy") : "-"}
                        </div>
                        <div>
                          <strong>🕐 Due/Start Time:</strong> {task.dueTime || "-"}
                        </div>
                        {task.reminder && (
                          <div>
                            <strong>🔔 Reminder:</strong> {task.reminder} min before
                          </div>
                        )}
                        {task.recurrence && (
                          <div>
                            <strong>🔁 Recurrence:</strong> {task.recurrence}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                        <button
                          type="button"
                          className="task-action-btn task-edit-btn"
                          onClick={() => handleEditClick(task)}
                          style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                        >
                          ✏️ Edit Task
                        </button>
                        <button
                          type="button"
                          className="task-action-btn task-delete-btn"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this task?")) {
                              deleteTask(task.id);
                            }
                          }}
                          style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                        >
                          🗑️ Delete Task
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            navigate("/tasks");
          }}
          onEdit={(task) => {
            setSelectedTask(null);
            handleEditClick(task);
          }}
          onDelete={(taskId) => {
            setSelectedTask(null);
            deleteTask(taskId);
            navigate("/tasks");
          }}
        />
      )}

      {/* Add / Edit Task Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay">
          <style>{`
            @keyframes voicePulse {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .listening-pulse {
              animation: voicePulse 1.5s infinite;
            }
          `}</style>
          <div className="modal-content" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ margin: 0 }}>{editTaskId ? "Edit Task" : "Create New Task"}</h2>
                {draftStatus && (
                  <span style={{ fontSize: "0.72rem", color: draftStatus === "Saving draft..." ? "#94a3b8" : draftStatus === "Draft saved" ? "#10b981" : "#3b82f6", fontStyle: "italic", fontWeight: 500 }}>
                    {draftStatus === "Saving draft..." ? "⏳ Saving draft..." : draftStatus === "Draft saved" ? "✓ Draft saved" : "✦ Draft restored"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => closeModalCleanly(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  padding: 0
                }}
                onMouseOver={(e) => e.target.style.background = "#f1f5f9"}
                onMouseOut={(e) => e.target.style.background = "transparent"}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Draft Recovery Banner */}
            {hasDraft && savedDraft && (
              <div style={{
                background: "#fffbeb",
                border: "1px solid #fbbf24",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1rem" }}>📝</span>
                  <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#92400e" }}>An unfinished task draft was found.</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleContinueDraft}
                    style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    Continue Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNew}
                    style={{ background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 14px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Start New
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissDraft}
                    style={{ background: "transparent", color: "#94a3b8", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* STATE 1: VOICE */}
            {modalView === "voice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}>
                      🎙️ Voice typing workspace
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label htmlFor="voice-lang-select" style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>Language:</label>
                      <select
                        id="voice-lang-select"
                        value={voiceLanguage}
                        onChange={(e) => setVoiceLanguage(e.target.value)}
                        style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.8rem", fontWeight: "500", color: voiceState === "recording" ? "#3b82f6" : "#64748b" }}>
                    {voiceState === "idle" && "Tap the microphone and describe your complete task."}
                    {voiceState === "recording" && (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="listening-pulse" style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span>
                        Listening... Speak your complete task.
                      </span>
                    )}
                    {voiceState === "paused" && "Review your transcript before creating the task."}
                    {voiceState === "error" && (voiceErrorText || "We could not identify all task details. You can complete them manually.")}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b" }}>Speech Transcript (Editable):</label>
                    <textarea
                      ref={transcriptTextareaRef}
                      value={originalTranscript}
                      onChange={(e) => setOriginalTranscript(e.target.value)}
                      placeholder='Speak details like "Call Rahul tomorrow at 5 PM regarding website update..."'
                      style={{
                        width: "100%",
                        minHeight: "70px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.85rem",
                        resize: "vertical"
                      }}
                    />
                    {liveTranscript && (
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                        Typing: {liveTranscript}...
                      </div>
                    )}
                  </div>

                  {voiceLanguage === "hindi" && translatedTranscript && (
                    <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#166534" }}>Translated (English):</div>
                      <div style={{ fontSize: "0.85rem", color: "#1e3a8a", marginTop: "2px" }}>
                        {translatedTranscript}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    {voiceState === "recording" ? (
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        🛑 Stop
                      </button>
                    ) : (
                      <button
                        ref={micButtonRef}
                        type="button"
                        onClick={startVoiceRecording}
                        style={{
                          background: "#4f46e5",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        {originalTranscript ? "Record Again" : "Start Recording"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleProcessTask}
                      disabled={!originalTranscript || !originalTranscript.trim()}
                      style={{
                        background: "#8b5cf6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: (!originalTranscript || !originalTranscript.trim()) ? "not-allowed" : "pointer",
                        opacity: (!originalTranscript || !originalTranscript.trim()) ? 0.5 : 1
                      }}
                    >
                      Proceed
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAllAction}
                      style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => closeModalCleanly(true)}
                      style={{ background: "#cbd5e1", color: "#475569", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", marginLeft: "auto" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 2: PROCESSING */}
            {modalView === "processing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", alignItems: "center", justifyContent: "center", minHeight: "150px" }}>
                <span className="listening-pulse" style={{ fontSize: "2rem" }}>🧠</span>
                <div style={{ fontWeight: "700", color: "#4f46e5" }}>Understanding your task details...</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
                  "{originalTranscript}"
                </div>
              </div>
            )}

            {/* STATE 3: REVIEW */}
            {modalView === "review" && (
              <div style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}>
                <div style={{ fontWeight: "700", color: "#334155", fontSize: "0.95rem" }}>
                  📋 Task Review
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
                  {[
                    { label: "Title", value: title },
                    { label: "Description", value: description },
                    { label: "Category", value: category },
                    { label: "Priority", value: priority },
                    { label: "Date", value: dueDate },
                    { label: "Time", value: dueTime },
                    { label: "Reminder", value: voiceExtractedData.reminder },
                    { label: "Person", value: voiceExtractedData.person },
                    { label: "Location", value: voiceExtractedData.location },
                    { label: "Tags", value: voiceExtractedData.tags && voiceExtractedData.tags.length > 0 ? voiceExtractedData.tags.join(", ") : null },
                    { label: "Recurrence", value: voiceExtractedData.recurrence },
                    { label: "Notes", value: voiceExtractedData.notes }
                  ]
                    .filter(f => f.value && (typeof f.value === "string" ? f.value.trim() !== "" : true))
                    .map((f, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                        <span style={{ fontWeight: "600", color: "#64748b" }}>{f.label}:</span>
                        <span style={{ color: "#0f172a" }}>{f.value}</span>
                      </div>
                    ))
                  }
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button
                    ref={reviewAddButtonRef}
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSaving}
                    style={{ background: "#10b981", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", flex: 1 }}
                  >
                    {isSaving ? "Saving..." : "Add Task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalView("edit");
                    }}
                    style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", flex: 1 }}
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalView("voice");
                      startVoiceRecording();
                    }}
                    style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Record Again
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllAction}
                    style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => closeModalCleanly(true)}
                    style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: EDIT (NORMAL FORM) */}
            {modalView === "edit" && (
              <>
                {originalTranscript && (
                  <details style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px", marginBottom: "14px" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "#4f46e5", fontWeight: "600" }}>
                      🎤 View Original Voice Transcript
                    </summary>
                    <div style={{ fontSize: "0.85rem", color: "#334155", marginTop: "8px", lineHeight: "1.4" }}>
                      <strong>Transcript:</strong> "{originalTranscript}"
                    </div>
                    {translatedTranscript && translatedTranscript !== originalTranscript && (
                      <div style={{ fontSize: "0.85rem", color: "#166534", marginTop: "6px", lineHeight: "1.4" }}>
                        <strong>Translated:</strong> "{translatedTranscript}"
                      </div>
                    )}
                  </details>
                )}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <label htmlFor="modal-task-title" style={{ display: "flex", alignItems: "center" }}>
                        Task Title
                        {filledFields.title && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setModalView("voice");
                          startVoiceRecording();
                        }}
                        className="secondary-button"
                        style={{ padding: "4px 10px", fontSize: "0.8rem", display: "flex", gap: "4px", alignItems: "center" }}
                      >
                        🎤 Voice Dictation Mode
                      </button>
                    </div>
                    <input
                      ref={titleInputRef}
                      type="text"
                      id="modal-task-title"
                      placeholder="What needs to be done?"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsTitleSuggested(false);
                        setCategoryChangeMsg("");
                      }}
                      className="form-input-styled"
                      required
                    />
                    {categoryChangeMsg && <p style={{ color: "#3b82f6", fontSize: "0.8rem", margin: "4px 0 0", fontStyle: "italic" }}>{categoryChangeMsg}</p>}

                    {/* Intelligent Task Title Suggestions */}
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, fontWeight: "600" }}>
                          Suggested titles based on the selected category
                        </p>
                      </div>
                      {!categoryName ? (
                        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "4px 0 0", fontStyle: "italic" }}>
                          Select a category to get suggestions.
                        </p>
                      ) : (
                        suggestions.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="suggestion-chip"
                                onClick={() => {
                                  setTitle(suggestion);
                                  setIsTitleSuggested(true);
                                  setCategoryChangeMsg("");
                                }}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Task Description Input field */}
                  <div className="form-group">
                    <label htmlFor="modal-task-desc" style={{ display: "flex", alignItems: "center" }}>
                      Description
                      {filledFields.description && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                    </label>
                    <textarea
                      ref={descInputRef}
                      id="modal-task-desc"
                      placeholder="Add task description here..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input-styled"
                      style={{ minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="modal-task-cat" style={{ display: "flex", alignItems: "center" }}>
                        Category
                        {filledFields.category && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                      </label>
                      {!isAddingCategory ? (
                        <select
                          ref={categorySelectRef}
                          id="modal-task-cat"
                          value={category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            if (title.trim() !== "") {
                              if (!isTitleSuggested) {
                                const confirmed = window.confirm("Changing the category will clear your current title. Do you want to continue?");
                                if (!confirmed) return;
                              }
                              setTitle("");
                              setIsTitleSuggested(false);
                              setCategoryChangeMsg("Category changed. Please select a title for the selected category.");
                            }

                            if (newCat === "Custom") {
                              setIsAddingCategory(true);
                            } else {
                              setCategory(newCat);
                            }
                          }}
                          className="form-input-styled"
                          style={{ width: "100%" }}
                        >
                          {allCategories.map(cat => (
                            <option key={`opt-${cat}`} value={cat}>{cat}</option>
                          ))}
                          <option value="Custom" style={{ fontWeight: 'bold' }}>+ Add New Category</option>
                        </select>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder="New category..."
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="form-input-styled"
                              style={{ flex: 1 }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => { setIsAddingCategory(false); setCustomCategory(""); setCategory("Work"); }}
                              style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold", flexShrink: 0 }}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            color: "#1e3a8a",
                            fontSize: "0.75rem",
                            lineHeight: "1.4",
                            marginTop: "4px"
                          }}>
                            <span style={{ fontSize: "0.95rem", lineHeight: "1", flexShrink: 0 }}>ℹ️</span>
                            <span>Once you create this category, it will be saved and automatically appear in the category list the next time you add a task.</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="modal-task-priority" style={{ display: "flex", alignItems: "center" }}>
                        Priority
                        {filledFields.priority && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                      </label>
                      <select
                        ref={prioritySelectRef}
                        id="modal-task-priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="form-input-styled"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="modal-task-date" style={{ display: "flex", alignItems: "center" }}>
                        Due Date
                        {filledFields.dueDate && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                      </label>
                      <input
                        ref={dateInputRef}
                        type="date"
                        id="modal-task-date"
                        value={dueDate}
                        min={todayStr}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          setDueDate(selectedDate);
                          if (selectedDate === todayStr) {
                            const nowTime = format(new Date(), "HH:mm");
                            if (dueTime < nowTime) {
                              setTimeError("You can't select a previous time for today.");
                            } else {
                              setTimeError("");
                            }
                          } else {
                            setTimeError("");
                          }
                        }}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (err) {
                            // ignore if browser doesn't support or blocks it
                          }
                        }}
                        className="form-input-styled"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="modal-task-time" style={{ display: "flex", alignItems: "center" }}>
                        Due Time
                        {filledFields.dueTime && <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: "600", marginLeft: "6px" }}>✨ Detected from voice</span>}
                      </label>
                      <input
                        ref={timeInputRef}
                        type="time"
                        id="modal-task-time"
                        value={dueTime}
                        min={dueDate === todayStr ? currentTimeStr : undefined}
                        onChange={(e) => {
                          const selectedTime = e.target.value;
                          setIsTimeManuallySet(true);
                          if (dueDate === todayStr) {
                            const nowTime = format(new Date(), "HH:mm");
                            if (selectedTime < nowTime) {
                              setTimeError("You can't select a previous time for today.");
                              setDueTime(selectedTime);
                              return;
                            }
                          }
                          setTimeError("");
                          setDueTime(selectedTime);
                        }}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (err) {
                            // ignore
                          }
                        }}
                        className="form-input-styled"
                        required
                      />
                      {timeError && (
                        <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "4px" }}>
                          {timeError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtask Section */}
                  <div style={{ borderTop: "1px solid #eee", paddingTop: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer", color: "#1e293b" }}>
                        <input
                          type="checkbox"
                          checked={isLargeTask}
                          onChange={(e) => setIsLargeTask(e.target.checked)}
                          style={{ width: "18px", height: "18px", accentColor: "#4f46e5", cursor: "pointer" }}
                        />
                        Enable Subtasks
                      </label>
                      {isLargeTask && (
                        <button
                          type="button"
                          onClick={handleAIBreakdown}
                          disabled={loadingAI}
                          style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "10px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                        >
                          {loadingAI ? "⏳ Processing..." : "✨ Auto-Generate with AI"}
                        </button>
                      )}
                    </div>

                    {isLargeTask && (
                      <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>

                        {/* Manual Subtask Input */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Add subtask manually..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            className="form-input-styled"
                            style={{ padding: "12px 16px", flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={addSubtaskItem}
                            style={{ border: "none", background: "#4f46e5", color: "white", padding: "0 20px", borderRadius: "12px", fontSize: "1.25rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" }}
                          >
                            +
                          </button>
                        </div>

                        {/* Subtasks List */}
                        {subtasksList.length > 0 && (
                          <ul style={{ padding: "0", margin: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {subtasksList.map((sub) => (
                              <li key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>{sub.title}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSubtaskItem(sub.id)}
                                  style={{ border: "none", background: "#fee2e2", color: "#ef4444", padding: "4px 8px", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="btn-group" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "16px" }}>
                    <button type="button" className="secondary-button" onClick={handleClearAllAction}>Clear All</button>
                    <button type="button" className="secondary-button" onClick={() => closeModalCleanly(true)}>Cancel</button>
                    <button type="submit" className="primary-btn" style={{ color: "black", fontWeight: "bold", opacity: timeError ? 0.5 : 1 }} disabled={!!timeError}>
                      {editTaskId ? "Save Changes" : "Create Task"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskPage;