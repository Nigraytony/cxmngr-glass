const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    number: { type: String, required: false },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    system: { type: String, required: false },
    responsible: { type: String, required: false },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: false },
    status: { type: String, 
        enum: ['Ordered', 'Shipped', 'In Storage', 'Installed', 'Tested', 'Operational', 'Not Started'], 
        default: 'Not Started' 
    },
    attributes: { type: String , required: false },
    description: { type: String, required: false },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: false },
    orderDate: { type: Date, required: false },
    installationDate: { type: Date, required: false },
    balanceDate: { type: Date, required: false },
    testDate: { type: Date, required: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    checklists: { type: String, required: false },
    functionalTests: { type: String, required: false },
    images: { type: String, required: false },
    attachments: { type: String, required: false },
    history: { type: String, required: false },
    labels: { type: String, required: false },
    metadata: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Equipment = mongoose.model('Equipment', equipmentSchema);

module.exports = Equipment;