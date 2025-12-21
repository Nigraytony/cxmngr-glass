# Project Specification: Commissioning Dashboard Application

## 1. Overview

**Purpose**: To provide software tools for building systems commissioning agents to:

- Create and manage equipment checklists
- Track and resolve commissioning issues
- Build and execute functional performance tests (FPTs)

**Users**: Building commissioning professionals including contractors, engineers, and clients.

**Platform**: Responsive, PWA-compatible SPA built with Vue.js Composition API.

---

## 2. Dashboard Layout

- **Dashboard Widgets**:
  - Issue Log Summary
  - Checklist Summary
  - Functional Test Summary
  - System/Equipment with the Most Issues
  - Average Time to Resolve Issues
  - Upcoming Commissioning Tasks
  - Activities with the most Issues/Equipment
  - Spaces with the most Issues/Equipment
- **SPA (Single Page Application)**: Yes
- **Content Filters**:
  - Based on **user role**
  - Based on **currently active project**

---

## 3. Functional Features

### 3.1 Issues Log

- Create, update, assign, and close issues
- Track attributes: severity, system, assignee, due date, status

### 3.2 Assets/Equipment

- Equipment exist in Spaces on the project
- Equipment has a list of Attributes, Components, Photos, Attachments (documents), Checklists, FPTs (functional tests), Issues, Logs, Metadata
- Create/Update/Delete reusable equipment templates that can be used to bulk create/update Equipment.
- Checklist tied to specific systems or equipment. Filled/completed by team member, usually contractors.
- Checklists support comments, issues, and status (Pass/Fail/NA).
- FPTs have separate structure from checklists.
- FPTs have step-by-step tests with expected vs. actual results.

### 3.3 Spaces

- Spaces model/represent the diferent spaces in a building
- Types of spaces: Building, Floor or Level, Room, Area
- Spaces have: sub-spaces (other spaces), many equipment, Issues, Attachments, Attributes, Settings, Logs, Metadata
- Heirarchy of spaces is building->floor (or level)->room->area.Or building->floor (or level)->area->room.

### 3.4 Activities

- Activities are the different things that the commissioning agent/authority does during a contruction project.
- Types of activities include: Reviews (Design Review, Submittal Review, Installation Review, etc), Site Vists, Cx Meetings, Functional Tests, etc.
- Activities have: Photos, many Equipment, Issues, Comments,  Attachments, Settings, Logs, Metadata
- Activities can have several sub-activities (Action Items)

### 3.5 Reporting

- Exportable as PDF and CSV
- Charts/analytics: issue trends, resolution times

### 3.6 Workflow Support

- Support for task statuses: Open, In Progress, Complete
- Review and approval process per task or section

---

## 4. User Management & Authentication

### 4.1 Authentication

- Email/password
- OAuth/SSO support (e.g., Google, Microsoft)

### 4.2 Roles

- Admin
- CxA
- Architect
- Engineer
- General Contractor
- Electrical Contractor
- Mechanical Contractor
- Plumbing Contractor
- TAB Contractor
- Controls Contractor
- User Agency
- Client
- Client Representative
- Guest

### 4.3 Role-Based Access Control (RBAC)

- Role determines visible data and editable features
- Users can be assigned to specific projects and systems
- Tasks can be assigned per user

---

## 5. Backend & Data

### 5.1 Backend

- **Node.js / Express** backend bundled with the Agent Mode project

### 5.2 Database

- **MongoDB** (NoSQL)
- Local caching/offline support: **Enabled (recommended)**

### 5.3 APIs & Integration

- No external API exposure initially
- **Stripe** used for subscriptions:
  - Standard Plan: \$49/project
  - Pro Plan: \$79/project

---

## 6. Platform & Devices

- Platform: Desktop, Tablet, Mobile
- Responsive & touch-friendly: Yes
- PWA: Installable + offline support

---

## 7. Technical Stack

- **Vue 3 (Composition API)**
- **Tailwind CSS** for UI styling
- **Pinia** for state management
- **Vue Router** for navigation
- **PDF generation**: Client-side only

---

## 8. File Structure (Suggested)

```
/agent-mode-project
├── backend
│   └── index.js
├── frontend
│   ├── components
│   ├── pages
│   ├── router
│   ├── store
│   ├── App.vue
│   └── main.js
├── public
├── .env
└── README.md
```

---

## 9. Next Steps

- Set up project scaffolding in VS Code Agent Mode
- Initialize backend and frontend in parallel
- Define role permissions and checklist/FPT schemas
- Begin with mock data for dashboard rendering
- Integrate Stripe billing
