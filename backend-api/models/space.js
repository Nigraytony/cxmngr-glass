const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: false,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: { type: String, 
    enum: ['Area', 'Building', 'Campus', 'Corridor', 'Floor', 'Level', 'Room' ], 
    default: 'Room' 
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  parentSpace: {
    type: String,
    ref: 'Space',
    required: false
  },
  subSpaces: [{ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Space' }],
  equipment: [{ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Equipment' }],
  // Free-form attributes for a space (key/value pairs)
  attributes: [
    {
      key: { type: String, required: false, trim: true },
      value: { type: String, required: false, trim: true }
    }
  ],
  attachments: { type: [String], required: false },
  settings: {type: String, required: false},
  notes: { type: String, required: false },
  tags: { type: [String], default: [] },
  metaData: { type: String, required: false },
  // Space-level audit logs (flexible schema)
  logs: [{ type: mongoose.Schema.Types.Mixed, default: [] }],
  createdAt: { type: Date, default: Date.now, required: false},
  updatedAt: { type: Date, default: Date.now, required: false },
});

// Keep updatedAt current
spaceSchema.pre('save', function (next) {
  try { this.updatedAt = new Date() } catch (e) { /* ignore */ }
  next()
})

spaceSchema.index({ project: 1 })
spaceSchema.index({ project: 1, updatedAt: -1 })
spaceSchema.index({ project: 1, tag: 1 })
spaceSchema.index({ project: 1, parentSpace: 1 })

// Method to find subSpaces by parentSpace ID
spaceSchema.statics.findSubSpaces = async function (parentSpaceId) {
  return this.find({ parentSpace: parentSpaceId }).select('_id tag title type description');
};

const Space = mongoose.model('Space', spaceSchema);

module.exports = Space;
