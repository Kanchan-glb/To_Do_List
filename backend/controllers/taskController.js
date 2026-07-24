const Task = require("../models/Task");

// Create Task
const createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Task Created Successfully",
      task,
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
    const tasks = await Task.find({
      user: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
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
        message: "Task Not Found",
      });
    }

    // history
    task.updateHistory.push({
      changes: "Task Updated",
      updatedAt: new Date(),
    });

    Object.assign(task, req.body);

    await task.save();

    res.json({
      success: true,
      message: "Task Updated",
      task,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
const rescheduleTask = async (req, res) => {

  const { newDate, reason } = req.body;

  const task = await Task.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!task) {
    return res.status(404).json({
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

  await task.save();

  res.json({
    success: true,
    task,
  });

};
const completeTask = async (req, res) => {

  const task = await Task.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!task)
    return res.status(404).json({
      message: "Task Not Found",
    });

  task.status = "Completed";
  task.completedAt = new Date();

  await task.save();

  res.json(task);

};
module.exports = {
  createTask,
  getTasks,
  updateTask,
  rescheduleTask,
  completeTask,
};