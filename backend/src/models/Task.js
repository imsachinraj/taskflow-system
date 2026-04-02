const mongoose = require('mongoose');

const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Task must belong to a team'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 30,
      },
    ],
    // Subtasks (stored as embedded documents for performance)
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // For ordering within a status column (Kanban)
    order: {
      type: Number,
      default: 0,
    },
    // Story points for sprint planning
    storyPoints: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Track status history for analytics
    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ team: 1, createdAt: -1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ title: 'text', description: 'text' }); // Full-text search

// ─── Virtuals ───────────────────────────────────────────────────────────────
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === TASK_STATUS.DONE) return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual('subtaskProgress').get(function () {
  if (!this.subtasks || this.subtasks.length === 0) return null;
  const completed = this.subtasks.filter((s) => s.isCompleted).length;
  return {
    completed,
    total: this.subtasks.length,
    percentage: Math.round((completed / this.subtasks.length) * 100),
  };
});

// ─── Pre-save Hooks ──────────────────────────────────────────────────────────
taskSchema.pre('save', function (next) {
  // Track when task is completed
  if (this.isModified('status') && this.status === TASK_STATUS.DONE) {
    this.completedAt = new Date();
  }
  if (this.isModified('status') && this.status !== TASK_STATUS.DONE) {
    this.completedAt = null;
  }
  next();
});

taskSchema.statics.TASK_STATUS = TASK_STATUS;
taskSchema.statics.TASK_PRIORITY = TASK_PRIORITY;

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
