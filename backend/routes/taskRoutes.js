const express = require("express");

const router = express.Router();

const {
  createTask,
  getTasks,
  updateTask,
  rescheduleTask,
  completeTask,
  deleteTask,
  filterTasks,
  getAnalytics,
} = require("../controllers/taskController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createTask);
router.get("/", protect, getTasks);
router.get("/filter", protect, filterTasks);
router.get("/analytics", protect, getAnalytics);

router.put("/:id", protect, updateTask);
router.put("/:id/reschedule", protect, rescheduleTask);
router.put("/:id/complete", protect, completeTask);
router.delete("/:id", protect, deleteTask);

module.exports = router;