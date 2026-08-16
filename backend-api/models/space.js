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
    // Superset of the values the Spaces UI offers, so a valid UI selection never
    // 400s on save. Keep this list in sync with `spaceTypes` in the frontend.
    enum: ['Area', 'Building', 'Campus', 'Corridor', 'Floor', 'Level', 'Roof', 'Room'],
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

// Deepest ancestor chain we will walk before declaring the data unusable. The UI
// renders breadcrumbs from these chains and caps at 20, so anything past this is
// already broken; refusing the write is safer than persisting it.
const MAX_SPACE_DEPTH = 50;

// Would re-parenting `spaceId` under `newParentId` make the space its own ancestor?
// Walks up from the proposed parent looking for the space itself. Cheap in practice
// (chains are a handful of levels) and defensive against pre-existing bad data:
// a loop or an absurd depth upstream is reported as a cycle rather than followed.
spaceSchema.statics.wouldCreateCycle = async function (spaceId, newParentId) {
  const self = String(spaceId || '').trim();
  let cursor = String(newParentId || '').trim();
  // Moving to the root can never create a cycle.
  if (!self || !cursor) return false;

  const seen = new Set();
  let depth = 0;
  while (cursor) {
    if (cursor === self) return true;
    if (seen.has(cursor)) return true; // existing loop upstream — don't extend it
    if (depth++ >= MAX_SPACE_DEPTH) return true;
    seen.add(cursor);
    if (!mongoose.Types.ObjectId.isValid(cursor)) return false;
    // eslint-disable-next-line no-await-in-loop
    const node = await this.findById(cursor).select('parentSpace').lean();
    if (!node) return false; // dangling parent ref: no chain to close a loop through
    cursor = String(node.parentSpace || '').trim();
  }
  return false;
};

const Space = mongoose.model('Space', spaceSchema);

module.exports = Space;
