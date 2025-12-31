// Assistant compliance checklists (seed templates).
// These are intentionally short and generic for v1; expand with citations and richer structure later.

function makeNewBuildingCxChecklistV1() {
  const commonPlatformGuidance = [
    'How to do this in CXMA:',
    '- Track the requirement as one or more Tasks (status, dates, % complete).',
    '- Create an Activity for key milestones (meetings, site visits, testing) and attach photos/notes/attachments.',
    '- Log findings as Issues and track them to closeout.',
  ].join('\n')

  const commonPlatformLinks = [
    { title: 'Open Tasks', to: '/app/tasks' },
    { title: 'Open Activities', to: '/app/activities' },
    { title: 'Create Activity', to: '/app/activities/new', note: 'Creates a new Activity in the current project.' },
    { title: 'Open Issues', to: '/app/issues' },
  ]

  return {
    templateKey: 'new-building-cx/v1',
    projectType: 'New Building Cx',
    items: [
      {
        id: 'nbcx-000',
        category: 'Planning',
        title: 'Create baseline Tasks in CXMA from a Task Template',
        description: 'Import a commissioning task list template into this project so you can track progress, assignments, and costs.',
        guidance: 'Choose a template that matches your project type (and LEED scope if applicable). Review the imported tasks and tailor them to the contract scope.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Open Tasks → Import tasks → Template.',
          '- Search for a task template that matches this project type.',
          '- Import, then review/edit the tasks for scope, dates, and responsibilities.',
        ].join('\n'),
        platformLinks: [
          { title: 'Import tasks from template', to: '/app/tasks?import=1&tab=template&templateQ={projectType}' },
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Open Project Settings', to: '/app/projects/edit/{projectId}', note: 'Confirm the project Type matches the intended scope.' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: 'nbcx-000a',
        category: 'Planning',
        title: 'Create an Activity for the commissioning kickoff / OPR workshop',
        description: 'Track the kickoff meeting and capture notes/attachments as a single record.',
        guidance: 'Create an Activity, set Location/Type/Dates, and attach agendas, sign-in sheets, and notes. Log decisions and action items.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create a new Activity for the kickoff / OPR workshop.',
          '- Use Comments/Attachments/Photos to capture meeting artifacts.',
          '- Create Issues for decisions needing follow-up.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: 'nbcx-000b',
        category: 'Planning',
        title: 'Populate and tag Equipment to start checklist tracking',
        description: 'Add equipment and begin pre-functional checklist completion per system.',
        guidance: 'Ensure equipment has correct Type/System/Status and tags (e.g., AHU-1). This enables checklist-by-system progress tracking.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Open Equipment and add/import equipment.',
          '- Ensure each item has a System and Status.',
          '- Open Equipment → Checklists to complete pre-functional items.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Tasks', to: '/app/tasks' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: 'nbcx-001',
        category: 'Planning',
        title: 'Confirm OPR (Owner’s Project Requirements) is complete and approved',
        description: 'Ensure the OPR exists, is current, and has been approved by the Owner.',
        guidance: 'Upload/link the latest OPR. Confirm approval date and version. Flag gaps as issues and assign an owner.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create an Activity for the OPR review/workshop.',
          '- Attach the OPR document(s) and capture meeting notes/decisions.',
          '- Create Issues for gaps/mismatches and assign owners/due dates.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Project Settings', to: '/app/projects/edit/{projectId}' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-002',
        category: 'Planning',
        title: 'Confirm BOD (Basis of Design) is complete and aligned with OPR',
        description: 'Verify the BOD addresses the OPR and is internally consistent.',
        guidance: 'Compare OPR vs BOD at a high level. Note mismatches and track to resolution (issues log).',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create an Activity for the BoD review and attach the BoD document(s).',
          '- Log gaps/mismatches as Issues with recommendations and due dates.',
          '- Track resolution before moving into construction submittals and testing.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-003',
        category: 'Planning',
        title: 'Commissioning Plan drafted and issued',
        description: 'Draft a Cx Plan defining scope, roles, schedule, deliverables, and process.',
        guidance: 'Define commissioned systems, sampling approach, issue process, documentation deliverables, and responsibilities.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create a Task for drafting the Cx Plan and assign due dates/owners.',
          '- Create an Activity for the plan review/approval milestone and attach the plan file(s).',
          '- Use Issues to track plan review comments to closure.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-004',
        category: 'Planning',
        title: 'Commissioning scope confirmed (systems + documentation)',
        description: 'Confirm which systems are in scope and how they will be verified.',
        guidance: 'List in-scope equipment/systems, required checklists, and required functional tests. Confirm acceptance criteria.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Ensure the project Type matches the intended scope.',
          '- Populate Equipment with correct System/Type/Status so checklists and FPT progress can be tracked by system.',
          '- Use Tasks to capture scope decisions and assign owners for outstanding inputs.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Project Settings', to: '/app/projects/edit/{projectId}' },
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Tasks', to: '/app/tasks' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-005',
        category: 'Design',
        title: 'Design reviews completed for commissioned systems',
        description: 'Perform documented design reviews and track findings to resolution.',
        guidance: 'Capture design review findings as issues with recommendations and due dates. Track resolution before construction.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create an Activity for each design review milestone (30/60/90% etc.).',
          '- Attach reviewed drawings/specs and capture meeting minutes/notes.',
          '- Log findings as Issues and track to closure before construction.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-006',
        category: 'Construction',
        title: 'Submittals reviewed for Cx-relevant content',
        description: 'Review key submittals and verify they support OPR/BOD and Cx requirements.',
        guidance: 'Prioritize controls sequences, equipment submittals, TAB, and O&M. Log Cx comments and confirm updates.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create Tasks for submittal review packages and assign responsible reviewers.',
          '- Use an Activity per major submittal package to attach files and record comments.',
          '- Log critical issues as Issues and track to closure before startup/FPT.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-007',
        category: 'Construction',
        title: 'Issue log established and communicated',
        description: 'Ensure there is an agreed workflow for tracking and resolving issues.',
        guidance: 'Agree on statuses, assignment, due dates, and closeout criteria. Use CXMA Issues for the canonical log.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use the Issues module as the canonical issue log.',
          '- Create Issues from Activities and Equipment when you find a deficiency.',
          '- Track status, recommendations, and closeout.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Equipment', to: '/app/equipment' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-008',
        category: 'Construction',
        title: 'Equipment start-up and pre-functional checklists executed',
        description: 'Ensure start-up activities and pre-functional checklists are completed and documented.',
        guidance: 'Collect startup documentation; run pre-functional checklists per equipment/system. Record deficiencies as issues.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Equipment to track each asset and open its Checklists tab to complete pre-functional items.',
          '- Create Issues from Equipment if deficiencies are found.',
          '- Use Activities for site visits and attach startup photos/docs.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Activities', to: '/app/activities' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-009',
        category: 'Construction',
        title: 'Controls/sequence readiness verified prior to functional testing',
        description: 'Confirm sequences, setpoints, and graphics are ready for testing.',
        guidance: 'Validate points list, alarms, trends, schedules, and key setpoints. Confirm TAB prerequisites where applicable.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Tasks to track prerequisites (TAB, point-to-point, graphics/alarms, trend setup).',
          '- For each piece of Equipment, complete pre-functional checklist items related to controls readiness.',
          '- Log deficiencies as Issues and keep them open until prerequisites are met.',
          '- Create an Activity for the controls readiness review and attach supporting screenshots/docs.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Open Equipment', to: '/app/equipment', note: 'Open an equipment record and use the Checklists/FPT tabs as needed.' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Create Activity', to: '/app/activities/new' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-010',
        category: 'Testing',
        title: 'Functional test procedures prepared and approved',
        description: 'Ensure test scripts/procedures exist and are agreed upon before execution.',
        guidance: 'Draft test steps, expected results, data capture fields, and pass/fail criteria. Confirm witness/attendance plan.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create Tasks for drafting and approving each system’s FPT procedures.',
          '- Use Equipment → FPT tab to create/execute tests and capture PASS/FAIL results.',
          '- Create an Activity for the test planning meeting and attach procedures/datasheets.',
          '- Track procedure review comments as Issues until approved.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Open Equipment', to: '/app/equipment', note: 'Open an equipment record → FPT tab to run and record test results.' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-011',
        category: 'Testing',
        title: 'Functional Performance Tests (FPT) executed and issues resolved',
        description: 'Execute FPTs for commissioned systems; document results and resolve issues.',
        guidance: 'Execute tests, record results, open issues for failures, and retest after corrections. Track completion by system.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Equipment → FPT tab to execute functional tests and record PASS/FAIL results.',
          '- Create Issues for failed tests and retest after corrections.',
          '- Use Activities to document test sessions (photos/notes) and generate reports as needed.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Activities', to: '/app/activities' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-012',
        category: 'Testing',
        title: 'Outstanding issues reviewed and risk accepted (if any)',
        description: 'Verify any remaining open items are documented and dispositioned.',
        guidance: 'Summarize remaining issues, impacts, and temporary measures. Obtain Owner acceptance for deferred items.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Filter Issues to find any remaining Open items and confirm each has an owner, due date, and recommendation.',
          '- For deferred items, update the Issue recommendation with the risk/mitigation plan and mark as deferred/accepted per project policy.',
          '- Create an Activity for the closeout review meeting and attach the final open-issues summary/acceptance record.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Tasks', to: '/app/tasks' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-013',
        category: 'Handover',
        title: 'Systems manual compiled and delivered (if in scope)',
        description: 'Compile system documentation, sequences, setpoints, and O&M references.',
        guidance: 'Verify sequences, setpoints, control drawings, and O&M references are included. Confirm final as-builts as available.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create a Task for systems manual compilation and assign owners/dates.',
          '- Use an Activity to track compilation/review milestones and attach the systems manual draft/final.',
          '- Use Issues for gaps found during review (missing sequences, setpoints, O&M references).',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-014',
        category: 'Handover',
        title: 'Training completed and documented',
        description: 'Verify training scope, attendance, and materials meet project requirements.',
        guidance: 'Collect agendas, sign-in sheets, and training materials. Confirm training covers sequences and seasonal operations.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create an Activity for each training session.',
          '- Attach agendas/materials and record attendance as notes/attachments.',
          '- Log follow-up items as Issues or Tasks.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-015',
        category: 'Handover',
        title: 'O&M documentation delivered and organized',
        description: 'Confirm the Owner receives and can navigate O&M documentation.',
        guidance: 'Verify O&M manuals, warranties, spare parts lists, and vendor contacts are complete and discoverable.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create Tasks for collecting O&M manuals/warranties/spares for each system.',
          '- Use Activities to record O&M delivery milestones and attach or link to the delivered packages.',
          '- Use Issues to track any missing documentation to closure.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-016',
        category: 'Closeout',
        title: 'Final Cx report issued',
        description: 'Issue final report including summary, test results, outstanding items, and recommendations.',
        guidance: 'Include executive summary, issue log status, tests executed, deficiencies, and deferred tests/seasonal plan.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Activity Reports to generate PDFs for site visits/testing activities.',
          '- Ensure issues are linked and up to date before generating reports.',
          '- Store final report artifacts as attachments for future reference.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-017',
        category: 'Closeout',
        title: 'Seasonal / deferred testing plan defined (if applicable)',
        description: 'Plan how and when deferred/seasonal testing will occur.',
        guidance: 'Define the conditions needed, responsible parties, dates/windows, and how results will be documented and closed.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create Tasks for each deferred/seasonal test with clear prerequisites and target windows.',
          '- Create an Activity placeholder for each seasonal test session (or create it when the date is scheduled).',
          '- Track any prerequisites as Issues/Tasks and close them before the seasonal test Activity.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Tasks', to: '/app/tasks' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'ASHRAE Guideline 0 (reference)',
        sourceUrl: '',
      },
      {
        id: 'nbcx-018',
        category: 'Closeout',
        title: 'Project closeout: confirm all deliverables archived in CXMA',
        description: 'Ensure the project has the core records needed for future reference.',
        guidance: 'Confirm key reports, checklists, functional tests, and issue history are stored and accessible to the team.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Confirm Equipment checklists and FPTs are complete and documented.',
          '- Confirm Activity reports are generated and stored.',
          '- Confirm Issues are up to date and closed out where appropriate.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'CXMA internal checklist',
        sourceUrl: '',
      },
    ],
  }
}

function makeGenericCxChecklistV1({ projectType, templateKey, prefix, extraItems = [] }) {
  const commonPlatformGuidance = [
    'How to do this in CXMA:',
    '- Track the requirement as one or more Tasks (status, dates, % complete).',
    '- Create an Activity for key milestones (meetings, site visits, assessments, testing) and attach photos/notes/attachments.',
    '- Log findings as Issues and track them to closeout.',
  ].join('\n')

  const commonPlatformLinks = [
    { title: 'Open Tasks', to: '/app/tasks' },
    { title: 'Open Activities', to: '/app/activities' },
    { title: 'Create Activity', to: '/app/activities/new', note: 'Creates a new Activity in the current project.' },
    { title: 'Open Issues', to: '/app/issues' },
    { title: 'Open Project Settings', to: '/app/projects/edit/{projectId}', note: 'Edit project settings (type, AI, subscription info, etc.).' },
    { title: 'Open Equipment', to: '/app/equipment' },
  ]

  return {
    templateKey,
    projectType,
    items: [
      {
        id: `${prefix}-000`,
        category: 'Planning',
        title: 'Create baseline Tasks in CXMA from a Task Template',
        description: 'Import a task list template into this project so you can track progress, assignments, and costs.',
        guidance: 'Choose a task template that best matches the project scope. Review and tailor the imported tasks to the contract.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Open Tasks → Import tasks → Template.',
          '- Search for a task template that matches this project type.',
          '- Import, then review/edit the tasks for scope, dates, and responsibilities.',
        ].join('\n'),
        platformLinks: [
          { title: 'Import tasks from template', to: '/app/tasks?import=1&tab=template&templateQ={projectType}' },
          { title: 'Open Tasks', to: '/app/tasks' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-001`,
        category: 'Planning',
        title: 'Create an Activity for kickoff / scope alignment',
        description: 'Track the kickoff meeting (or scope alignment workshop) and capture notes/attachments as a single record.',
        guidance: 'Create an Activity, set Location/Type/Dates, and attach agendas, sign-in sheets, and notes. Log action items.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create a new Activity for kickoff/scope alignment.',
          '- Use Comments/Attachments/Photos to capture meeting artifacts.',
          '- Create Issues for decisions needing follow-up.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-002`,
        category: 'Setup',
        title: 'Populate and tag Equipment to start checklist tracking',
        description: 'Add equipment and begin checklist completion per system where applicable.',
        guidance: 'Ensure equipment has correct Type/System/Status and tags (e.g., AHU-1). This enables progress tracking by system.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Open Equipment and add/import equipment.',
          '- Ensure each item has a System and Status.',
          '- Open an equipment record → Checklists tab to complete pre-functional items.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Tasks', to: '/app/tasks' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-003`,
        category: 'Execution',
        title: 'Use Issues as the canonical findings log',
        description: 'Ensure there is an agreed workflow for tracking and resolving findings.',
        guidance: 'Agree on statuses, assignment, due dates, and closeout criteria. Use CXMA Issues for the canonical log.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use the Issues module as the canonical issue log.',
          '- Create Issues from Activities and Equipment when you find a deficiency.',
          '- Track status, recommendations, and closeout.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Equipment', to: '/app/equipment' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-004`,
        category: 'Execution',
        title: 'Complete checklists and capture field evidence',
        description: 'Complete checklists where in scope and attach supporting evidence.',
        guidance: 'Use checklists to document readiness and conformance. Attach photos/notes for key items and log deficiencies as issues.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Open an equipment record → Checklists tab and complete items.',
          '- Create Issues for deficiencies and link them back to the equipment/activity context.',
          '- Use Activities to document site visits and attach photos/notes.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment', note: 'Open an equipment record → Checklists tab.' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-005`,
        category: 'Execution',
        title: 'Execute functional tests (FPT) where applicable and resolve issues',
        description: 'Execute functional tests for in-scope equipment/systems; document results and resolve failures.',
        guidance: 'Execute tests, record results, open issues for failures, and retest after corrections. Track completion by system.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Equipment → FPT tab to execute tests and record PASS/FAIL results.',
          '- Create Issues for failed tests and retest after corrections.',
          '- Use Activities to document test sessions (photos/notes) and generate reports as needed.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Equipment', to: '/app/equipment', note: 'Open an equipment record → FPT tab.' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Activities', to: '/app/activities' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      {
        id: `${prefix}-006`,
        category: 'Closeout',
        title: 'Generate and publish final deliverables',
        description: 'Produce the required deliverables and archive them in the project for future reference.',
        guidance: 'Ensure issues are current and evidence is attached before generating final PDFs. Archive final artifacts in the project.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Use Activity Reports to generate PDFs for key Activities (site visits/testing/assessments).',
          '- Ensure Issues are linked and up to date before generating reports.',
          '- Store final report artifacts as attachments for future reference.',
        ].join('\n'),
        platformLinks: [
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
          { title: 'Open Equipment', to: '/app/equipment' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
      ...extraItems,
      {
        id: `${prefix}-999`,
        category: 'Closeout',
        title: 'Project closeout: confirm core records are complete in CXMA',
        description: 'Ensure the project has the records needed for auditability and future reference.',
        guidance: 'Confirm checklists/FPTs, Activities, Issues, and final deliverables are complete and discoverable.',
        platformGuidance: commonPlatformGuidance,
        platformLinks: commonPlatformLinks,
        sourceTitle: 'CXMA internal checklist',
        sourceUrl: '',
      },
    ],
  }
}

function normalizeProjectType(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const low = s.toLowerCase()
  if (low === 'new building cx') return 'New Building Cx'
  if (low === 'leed fundamental cx') return 'LEED Fundamental Cx'
  if (low === 'leed enhanced cx') return 'LEED Enhanced Cx'
  if (low === 'leed enhanced cx with envelope') return 'LEED Enhanced Cx with Envelope'
  if (low === 'envelope cx') return 'Envelope Cx'
  if (low === 'retro cx') return 'Retro Cx'
  if (low === 'facility condition assessment') return 'Facility Condition Assessment'
  return s
}

function getAssistantChecklistTemplateForProjectType(projectType) {
  const pt = normalizeProjectType(projectType)
  if (pt === 'New Building Cx') return makeNewBuildingCxChecklistV1()
  if (pt === 'LEED Fundamental Cx') {
    return makeGenericCxChecklistV1({
      projectType: pt,
      templateKey: 'leed-fundamental-cx/v1',
      prefix: 'leed-fund',
      extraItems: [
        {
          id: 'leed-fund-100',
          category: 'LEED',
          title: 'Confirm LEED scope and documentation responsibilities',
          description: 'Align on what is needed for LEED commissioning documentation and who provides each artifact.',
          guidance: 'Define required LEED deliverables, review cadence, and acceptance criteria. Track gaps as issues and tasks.',
          platformGuidance: [
            'How to do this in CXMA:',
            '- Create Tasks for each LEED commissioning deliverable and assign owners/dates.',
            '- Use an Activity as a recurring LEED documentation review milestone and attach drafts/finals.',
            '- Track documentation gaps as Issues to closure.',
          ].join('\n'),
          platformLinks: [
            { title: 'Open Tasks', to: '/app/tasks' },
            { title: 'Create Activity', to: '/app/activities/new' },
            { title: 'Open Activities', to: '/app/activities' },
            { title: 'Open Issues', to: '/app/issues' },
          ],
          sourceTitle: 'CXMA Platform workflow',
          sourceUrl: '',
        },
      ],
    })
  }
  if (pt === 'LEED Enhanced Cx' || pt === 'LEED Enhanced Cx with Envelope') {
    const extra = [
      {
        id: 'leed-enh-100',
        category: 'LEED',
        title: 'Confirm enhanced commissioning scope and acceptance criteria',
        description: 'Ensure expanded scope (systems and/or envelope) is reflected in tasks, equipment, and testing strategy.',
        guidance: 'Add equipment and tasks for enhanced scope areas. Track completion by system and maintain an up-to-date issues log.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Import a template, then add/adjust tasks to include enhanced scope items.',
          '- Populate Equipment systems to reflect expanded scope.',
          '- Use Checklists/FPT on equipment and log deficiencies as Issues.',
        ].join('\n'),
        platformLinks: [
          { title: 'Import tasks from template', to: '/app/tasks?import=1&tab=template&templateQ={projectType}' },
          { title: 'Open Equipment', to: '/app/equipment' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      },
    ]
    if (pt === 'LEED Enhanced Cx with Envelope') {
      extra.push({
        id: 'leed-enh-110',
        category: 'Envelope',
        title: 'Capture envelope-related verification activities and findings',
        description: 'Document envelope reviews/inspections and track findings to closure.',
        guidance: 'Use activities for inspections and attach photos/notes. Log findings as issues and track closeout.',
        platformGuidance: [
          'How to do this in CXMA:',
          '- Create an Activity for envelope inspections and attach photos/notes.',
          '- Create Issues for envelope deficiencies with recommendations and due dates.',
          '- Track closeout and attach evidence of correction.',
        ].join('\n'),
        platformLinks: [
          { title: 'Create Activity', to: '/app/activities/new' },
          { title: 'Open Activities', to: '/app/activities' },
          { title: 'Open Issues', to: '/app/issues' },
        ],
        sourceTitle: 'CXMA Platform workflow',
        sourceUrl: '',
      })
    }
    return makeGenericCxChecklistV1({
      projectType: pt,
      templateKey: pt === 'LEED Enhanced Cx' ? 'leed-enhanced-cx/v1' : 'leed-enhanced-envelope-cx/v1',
      prefix: pt === 'LEED Enhanced Cx' ? 'leed-enh' : 'leed-env',
      extraItems: extra,
    })
  }
  if (pt === 'Envelope Cx') {
    return makeGenericCxChecklistV1({
      projectType: pt,
      templateKey: 'envelope-cx/v1',
      prefix: 'env-cx',
      extraItems: [
        {
          id: 'env-cx-100',
          category: 'Envelope',
          title: 'Plan envelope inspection points and evidence requirements',
          description: 'Define inspection points, sampling, and evidence needed for the envelope scope.',
          guidance: 'Define inspection plan and recordkeeping. Use activities for site inspections and track findings in issues.',
          platformGuidance: [
            'How to do this in CXMA:',
            '- Create Tasks for each inspection milestone.',
            '- Create Activities for each inspection and attach photos/notes.',
            '- Track deficiencies as Issues to closure.',
          ].join('\n'),
          platformLinks: [
            { title: 'Open Tasks', to: '/app/tasks' },
            { title: 'Create Activity', to: '/app/activities/new' },
            { title: 'Open Issues', to: '/app/issues' },
          ],
          sourceTitle: 'CXMA Platform workflow',
          sourceUrl: '',
        },
      ],
    })
  }
  if (pt === 'Retro Cx') {
    return makeGenericCxChecklistV1({
      projectType: pt,
      templateKey: 'retro-cx/v1',
      prefix: 'retro',
      extraItems: [
        {
          id: 'retro-100',
          category: 'Investigation',
          title: 'Document existing conditions and operational issues',
          description: 'Capture baseline conditions, current issues, and opportunities for improvement.',
          guidance: 'Use site visit activities to document conditions. Log findings as issues and track them through implementation.',
          platformGuidance: [
            'How to do this in CXMA:',
            '- Create an Activity per site visit/inspection and attach photos/notes.',
            '- Create Issues for observed problems with recommendations.',
            '- Track corrective action tasks and verify results with follow-up activities/FPT where applicable.',
          ].join('\n'),
          platformLinks: [
            { title: 'Create Activity', to: '/app/activities/new' },
            { title: 'Open Issues', to: '/app/issues' },
            { title: 'Open Tasks', to: '/app/tasks' },
            { title: 'Open Equipment', to: '/app/equipment' },
          ],
          sourceTitle: 'CXMA Platform workflow',
          sourceUrl: '',
        },
      ],
    })
  }
  if (pt === 'Facility Condition Assessment') {
    return makeGenericCxChecklistV1({
      projectType: pt,
      templateKey: 'facility-condition-assessment/v1',
      prefix: 'fca',
      extraItems: [
        {
          id: 'fca-100',
          category: 'Assessment',
          title: 'Perform field assessment and record deficiencies',
          description: 'Capture observed deficiencies, photos, and recommendations for each area/system.',
          guidance: 'Use Activities to capture site walkthroughs. Create Issues for deficiencies and attach photos and recommendations.',
          platformGuidance: [
            'How to do this in CXMA:',
            '- Create an Activity for each walkthrough/area and attach photos/notes.',
            '- Create Issues for deficiencies with recommendations and priority.',
            '- Use Equipment records to organize assets by system and attach issues where relevant.',
          ].join('\n'),
          platformLinks: [
            { title: 'Create Activity', to: '/app/activities/new' },
            { title: 'Open Activities', to: '/app/activities' },
            { title: 'Open Issues', to: '/app/issues' },
            { title: 'Open Equipment', to: '/app/equipment' },
          ],
          sourceTitle: 'CXMA Platform workflow',
          sourceUrl: '',
        },
      ],
    })
  }
  return null
}

module.exports = {
  getAssistantChecklistTemplateForProjectType,
}
