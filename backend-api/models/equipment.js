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
    attributes: {
        type: [ { key: { type: String, required: true }, value: { type: String, default: '' } } ],
        default: [],
    },
    description: { type: String, required: false },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: false },
    orderDate: { type: Date, required: false },
    installationDate: { type: Date, required: false },
    balanceDate: { type: Date, required: false },
    testDate: { type: Date, required: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    // Store checklists as structured JSON (array of sections)
    checklists: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Functional Performance Tests (array of test steps/records)
    functionalTests: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Signatures captured for FPT (stored as array of objects: { title, person, block, date })
    fptSignatures: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Components (array of sub-equipment items)
    components: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // photos stored in DB as base64 strings (small images)
    photos: [{ filename: String, data: String, contentType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedByName: String, uploadedByAvatar: String, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
    images: { type: String, required: false },
    // other attachments (documents) stored as external URLs or metadata
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    history: { type: String, required: false },
    labels: { type: String, required: false },
    metadata: { type: String, required: false },
    // Equipment-level audit logs (flexible schema)
    logs: [{ type: mongoose.Schema.Types.Mixed, default: [] }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

    // Keep updatedAt fresh; normalize tag and trim title
    equipmentSchema.pre('save', function (next) {
        try {
            if (this.tag && typeof this.tag === 'string') this.tag = String(this.tag).trim()
            if (this.title && typeof this.title === 'string') this.title = String(this.title).trim()
            this.updatedAt = new Date()
        } catch (e) { /* ignore */ }
        next()
    })

    equipmentSchema.index({ projectId: 1 })
    equipmentSchema.index({ tag: 1 })

const Equipment = mongoose.model('Equipment', equipmentSchema);

module.exports = Equipment;