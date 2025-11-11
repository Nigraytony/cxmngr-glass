const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    number: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    complete: Boolean,
    status: { type: String, enum: ['Not Started','Pending', 'In Progress', 'Completed'], default: 'Not Started' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: Date.now },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
});

// Keep updatedAt in sync and add index for project queries
taskSchema.pre('save', function (next) {
    try { if (!this.startDate) this.startDate = new Date(); if (!this.endDate) this.endDate = new Date(); } catch (e) { /* ignore */ }
    next()
})

taskSchema.index({ projectId: 1 })

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;