const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    title: { type: String, required: false },
    value: { type: String, required: false },
    unit: { type: String, required: false },
    dateCompleted: { type: Date, required: false },
    notes: { type: String, required: false }
  });

  const questionSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    question: { type: String, required: false },
    answer: { type: String, required: false },
    cxreview: { type: String, required: false },
    completed: { type: Boolean, required: true, default: false },
    notes: { type: String, required: false }
  });

  const fptQuestionSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    title: { type: String, required: false },
    question: { type: String, required: false },
    expectedAnswer: { type: String, required: false },
    answer: { type: String, required: false },
    pass: { type: Boolean, required: false },
    completed: { type: Boolean, required: false, default: false },
    notes: { type: String, required: false }
  });

  const fptSectionSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    title: { type: String, required: false },
    sequence: { type: String, required: false },
    completed: { type: Boolean, required: false, default: false },
    fptQuestions: [ fptQuestionSchema ],
    notes: { type: String, required: false }
  });

  const checklistSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    title: { type: String, required: false },
    type: { type: String, required: false },
    discipline: { type: String, required: false },
    description: { type: String, required: false },
    system: { type: String, required: false },
    responsible: { type: String, required: false },
    status: { type: String, enum: ['Started', 'Progress', 'Completed', 'Cancelled', 'Not Started'], default: 'Not Started' },
    questions: [questionSchema],
    completed: { type: Boolean, required: false, default: false },
    completedDate: { type: Date, required: false },
    completedBy: { type: String, required: false },
    notes: { type: String, required: false },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }]
  });

  const functionalTestSchema = new mongoose.Schema({
    number: { type: Number, required: false },
    title: { type: String, required: false },
    type: { type: String, required: false },
    system: { type: String, required: false },
    description: { type: String, required: false },
    participants: { type: String, required: false },
    status: { type: String, enum: ['Started', 'Progress', 'Completed', 'Cancelled', 'Not Started'], default: 'Not Started' },
    fptSections: [fptSectionSchema],
    completed: { type: Boolean, required: false, default: false },
    notes: { type: String, required: false },
    images: { type: String, required: false },
    attachments: { type: String, required: false },
    history: { type: String, required: false },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  });

const templateSchema = new mongoose.Schema({
    number: { type: String, required: false },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    system: { type: String, required: false },
    responsible: { type: String, required: false },
    status: { type: String, enum: ['Ordered', 'Shipped', 'In Storage', 'Installed', 'Tested', 'Operational', 'Not Started'], default: 'Not Started' },
    attributes: [attributeSchema],
    description: { type: String, required: false },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: false },
    orderDate: { type: Date, required: false },
    installationDate: { type: Date, required: false },
    balanceDate: { type: Date, required: false },
    testDate: { type: Date, required: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    checklists: [checklistSchema],
    functionalTests: [functionalTestSchema],
    images: { type: String, required: false },
    attachments: { type: String, required: false },
    history: { type: String, required: false },
    labels: { type: String, required: false },
    metadata: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;