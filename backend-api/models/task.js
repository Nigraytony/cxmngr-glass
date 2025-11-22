const mongoose = require('mongoose');

// Task schema aligned with the requested JSON shape.
const taskSchema = new mongoose.Schema({
    taskId: { type: String, index: true }, // human-friendly id like T-100
    wbs: { type: String, default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    notes: { type: String, default: '' },
    start: { type: Date },
    end: { type: Date },
    duration: { type: Number },
    percentComplete: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['Not Started','Pending','In Progress','Completed','Deleted'], default: 'Not Started' },
    cost: { type: Number, default: 0 },
    parentId: { type: String, default: null },
    dependencies: { type: [String], default: [] },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: { type: [String], default: [] },
    activityId: { type: String, default: null },
    deleted: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure sensible defaults for dates on save
taskSchema.pre('save', function (next) {
    try {
        if (!this.start && this.createdAt) this.start = this.createdAt;
        if (!this.end && this.start) this.end = this.start;
    } catch (e) { /* ignore */ }
    next();
});

taskSchema.index({ projectId: 1 });
taskSchema.index({ taskId: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;