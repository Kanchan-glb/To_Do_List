const express = require("express");
const protect = require("../middleware/authmiddleware");

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

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task Management APIs
 */

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post("/", protect, createTask);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get("/", protect, getTasks);

/**
 * @swagger
 * /api/tasks/filter:
 *   get:
 *     summary: Filter tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filtered tasks
 */
router.get("/filter", protect, filterTasks);

/**
 * @swagger
 * /api/tasks/analytics:
 *   get:
 *     summary: Get task analytics
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get("/analytics", protect, getAnalytics);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.put("/:id", protect, updateTask);

/**
 * @swagger
 * /api/tasks/{id}/reschedule:
 *   put:
 *     summary: Reschedule task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task rescheduled
 */
router.put("/:id/reschedule", protect, rescheduleTask);

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   put:
 *     summary: Mark task as completed
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task completed
 */
router.put("/:id/complete", protect, completeTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete("/:id", protect, deleteTask);

module.exports = router;