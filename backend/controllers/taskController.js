const Task = require("../models/Task");
const { startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require("date-fns");

// Helper to format task object for frontend compatibility
const formatTask = (taskDoc) => {
  if (!taskDoc) return null;
  const obj = taskDoc.toObject ? taskDoc.toObject() : { ...taskDoc };
  obj.id = obj._id.toString();
  if (obj.dueDate) {
    try {
      const d = new Date(obj.dueDate);
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        obj.dueDate = `${year}-${month}-${day}`;
      }
    } catch (e) { }
  }
  if (obj.completedAt) {
    try {
      const d = new Date(obj.completedAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        obj.completedDate = `${year}-${month}-${day}`;
      }
    } catch (e) { }
  }
  return obj;
};

const updateTaskStatuses = async (userId) => {
  console.log("===== GET update API CALLED =====");
  const tasks = await Task.find({
    user: userId,
    completed: { $ne: true },
  });

  const now = new Date();
  console.log("NOW:", now);

  for (const task of tasks) {
    if (task.completed || task.status === "Completed") continue;

    if (!task.dueDate) continue;

    const due = new Date(task.dueDate);

    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      due.setHours(Number(hours), Number(minutes), 0, 0);
    } else {
      due.setHours(23, 59, 59, 999);
    }
    console.log({
      title: task.title,
      due,
      now,
      dueLessThanNow: due < now
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    let status;

    if (due < now) {
      status = "Overdue";
    } else if (due >= todayStart && due < tomorrowStart) {
      status = "Pending";
    } else {
      status = "Incoming";
    }

    if (task.status !== status) {
      task.status = status;
      await task.save();
    }
  }
};

// Create Task
const createTask = async (req, res) => {
  try {
    let status = "Pending";

    if (req.body.dueDate) {
      const now = new Date();
      const due = new Date(req.body.dueDate);
      if (req.body.dueTime) {
        const [hours, minutes] = req.body.dueTime.split(":");
        due.setHours(Number(hours), Number(minutes), 0, 0);
      } else {
        due.setHours(23, 59, 59, 999);
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1);

      if (due < now) {
        status = "Overdue";
      } else if (due >= todayStart && due < tomorrowStart) {
        status = "Pending";
      } else {
        status = "Incoming";
      }
    }

    const task = await Task.create({
      ...req.body,
      status,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Task Created Successfully",
      task: formatTask(task),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getTasks = async (req, res) => {
  try {
    console.log("===== GET TASKS API CALLED =====");
    console.log("===== GET TASKS API CALLED =====");
    console.log("USER ID:", req.user.id);
    await updateTaskStatuses(req.user.id);

    const tasks = await Task.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks: tasks.map(formatTask),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const formatDisplayDate = (dStr) => {
  if (!dStr) return "";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dStr;
  }
};

const formatDisplayTime = (tStr) => {
  if (!tStr) return "";
  try {
    const parts = tStr.split(":");
    if (parts.length < 2) return tStr;
    const hourNum = parseInt(parts[0], 10);
    const minStr = parts[1];
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const formattedHour = String(hourNum % 12 || 12).padStart(2, '0');
    return `${formattedHour}:${minStr} ${ampm}`;
  } catch (e) {
    return tStr;
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task Not Found",
      });
    }

    const changeList = [];

    if (req.body.title !== undefined && req.body.title !== task.title) {
      changeList.push(`Title changed from "${task.title}" to "${req.body.title}"`);
    }

    if (req.body.priority !== undefined && req.body.priority !== task.priority) {
      changeList.push(`Priority changed from ${task.priority} → ${req.body.priority}`);
    }

    if (req.body.dueDate !== undefined) {
      const oldDue = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "";
      const newDue = req.body.dueDate;
      if (oldDue !== newDue) {
        changeList.push(`Due Date changed from ${formatDisplayDate(oldDue)} → ${formatDisplayDate(newDue)}`);
      }
    }

    if (req.body.dueTime !== undefined && req.body.dueTime !== task.dueTime) {
      if (task.dueTime || req.body.dueTime) {
        changeList.push(`Due Time changed from ${formatDisplayTime(task.dueTime || "None")} → ${formatDisplayTime(req.body.dueTime || "None")}`);
      }
    }

    if (req.body.category !== undefined && req.body.category !== task.category) {
      changeList.push(`Category changed from ${task.category || "General"} → ${req.body.category}`);
    }

    if (req.body.description !== undefined && req.body.description !== task.description) {
      changeList.push(`Description updated`);
    }

    if (changeList.length > 0) {
      task.updateHistory.push({
        changes: changeList,
        updatedAt: new Date(),
      });
    }

    Object.assign(task, req.body);
    if (!task.completed && task.status !== "Completed") {
      const now = new Date();
      const due = new Date(task.dueDate);

      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(":");
        due.setHours(Number(hours), Number(minutes), 0, 0);
      } else {
        due.setHours(23, 59, 59, 999);
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1);

      if (due < now) {
        task.status = "Overdue";
      } else if (due >= todayStart && due < tomorrowStart) {
        task.status = "Pending";
      } else {
        task.status = "Incoming";
      }
    }

    await task.save();

    res.json({
      success: true,
      message: "Task Updated",
      task: formatTask(task),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const rescheduleTask = async (req, res) => {
  try {
    const { newDate, reason } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task Not Found",
      });
    }

    task.rescheduleHistory.push({
      oldDate: task.dueDate,
      newDate,
      reason,
      rescheduledAt: new Date(),
    });

    task.dueDate = newDate;
    const now = new Date();
    const due = new Date(newDate);

    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      due.setHours(Number(hours), Number(minutes), 0, 0);
    } else {
      due.setHours(23, 59, 59, 999);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    if (due < now) {
      task.status = "Overdue";
    } else if (due >= todayStart && due < tomorrowStart) {
      task.status = "Pending";
    } else {
      task.status = "Incoming";
    }

    await task.save();

    res.json({
      success: true,
      message: "Task Rescheduled",
      task: formatTask(task),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task Not Found",
      });
    }

    task.completed = true;
    task.status = "Completed";
    task.completedAt = new Date();

    await task.save();

    res.json({
      success: true,
      message: "Task Completed",
      task: formatTask(task),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task Not Found",
      });
    }

    res.json({
      success: true,
      message: "Task Deleted Successfully",
      id: req.params.id,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const filterTasks = async (req, res) => {
  try {
    await updateTaskStatuses(req.user.id);

    const {
      search,
      status,
      priority,
      category,
      quickFilter,
      customDate,
      sortBy,
    } = req.query;

    let filter = {
      user: req.user.id,
    };
    console.log("Logged User ID:", req.user.id);

    const allTasks = await Task.find();

    console.log("All DB Tasks:", allTasks.length);

    console.log(
      "User Tasks:",
      allTasks.filter(
        task => task.user?.toString() === req.user.id.toString()
      ).length
    );
    // Search
    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    // Status
    if (status && status !== "All") {
      if (status === "Completed") {
        filter.completed = true;
      } else if (status === "Pending") {
        filter.status = { $in: ["Pending", "Overdue"] };
      } else if (status === "Incoming") {
        filter.status = "Incoming";
      } else if (status === "Overdue") {
        filter.status = "Overdue";
      }
    }

    // Priority
    if (priority && priority !== "All") {
      filter.priority = priority;
    }

    // Category
    if (category && category !== "All") {
      filter.category = category;
    }

    // Date Filters
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (quickFilter) {
      case "Today": {
        const tomorrow = new Date(today.getTime() + 86400000);
        filter.$or = [
          {
            dueDate: {
              $gte: today,
              $lt: tomorrow,
            },
          },
          {
            dueDate: { $lt: today },
            status: { $ne: "Completed" },
          },
          {
            completedAt: {
              $gte: today,
              $lt: tomorrow,
            },
          },
        ];
        break;
      }

      case "Yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        filter.dueDate = {
          $gte: yesterday,
          $lt: new Date(yesterday.getTime() + 86400000),
        };
        break;

      case "Tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        filter.dueDate = {
          $gte: tomorrow,
          $lt: new Date(tomorrow.getTime() + 86400000),
        };
        break;

      case "This Week":
        filter.dueDate = {
          $gte: startOfWeek(new Date()),
          $lte: endOfWeek(new Date()),
        };
        break;

      case "This Month":
        filter.dueDate = {
          $gte: startOfMonth(new Date()),
          $lte: endOfMonth(new Date()),
        };
        break;

      case "Custom Date":
        if (customDate) {
          const d = new Date(customDate);
          d.setHours(0, 0, 0, 0);

          filter.dueDate = {
            $gte: d,
            $lt: new Date(d.getTime() + 86400000),
          };
        }
        break;

      default:
        break;
    }

    // Sorting
    let sort = {
      createdAt: -1,
    };

    switch (sortBy) {
      case "Newest":
        sort = { createdAt: -1 };
        break;

      case "Oldest":
        sort = { createdAt: 1 };
        break;

      case "Due Time":
        sort = {
          dueDate: 1,
          dueTime: 1,
        };
        break;

      case "Alphabetical":
        sort = {
          title: 1,
        };
        break;

      case "Priority":
        sort = {
          priority: -1,
        };
        break;

      default:
        sort = {
          createdAt: -1,
        };
    }

    const tasks = await Task.find(filter).sort(sort);

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(formatTask),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    await updateTaskStatuses(req.user.id);

    const tasks = await Task.find({
      user: req.user.id,
    });

    res.status(200).json({
      success: true,
      tasks: tasks.map(formatTask),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  rescheduleTask,
  completeTask,
  deleteTask,
  filterTasks,
  getAnalytics,
};
