/**
 * CXMA Agent — tool definitions and executor
 *
 * Each tool is defined once in a provider-agnostic schema.
 * getClaudeTools() and getOpenAiTools() convert to provider format.
 * getGeminiTools() converts to Gemini functionDeclarations format.
 * executeTool() runs the actual CRUD operation against MongoDB.
 *
 * All operations are scoped to the projectId from context — cross-project
 * access is structurally impossible here.
 */

const Task = require('../models/task')
const Activity = require('../models/activity')
const Equipment = require('../models/equipment')
const Issue = require('../models/issue')
const Space = require('../models/space')
const Template = require('../models/template')
const System = require('../models/system')

function isObjectId(v) {
  return /^[a-f\d]{24}$/i.test(String(v || ''))
}

function str(v, max) {
  return String(v || '').slice(0, max)
}

// Generate a short random key for table columns (matches the UI's _colKey shape).
function colKey() { return 'c' + Math.random().toString(36).slice(2, 8) }

// Default column preset — used when an agent creates a standard/Points test
// without specifying columns. Mirrors the UI's "Points Verification" preset.
const DEFAULT_POINTS_COLUMNS = ['System Point', 'BAS', 'Field', 'Offset', 'Pass']

// Normalize an agent-provided functional test into the shape FunctionalTestsPanel expects.
// Supports both kind='sequence' (step/expected/actual rows) and kind='standard'
// (Points/Tabular with columns[] + tableRows[]).
function normalizeFunctionalTest(t, index) {
  const raw = (t && typeof t === 'object') ? t : {}
  const rawRows = Array.isArray(raw.rows) ? raw.rows : []
  const rawCols = Array.isArray(raw.columns) ? raw.columns
    : (raw.table && Array.isArray(raw.table.columns) ? raw.table.columns : null)
  const rawTableRows = Array.isArray(raw.tableRows) ? raw.tableRows
    : (raw.table && Array.isArray(raw.table.rows) ? raw.table.rows : null)

  // Infer kind when not set: rows with step/expected → sequence; columns or tableRows → standard.
  let kind = (raw.kind === 'standard' || raw.kind === 'sequence') ? raw.kind : null
  if (!kind) {
    if (rawCols || rawTableRows) kind = 'standard'
    else if (rawRows.some((r) => r && (r.step || r.expected))) kind = 'sequence'
    else kind = 'sequence'
  }

  const base = {
    number: raw.number != null ? raw.number : (index + 1),
    name: str(raw.name, 200),
    description: str(raw.description, 2000),
    notes: str(raw.notes, 2000),
    pass: typeof raw.pass === 'boolean' ? raw.pass : null,
    issues: [],
    kind,
  }

  if (kind === 'sequence') {
    return {
      ...base,
      rows: rawRows.length ? rawRows.map((r) => ({
        step: str(r && r.step, 500),
        expected: str(r && r.expected, 500),
        actual: str(r && r.actual, 500),
        pass: typeof (r && r.pass) === 'boolean' ? r.pass : null,
        notes: str(r && r.notes, 500),
      })) : [{ step: '', expected: '', actual: '', pass: null, notes: '' }],
    }
  }

  // kind === 'standard' (Points / Tabular)
  const colNames = (rawCols && rawCols.length)
    ? rawCols.slice(0, 12).map((c, i) => {
        if (typeof c === 'string') return c.trim() || `Column ${i + 1}`
        return str((c && c.name) || `Column ${i + 1}`, 100)
      })
    : DEFAULT_POINTS_COLUMNS.slice()
  const columns = colNames.map((name) => ({ key: colKey(), name }))
  const nameToKey = {}
  for (const c of columns) nameToKey[c.name.toLowerCase()] = c.key
  const srcRows = rawTableRows || []
  const rows = srcRows.map((r) => {
    const row = {}
    for (const c of columns) row[c.key] = ''
    if (r && typeof r === 'object') {
      for (const [k, v] of Object.entries(r)) {
        const key = nameToKey[String(k).toLowerCase()]
        if (key) row[key] = str(v, 500)
      }
    }
    return row
  })
  if (!rows.length) {
    const blank = {}
    for (const c of columns) blank[c.key] = ''
    rows.push(blank)
  }
  return { ...base, rows: [], table: { columns, rows } }
}

function normalizeFunctionalTests(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map((t, i) => normalizeFunctionalTest(t, i))
}

// ---------------------------------------------------------------------------
// Tool definitions (provider-agnostic)
// ---------------------------------------------------------------------------

const TOOLS = [
  // ── PROJECT OVERVIEW ───────────────────────────────────────────────────
  {
    name: 'get_project_summary',
    description: 'Get counts of all record types in the current project (spaces, systems, templates, equipment, tasks, activities, issues). Useful before a big build to see what already exists.',
    properties: {},
    required: [],
  },

  // ── TASKS ──────────────────────────────────────────────────────────────
  {
    name: 'list_tasks',
    description: 'List tasks for the current project. Returns id, name, status, wbs, start, and end for each task.',
    properties: {
      status: { type: 'string', description: 'Filter by status: Not Started, Pending, In Progress, Completed' },
      search: { type: 'string', description: 'Search by task name (partial match)' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_task',
    description: 'Create a new task in the current project.',
    properties: {
      name: { type: 'string', description: 'Task name (required)' },
      description: { type: 'string', description: 'Task description' },
      status: { type: 'string', description: 'Status: Not Started, Pending, In Progress, Completed. Defaults to Not Started.' },
      wbs: { type: 'string', description: 'WBS code (e.g., 1.1, 2.3.1)' },
      start: { type: 'string', description: 'Start date in ISO 8601 format (e.g., 2026-04-20)' },
      end: { type: 'string', description: 'Due/end date in ISO 8601 format' },
    },
    required: ['name'],
  },
  {
    name: 'update_task',
    description: 'Update an existing task by its ID.',
    properties: {
      id: { type: 'string', description: 'Task _id (required)' },
      name: { type: 'string', description: 'New name' },
      description: { type: 'string', description: 'New description' },
      status: { type: 'string', description: 'New status: Not Started, Pending, In Progress, Completed' },
      wbs: { type: 'string', description: 'New WBS code' },
      start: { type: 'string', description: 'New start date (ISO 8601)' },
      end: { type: 'string', description: 'New due/end date (ISO 8601)' },
    },
    required: ['id'],
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Task _id (required)' },
    },
    required: ['id'],
  },

  // ── ACTIVITIES ─────────────────────────────────────────────────────────
  {
    name: 'list_activities',
    description: 'List activities for the current project.',
    properties: {
      type: { type: 'string', description: 'Filter by activity type (e.g., OPR, Pre-Design, Design Review, Site Visit)' },
      status: { type: 'string', description: 'Filter by status' },
      search: { type: 'string', description: 'Search by name (partial match)' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_activity',
    description: 'Create a new activity (meeting, site visit, workshop, etc.) in the current project.',
    properties: {
      name: { type: 'string', description: 'Activity name (required)' },
      type: { type: 'string', description: 'Activity type (e.g., OPR, Pre-Design, Design Review, Submittal Review, Site Visit, Prefunctional, Functional)' },
      status: { type: 'string', description: 'Status: Not Started, In Progress, Complete, Cancelled. Defaults to Not Started.' },
      startDate: { type: 'string', description: 'Start date (ISO 8601)' },
      endDate: { type: 'string', description: 'End date (ISO 8601)' },
      location: { type: 'string', description: 'Location or venue' },
    },
    required: ['name'],
  },
  {
    name: 'update_activity',
    description: 'Update an existing activity by its ID.',
    properties: {
      id: { type: 'string', description: 'Activity _id (required)' },
      name: { type: 'string', description: 'New name' },
      type: { type: 'string', description: 'New type' },
      status: { type: 'string', description: 'New status' },
      startDate: { type: 'string', description: 'New start date (ISO 8601)' },
      endDate: { type: 'string', description: 'New end date (ISO 8601)' },
      location: { type: 'string', description: 'New location' },
    },
    required: ['id'],
  },
  {
    name: 'delete_activity',
    description: 'Permanently delete an activity by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Activity _id (required)' },
    },
    required: ['id'],
  },

  // ── EQUIPMENT ──────────────────────────────────────────────────────────
  {
    name: 'list_equipment',
    description: 'List equipment for the current project.',
    properties: {
      system: { type: 'string', description: 'Filter by system name (partial match)' },
      type: { type: 'string', description: 'Filter by equipment type (partial match)' },
      status: { type: 'string', description: 'Filter by status' },
      search: { type: 'string', description: 'Search by tag, title, or name (partial match)' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_equipment',
    description: 'Create new equipment in the current project. For templated equipment (AHUs, chillers, pumps), prefer apply_template_to_equipment instead so the equipment inherits full Cx content.',
    properties: {
      tag: { type: 'string', description: 'Equipment tag/identifier (e.g., AHU-1). Required.' },
      title: { type: 'string', description: 'Equipment title/display name. Required.' },
      type: { type: 'string', description: 'Equipment type (e.g., Air Handler, Chiller, Boiler, Pump). Required.' },
      system: { type: 'string', description: 'System name (e.g., HVAC, Plumbing, Electrical)' },
      status: { type: 'string', description: 'Status: Not Started, In Progress, Complete. Defaults to Not Started.' },
      description: { type: 'string', description: 'Equipment description or notes' },
      spaceId: { type: 'string', description: 'Space _id to link this equipment to a building/floor/room' },
      location: { type: 'string', description: 'Free-text location (e.g., "Mechanical Room B-12", "Roof")' },
      templateId: { type: 'string', description: 'Template _id for reference only (no content copy). Use apply_template_to_equipment to copy template content.' },
    },
    required: ['tag', 'title', 'type'],
  },
  {
    name: 'update_equipment',
    description: 'Update existing equipment by its ID.',
    properties: {
      id: { type: 'string', description: 'Equipment _id (required)' },
      tag: { type: 'string', description: 'New tag' },
      title: { type: 'string', description: 'New title' },
      type: { type: 'string', description: 'New type' },
      system: { type: 'string', description: 'New system name' },
      status: { type: 'string', description: 'New status' },
      description: { type: 'string', description: 'New description' },
      spaceId: { type: 'string', description: 'New Space _id link' },
      location: { type: 'string', description: 'New free-text location' },
    },
    required: ['id'],
  },
  {
    name: 'apply_template_to_equipment',
    description: 'Create new equipment by deep-copying a template. This is the preferred way to scaffold equipment from drawings — attributes, components, checklists, and functional tests are all copied from the template.',
    properties: {
      templateId: { type: 'string', description: 'Template _id to copy from (required)' },
      tag: { type: 'string', description: 'Equipment tag for the new record (e.g., AHU-1). Required.' },
      title: { type: 'string', description: 'Equipment title. Required.' },
      spaceId: { type: 'string', description: 'Space _id to link this equipment to' },
      location: { type: 'string', description: 'Free-text location (e.g., "Roof", "Mechanical Room 3")' },
      description: { type: 'string', description: 'Override description (defaults to template description)' },
    },
    required: ['templateId', 'tag', 'title'],
  },
  {
    name: 'delete_equipment',
    description: 'Permanently delete equipment by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Equipment _id (required)' },
    },
    required: ['id'],
  },

  // ── ISSUES ─────────────────────────────────────────────────────────────
  {
    name: 'list_issues',
    description: 'List issues for the current project.',
    properties: {
      status: { type: 'string', description: 'Filter by status: Open, Closed, In Progress, Pending, Cancelled' },
      severity: { type: 'string', description: 'Filter by severity: Low, Medium, High, Critical, Comment' },
      system: { type: 'string', description: 'Filter by system name (partial match)' },
      search: { type: 'string', description: 'Search by title or description' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_issue',
    description: 'Create a new issue in the current project.',
    properties: {
      title: { type: 'string', description: 'Issue title (required)' },
      description: { type: 'string', description: 'Issue description. Explain the problem clearly. Required.' },
      severity: { type: 'string', description: 'Severity: Low, Medium, High, Critical, Comment. Defaults to Medium.' },
      type: { type: 'string', description: 'Issue type or category' },
      system: { type: 'string', description: 'Related system name' },
      assignedTo: { type: 'string', description: 'Name of person assigned to resolve' },
      dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
    },
    required: ['title', 'description'],
  },
  {
    name: 'update_issue',
    description: 'Update an existing issue by its ID.',
    properties: {
      id: { type: 'string', description: 'Issue _id (required)' },
      title: { type: 'string', description: 'New title' },
      description: { type: 'string', description: 'New description' },
      status: { type: 'string', description: 'New status: Open, Closed, In Progress, Pending, Cancelled' },
      severity: { type: 'string', description: 'New severity' },
      assignedTo: { type: 'string', description: 'New assignee name' },
      resolution: { type: 'string', description: 'Resolution notes (provide when closing an issue)' },
    },
    required: ['id'],
  },
  {
    name: 'delete_issue',
    description: 'Permanently delete an issue by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Issue _id (required)' },
    },
    required: ['id'],
  },

  // ── SPACES ─────────────────────────────────────────────────────────────
  {
    name: 'list_spaces',
    description: 'List spaces (buildings, floors, rooms, areas) for the current project.',
    properties: {
      search: { type: 'string', description: 'Search by name or tag (partial match)' },
      parentSpace: { type: 'string', description: 'Filter by parent space _id. Use "root" for top-level spaces only.' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_space',
    description: 'Create a new space in the current project.',
    properties: {
      name: { type: 'string', description: 'Space name (required)' },
      tag: { type: 'string', description: 'Space tag/code (e.g., B1, F2, R301)' },
      type: { type: 'string', description: 'Space type: Building, Floor, Room, Area, Zone' },
      parentSpace: { type: 'string', description: 'Parent space _id (for nested spaces, e.g., a room inside a floor)' },
    },
    required: ['name'],
  },
  {
    name: 'update_space',
    description: 'Update a space by its ID.',
    properties: {
      id: { type: 'string', description: 'Space _id (required)' },
      name: { type: 'string', description: 'New name' },
      tag: { type: 'string', description: 'New tag' },
      type: { type: 'string', description: 'New type' },
    },
    required: ['id'],
  },
  {
    name: 'delete_space',
    description: 'Permanently delete a space by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Space _id (required)' },
    },
    required: ['id'],
  },

  // ── TEMPLATES ──────────────────────────────────────────────────────────
  {
    name: 'list_templates',
    description: 'List equipment templates for the current project.',
    properties: {
      type: { type: 'string', description: 'Filter by equipment type (partial match)' },
      system: { type: 'string', description: 'Filter by system name (partial match)' },
      search: { type: 'string', description: 'Search by tag or title' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_template',
    description: 'Create a new equipment template in the current project. Can include full commissioning content: components, attributes, checklists, and functional performance tests.',
    properties: {
      tag: { type: 'string', description: 'Template tag/identifier (required)' },
      title: { type: 'string', description: 'Template title (required)' },
      type: { type: 'string', description: 'Equipment type this template covers (required)' },
      system: { type: 'string', description: 'System name (e.g., HVAC, Plumbing, Electrical)' },
      description: { type: 'string', description: 'Description of the equipment and commissioning scope' },
      attributes: {
        type: 'array',
        description: 'Key/value pairs for equipment nameplate data and design parameters. Each item: { key: string, value: string }. Examples: Airflow CFM, Motor HP, Refrigerant Type, Voltage, Serial Number.',
        items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key'] },
      },
      components: {
        type: 'array',
        description: 'Sub-components of the equipment. Each item: { tag: string, type: string, title: string, status: string, notes: string, attributes: [{ key, value }] }. Examples: Supply Fan, Return Fan, CHW Coil, Filter Bank, VFD, Actuator, Damper.',
        items: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Component tag (e.g., SF-1, CHW-COIL-1)' },
            type: { type: 'string', description: 'Component type (e.g., Fan, Coil, Damper, Sensor, VFD)' },
            title: { type: 'string', description: 'Component display name' },
            status: { type: 'string', description: 'Status: Not Started, In Progress, Complete' },
            notes: { type: 'string', description: 'Component notes' },
            attributes: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } } } },
          },
        },
      },
      checklists: {
        type: 'array',
        description: 'Prefunctional and installation checklist sections. Each section: { number: string, title: string, type: string, responsible: string, questions: [{ question_text: string, answer: string, notes: string }] }. Include sections like Installation Verification, Controls & Sensors, Safety Devices, Startup.',
        items: {
          type: 'object',
          properties: {
            number: { type: 'string', description: 'Section number (e.g., 1, 2a)' },
            title: { type: 'string', description: 'Section title (e.g., Installation Verification, Controls Verification)' },
            type: { type: 'string', description: 'Checklist type (e.g., Prefunctional, Installation, Startup)' },
            responsible: { type: 'string', description: 'Responsible party (e.g., Mechanical, Controls, Electrical)' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_text: { type: 'string', description: 'The checklist item or question text' },
                  answer: { type: 'string', description: 'Expected answer or leave blank for field entry' },
                  notes: { type: 'string', description: 'Additional guidance notes' },
                },
              },
            },
          },
        },
      },
      functionalTests: {
        type: 'array',
        description: 'Functional performance tests. Each test has a kind: "sequence" (step-by-step control sequence tests) or "standard" (tabular Points Verification / Sensor Readings). PICK THE RIGHT KIND: sequence for control-sequence tests like Cooling Mode, Freeze Protection, Changeover; standard for point-by-point BAS verification or sensor calibration lists.',
        items: {
          type: 'object',
          properties: {
            number: { type: 'string', description: 'Test number (e.g., FPT-1, FPT-2)' },
            name: { type: 'string', description: 'Test name (e.g., Cooling Mode Operation, Occupied/Unoccupied Changeover, Points Verification)' },
            description: { type: 'string', description: 'Test objective and pre-conditions' },
            kind: { type: 'string', description: 'REQUIRED. Either "sequence" (step-by-step control test) or "standard" (points/tabular verification list). Default to "sequence" for any control sequence test — most tests are sequence.' },
            notes: { type: 'string', description: 'Test notes or observations' },
            rows: {
              type: 'array',
              description: 'For kind="sequence" ONLY: ordered test steps. Ignored for kind="standard".',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'string', description: 'Description of the test action to perform' },
                  expected: { type: 'string', description: 'Expected result or acceptance criterion' },
                  actual: { type: 'string', description: 'Actual result — leave blank for field entry' },
                },
              },
            },
            columns: {
              type: 'array',
              description: 'For kind="standard" ONLY: list of column headers as strings. Common preset for Points Verification: ["System Point","BAS","Field","Offset","Pass"]. For Sensor Readings: ["Point Name","Point ID","Design Value","Measured Value","Units","Pass"]. Omit to get the Points Verification preset by default.',
              items: { type: 'string' },
            },
            tableRows: {
              type: 'array',
              description: 'For kind="standard" ONLY: list of row objects keyed by column name (not key). Example: [{"System Point":"Supply Air Temp","BAS":"55°F","Field":"","Offset":"","Pass":""}]. Leave blank fields empty for field entry.',
              items: { type: 'object' },
            },
          },
        },
      },
    },
    required: ['tag', 'title', 'type'],
  },
  {
    name: 'update_template',
    description: 'Update a template by its ID. Can update any fields including components, checklists, and functional tests.',
    properties: {
      id: { type: 'string', description: 'Template _id (required)' },
      tag: { type: 'string', description: 'New tag' },
      title: { type: 'string', description: 'New title' },
      type: { type: 'string', description: 'New type' },
      system: { type: 'string', description: 'New system' },
      description: { type: 'string', description: 'New description' },
      attributes: {
        type: 'array',
        description: 'Replace all attributes. Each item: { key: string, value: string }',
        items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key'] },
      },
      components: {
        type: 'array',
        description: 'Replace all components. Each item: { tag, type, title, status, notes, attributes: [{ key, value }] }',
        items: { type: 'object' },
      },
      checklists: {
        type: 'array',
        description: 'Replace all checklist sections. Each item: { number, title, type, responsible, questions: [{ question_text, answer, notes }] }',
        items: { type: 'object' },
      },
      functionalTests: {
        type: 'array',
        description: 'Replace all functional tests. Each item: { number, name, description, pass, notes, rows: [{ step, expected, actual }] }',
        items: { type: 'object' },
      },
    },
    required: ['id'],
  },
  {
    name: 'delete_template',
    description: 'Permanently delete a template by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'Template _id (required)' },
    },
    required: ['id'],
  },

  // ── SYSTEMS ────────────────────────────────────────────────────────────
  {
    name: 'list_systems',
    description: 'List systems for the current project.',
    properties: {
      type: { type: 'string', description: 'Filter by system type (partial match)' },
      search: { type: 'string', description: 'Search by name or tag (partial match)' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
    required: [],
  },
  {
    name: 'create_system',
    description: 'Create a new system in the current project.',
    properties: {
      name: { type: 'string', description: 'System name (required)' },
      tag: { type: 'string', description: 'System tag/code (e.g., MECH-01, ELEC-02)' },
      type: { type: 'string', description: 'System type (e.g., Mechanical, Electrical, Plumbing, BAS, Fire Alarm, Life Safety)' },
      description: { type: 'string', description: 'Description of this system' },
    },
    required: ['name'],
  },
  {
    name: 'update_system',
    description: 'Update a system by its ID.',
    properties: {
      id: { type: 'string', description: 'System _id (required)' },
      name: { type: 'string', description: 'New name' },
      tag: { type: 'string', description: 'New tag' },
      type: { type: 'string', description: 'New type' },
      description: { type: 'string', description: 'New description' },
    },
    required: ['id'],
  },
  {
    name: 'delete_system',
    description: 'Permanently delete a system by ID. Always ask the user to confirm before calling this.',
    properties: {
      id: { type: 'string', description: 'System _id (required)' },
    },
    required: ['id'],
  },
]

// ---------------------------------------------------------------------------
// Provider-specific format converters
// ---------------------------------------------------------------------------

function getClaudeTools() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: { type: 'object', properties: t.properties, required: t.required },
  }))
}

function getOpenAiTools() {
  return TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: { type: 'object', properties: t.properties, required: t.required },
    },
  }))
}

function getGeminiTools() {
  return [{
    functionDeclarations: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: { type: 'object', properties: t.properties, required: t.required.length ? t.required : undefined },
    })),
  }]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a short human-readable label for a tool result (used in UI chips). */
function getToolLabel(toolName) {
  const labels = {
    get_project_summary: 'Project summary',
    list_tasks: 'Listed tasks', create_task: 'Created task', update_task: 'Updated task', delete_task: 'Deleted task',
    list_activities: 'Listed activities', create_activity: 'Created activity', update_activity: 'Updated activity', delete_activity: 'Deleted activity',
    list_equipment: 'Listed equipment', create_equipment: 'Created equipment', update_equipment: 'Updated equipment', delete_equipment: 'Deleted equipment', apply_template_to_equipment: 'Created equipment from template',
    list_issues: 'Listed issues', create_issue: 'Created issue', update_issue: 'Updated issue', delete_issue: 'Deleted issue',
    list_spaces: 'Listed spaces', create_space: 'Created space', update_space: 'Updated space', delete_space: 'Deleted space',
    list_templates: 'Listed templates', create_template: 'Created template', update_template: 'Updated template', delete_template: 'Deleted template',
    list_systems: 'Listed systems', create_system: 'Created system', update_system: 'Updated system', delete_system: 'Deleted system',
  }
  return labels[toolName] || toolName
}

/** Return the frontend navigation link for a record. */
function getRecordLink(toolName, record) {
  if (!record || !record._id) return null
  const id = String(record._id)
  if (toolName === 'apply_template_to_equipment') return `/app/equipment/${id}`
  const module = toolName.replace(/^(create|update|delete|list)_/, '')
  const map = {
    task: `/app/tasks/${id}`,
    activity: `/app/activities/${id}`,
    equipment: `/app/equipment/${id}`,
    issue: `/app/issues/${id}`,
    space: `/app/spaces/${id}`,
    template: `/app/templates/${id}`,
    system: `/app/systems/${id}`,
  }
  return map[module] || null
}

/** Pick a display name for a record */
function getRecordName(record) {
  if (!record) return null
  return record.name || record.title || record.tag || null
}

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

async function executeTool(toolName, toolInput, context) {
  const { projectId } = context
  if (!projectId) return { success: false, error: 'No project context available' }

  const input = toolInput || {}
  const limit = Math.min(50, Math.max(1, parseInt(input.limit) || 20))

  try {
    switch (toolName) {

      // ── PROJECT OVERVIEW ────────────────────────────────────────────
      case 'get_project_summary': {
        const [spaces, systems, templates, equipment, tasks, activities, issues] = await Promise.all([
          Space.countDocuments({ project: projectId }),
          System.countDocuments({ projectId }),
          Template.countDocuments({ projectId }),
          Equipment.countDocuments({ projectId }),
          Task.countDocuments({ projectId, deleted: { $ne: true } }),
          Activity.countDocuments({ projectId }),
          Issue.countDocuments({ projectId }),
        ])
        return {
          success: true,
          record: { spaces, systems, templates, equipment, tasks, activities, issues },
        }
      }

      // ── TASKS ────────────────────────────────────────────────────────
      case 'list_tasks': {
        const q = { projectId, deleted: { $ne: true } }
        if (input.status) q.status = input.status
        if (input.search) q.$or = [{ name: { $regex: str(input.search, 100), $options: 'i' } }]
        const tasks = await Task.find(q).select('_id taskId name status wbs start end').sort({ wbs: 1, createdAt: -1 }).limit(limit).lean()
        return { success: true, count: tasks.length, records: tasks }
      }
      case 'create_task': {
        if (!input.name) return { success: false, error: 'name is required' }
        const task = await Task.create({
          projectId,
          name: str(input.name, 200),
          description: str(input.description, 5000),
          status: input.status || 'Not Started',
          wbs: input.wbs ? str(input.wbs, 20) : undefined,
          start: input.start ? new Date(input.start) : undefined,
          end: input.end ? new Date(input.end) : undefined,
        })
        return { success: true, record: task.toObject() }
      }
      case 'update_task': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Task.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Task not found in this project' }
        const fields = {}
        if (input.name) fields.name = str(input.name, 200)
        if (input.description !== undefined) fields.description = str(input.description, 5000)
        if (input.status) fields.status = input.status
        if (input.wbs) fields.wbs = str(input.wbs, 20)
        if (input.start) fields.start = new Date(input.start)
        if (input.end) fields.end = new Date(input.end)
        const updated = await Task.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_task': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Task.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Task not found in this project' }
        await Task.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.name, id: input.id }
      }

      // ── ACTIVITIES ───────────────────────────────────────────────────
      case 'list_activities': {
        const q = { projectId }
        if (input.type) q.type = { $regex: str(input.type, 100), $options: 'i' }
        if (input.status) q.status = input.status
        if (input.search) q.name = { $regex: str(input.search, 100), $options: 'i' }
        const items = await Activity.find(q).select('_id name type status startDate endDate').sort({ startDate: -1 }).limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_activity': {
        if (!input.name) return { success: false, error: 'name is required' }
        const item = await Activity.create({
          projectId,
          name: str(input.name, 200),
          type: str(input.type || 'General', 100),
          status: input.status || 'Not Started',
          startDate: input.startDate ? new Date(input.startDate) : new Date(),
          endDate: input.endDate ? new Date(input.endDate) : new Date(),
          location: str(input.location, 200),
        })
        return { success: true, record: item.toObject() }
      }
      case 'update_activity': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Activity.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Activity not found in this project' }
        const fields = { updatedAt: new Date() }
        if (input.name) fields.name = str(input.name, 200)
        if (input.type) fields.type = str(input.type, 100)
        if (input.status) fields.status = input.status
        if (input.startDate) fields.startDate = new Date(input.startDate)
        if (input.endDate) fields.endDate = new Date(input.endDate)
        if (input.location !== undefined) fields.location = str(input.location, 200)
        const updated = await Activity.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_activity': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Activity.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Activity not found in this project' }
        await Activity.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.name, id: input.id }
      }

      // ── EQUIPMENT ────────────────────────────────────────────────────
      case 'list_equipment': {
        const q = { projectId }
        if (input.system) q.system = { $regex: str(input.system, 100), $options: 'i' }
        if (input.type) q.type = { $regex: str(input.type, 100), $options: 'i' }
        if (input.status) q.status = input.status
        if (input.search) {
          const re = { $regex: str(input.search, 100), $options: 'i' }
          q.$or = [{ tag: re }, { title: re }, { name: re }]
        }
        const items = await Equipment.find(q).select('_id tag title type system status').limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_equipment': {
        if (!input.tag) return { success: false, error: 'tag is required' }
        if (!input.title) return { success: false, error: 'title is required' }
        if (!input.type) return { success: false, error: 'type is required' }
        const doc = {
          projectId,
          tag: str(input.tag, 80),
          title: str(input.title, 160),
          name: str(input.title, 160),
          type: str(input.type, 120),
          system: str(input.system, 120),
          status: input.status || 'Not Started',
          description: str(input.description, 2000),
          location: str(input.location, 200),
        }
        if (input.spaceId && isObjectId(input.spaceId)) doc.spaceId = input.spaceId
        if (input.templateId && isObjectId(input.templateId)) doc.template = input.templateId
        const item = await Equipment.create(doc)
        return { success: true, record: item.toObject() }
      }
      case 'update_equipment': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Equipment.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Equipment not found in this project' }
        const fields = {}
        if (input.tag) fields.tag = str(input.tag, 80)
        if (input.title) { fields.title = str(input.title, 160); fields.name = fields.title }
        if (input.type) fields.type = str(input.type, 120)
        if (input.system !== undefined) fields.system = str(input.system, 120)
        if (input.status) fields.status = input.status
        if (input.description !== undefined) fields.description = str(input.description, 2000)
        if (input.location !== undefined) fields.location = str(input.location, 200)
        if (input.spaceId !== undefined) {
          fields.spaceId = (input.spaceId && isObjectId(input.spaceId)) ? input.spaceId : null
        }
        const updated = await Equipment.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'apply_template_to_equipment': {
        if (!input.templateId || !isObjectId(input.templateId)) return { success: false, error: 'Valid templateId is required' }
        if (!input.tag) return { success: false, error: 'tag is required' }
        if (!input.title) return { success: false, error: 'title is required' }
        const template = await Template.findOne({ _id: input.templateId, projectId }).lean()
        if (!template) return { success: false, error: 'Template not found in this project' }
        const doc = {
          projectId,
          tag: str(input.tag, 80),
          title: str(input.title, 160),
          name: str(input.title, 160),
          type: str(template.type || '', 120),
          system: str(template.system || '', 120),
          status: 'Not Started',
          description: str(input.description !== undefined ? input.description : template.description, 2000),
          location: str(input.location, 200),
          template: template._id,
          attributes: Array.isArray(template.attributes) ? JSON.parse(JSON.stringify(template.attributes)) : [],
          components: Array.isArray(template.components) ? JSON.parse(JSON.stringify(template.components)) : [],
          checklists: Array.isArray(template.checklists) ? JSON.parse(JSON.stringify(template.checklists)) : [],
          functionalTests: normalizeFunctionalTests(Array.isArray(template.functionalTests) ? JSON.parse(JSON.stringify(template.functionalTests)) : []),
        }
        if (input.spaceId && isObjectId(input.spaceId)) doc.spaceId = input.spaceId
        const item = await Equipment.create(doc)
        return { success: true, record: item.toObject() }
      }
      case 'delete_equipment': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Equipment.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Equipment not found in this project' }
        await Equipment.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.title || existing.tag, id: input.id }
      }

      // ── ISSUES ───────────────────────────────────────────────────────
      case 'list_issues': {
        const q = { projectId }
        if (input.status) q.status = input.status
        if (input.severity) q.severity = input.severity
        if (input.system) q.system = { $regex: str(input.system, 100), $options: 'i' }
        if (input.search) {
          const re = { $regex: str(input.search, 100), $options: 'i' }
          q.$or = [{ title: re }, { description: re }]
        }
        const items = await Issue.find(q).select('_id tag title status severity system assignedTo').sort({ createdAt: -1 }).limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_issue': {
        if (!input.title) return { success: false, error: 'title is required' }
        if (!input.description) return { success: false, error: 'description is required' }
        const item = await Issue.create({
          projectId,
          title: str(input.title, 200),
          description: str(input.description, 5000),
          severity: input.severity || 'Medium',
          type: str(input.type, 100),
          system: str(input.system, 120),
          assignedTo: str(input.assignedTo, 100),
          dueDate: input.dueDate ? str(input.dueDate, 30) : '',
          status: 'Open',
        })
        return { success: true, record: item.toObject() }
      }
      case 'update_issue': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Issue.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Issue not found in this project' }
        const fields = { updatedAt: new Date().toISOString() }
        if (input.title) fields.title = str(input.title, 200)
        if (input.description !== undefined) fields.description = str(input.description, 5000)
        if (input.status) fields.status = input.status
        if (input.severity) fields.severity = input.severity
        if (input.assignedTo !== undefined) fields.assignedTo = str(input.assignedTo, 100)
        if (input.resolution !== undefined) fields.resolution = str(input.resolution, 5000)
        const updated = await Issue.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_issue': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Issue.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Issue not found in this project' }
        await Issue.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.title, id: input.id }
      }

      // ── SPACES ───────────────────────────────────────────────────────
      case 'list_spaces': {
        const q = { project: projectId }
        if (input.search) {
          const re = { $regex: str(input.search, 100), $options: 'i' }
          q.$or = [{ title: re }, { tag: re }]
        }
        if (input.parentSpace && input.parentSpace !== 'root') {
          if (isObjectId(input.parentSpace)) q.parentSpace = input.parentSpace
        } else if (input.parentSpace === 'root') {
          q.parentSpace = { $in: [null, undefined, ''] }
        }
        const items = await Space.find(q).select('_id tag title type parentSpace').limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_space': {
        if (!input.name) return { success: false, error: 'name is required' }
        const item = await Space.create({
          project: projectId,
          title: str(input.name, 200),
          tag: input.tag ? str(input.tag, 80) : undefined,
          type: input.type ? str(input.type, 100) : undefined,
          parentSpace: (input.parentSpace && isObjectId(input.parentSpace)) ? input.parentSpace : null,
        })
        return { success: true, record: item.toObject() }
      }
      case 'update_space': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Space.findOne({ _id: input.id, project: projectId }).lean()
        if (!existing) return { success: false, error: 'Space not found in this project' }
        const fields = {}
        if (input.name) fields.title = str(input.name, 200)
        if (input.tag !== undefined) fields.tag = str(input.tag, 80)
        if (input.type !== undefined) fields.type = str(input.type, 100)
        const updated = await Space.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_space': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Space.findOne({ _id: input.id, project: projectId }).lean()
        if (!existing) return { success: false, error: 'Space not found in this project' }
        await Space.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.title, id: input.id }
      }

      // ── TEMPLATES ────────────────────────────────────────────────────
      case 'list_templates': {
        const q = { projectId }
        if (input.type) q.type = { $regex: str(input.type, 100), $options: 'i' }
        if (input.system) q.system = { $regex: str(input.system, 100), $options: 'i' }
        if (input.search) {
          const re = { $regex: str(input.search, 100), $options: 'i' }
          q.$or = [{ tag: re }, { title: re }]
        }
        const items = await Template.find(q).select('_id tag title type system').limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_template': {
        if (!input.tag) return { success: false, error: 'tag is required' }
        if (!input.title) return { success: false, error: 'title is required' }
        if (!input.type) return { success: false, error: 'type is required' }
        const item = await Template.create({
          projectId,
          tag: str(input.tag, 80),
          title: str(input.title, 160),
          type: str(input.type, 120),
          system: str(input.system, 120),
          description: str(input.description, 2000),
          attributes: Array.isArray(input.attributes) ? input.attributes : [],
          components: Array.isArray(input.components) ? input.components : [],
          checklists: Array.isArray(input.checklists) ? input.checklists : [],
          functionalTests: normalizeFunctionalTests(input.functionalTests),
        })
        return { success: true, record: item.toObject() }
      }
      case 'update_template': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Template.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Template not found in this project' }
        const fields = {}
        if (input.tag) fields.tag = str(input.tag, 80)
        if (input.title) fields.title = str(input.title, 160)
        if (input.type) fields.type = str(input.type, 120)
        if (input.system !== undefined) fields.system = str(input.system, 120)
        if (input.description !== undefined) fields.description = str(input.description, 2000)
        if (Array.isArray(input.attributes)) fields.attributes = input.attributes
        if (Array.isArray(input.components)) fields.components = input.components
        if (Array.isArray(input.checklists)) fields.checklists = input.checklists
        if (Array.isArray(input.functionalTests)) fields.functionalTests = normalizeFunctionalTests(input.functionalTests)
        const updated = await Template.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_template': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await Template.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'Template not found in this project' }
        await Template.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.title || existing.tag, id: input.id }
      }

      // ── SYSTEMS ──────────────────────────────────────────────────────
      case 'list_systems': {
        const q = { projectId }
        if (input.type) q.type = { $regex: str(input.type, 100), $options: 'i' }
        if (input.search) {
          const re = { $regex: str(input.search, 100), $options: 'i' }
          q.$or = [{ name: re }, { tag: re }]
        }
        const items = await System.find(q).select('_id tag name type').limit(limit).lean()
        return { success: true, count: items.length, records: items }
      }
      case 'create_system': {
        if (!input.name) return { success: false, error: 'name is required' }
        const item = await System.create({
          projectId,
          name: str(input.name, 160),
          tag: input.tag ? str(input.tag, 80) : undefined,
          type: input.type ? str(input.type, 120) : undefined,
          description: str(input.description, 2000),
        })
        return { success: true, record: item.toObject() }
      }
      case 'update_system': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await System.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'System not found in this project' }
        const fields = {}
        if (input.name) fields.name = str(input.name, 160)
        if (input.tag !== undefined) fields.tag = str(input.tag, 80)
        if (input.type !== undefined) fields.type = str(input.type, 120)
        if (input.description !== undefined) fields.description = str(input.description, 2000)
        const updated = await System.findByIdAndUpdate(input.id, { $set: fields }, { new: true }).lean()
        return { success: true, record: updated }
      }
      case 'delete_system': {
        if (!input.id || !isObjectId(input.id)) return { success: false, error: 'Valid id is required' }
        const existing = await System.findOne({ _id: input.id, projectId }).lean()
        if (!existing) return { success: false, error: 'System not found in this project' }
        await System.findByIdAndDelete(input.id)
        return { success: true, deleted: true, name: existing.name, id: input.id }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    console.error(`[agentTools] ${toolName} error`, err && (err.stack || err.message))
    return { success: false, error: err && err.message ? err.message : 'Tool execution failed' }
  }
}

module.exports = {
  getClaudeTools,
  getOpenAiTools,
  getGeminiTools,
  executeTool,
  getRecordLink,
  getRecordName,
  getToolLabel,
  TOOLS,
}
