const mongoose = require("mongoose");

const subTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "General",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Incoming",
        "Completed",
        "Overdue",
      ],
      default: "Pending",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    dueTime: {
      type: String,
      default: "",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================
    // Subtasks
    // ==========================
    subtasks: [subTaskSchema],

    // ==========================
    // Update History
    // ==========================
    updateHistory: [
      {
        changes: {
          type: mongoose.Schema.Types.Mixed,
        },

        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================
    // Reschedule History
    // ==========================
    rescheduleHistory: [
      {
        oldDate: Date,

        newDate: Date,

        reason: {
          type: String,
          default: "",
        },

        rescheduledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Task", taskSchema);