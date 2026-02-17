const mongoose = require('mongoose')

const OprLinkEvaluationSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    oprItemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'OprItem' },

    // Context: the parent entity the user was working in (equipment/system/issue/etc)
    contextType: {
      type: String,
      required: true,
      enum: ['issue', 'equipment', 'system', 'activity', 'task', 'template'],
      index: true,
    },
    contextId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contextLabel: { type: String, default: '' },

    // Target: the specific thing the OPR item was addressed by
    // Issues have a real ObjectId targetId; checklist questions often do not, so we support targetKey.
    targetType: {
      type: String,
      required: true,
      enum: ['issue', 'checklist_question', 'functional_test', 'functional_test_step', 'note'],
      index: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    targetKey: { type: String, default: '' },
    targetLabel: { type: String, default: '' },

    status: {
      type: String,
      required: true,
      enum: ['unverified', 'pass', 'fail', 'na'],
      default: 'unverified',
      index: true,
    },
    notes: { type: String, default: '' },
    evidenceUrl: { type: String, default: '' },

    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    evaluatedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
)

OprLinkEvaluationSchema.index(
  {
    orgId: 1,
    projectId: 1,
    oprItemId: 1,
    contextType: 1,
    contextId: 1,
    targetType: 1,
    targetId: 1,
    targetKey: 1,
  },
  { unique: true, name: 'uniq_opr_link_eval' }
)

module.exports = mongoose.model('OprLinkEvaluation', OprLinkEvaluationSchema)
