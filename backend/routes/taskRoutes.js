const express = require("express");

const router = express.Router();

const {
  createTask,
  getTasks,
  updateTask,
  rescheduleTask,
  completeTask,
} = require("../controllers/taskController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createTask);

router.get("/", protect, getTasks);

router.put("/:id", protect, updateTask);

router.put("/:id/reschedule", protect, rescheduleTask);

router.put("/:id/complete", protect, completeTask);

module.exports = router;