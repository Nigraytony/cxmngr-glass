# CX Manager Implementation Plan & Checklist

This document combines the high-level application specification from `cxma_app_spec.md` with the detailed items in `TODO.txt`. Use it as the primary place to track progress toward a complete, production-ready product.

## How to Use This Checklist

- Change `[ ]` to `[x]` as you complete items.
- Add new items under the appropriate section as the product evolves.
- When an item comes from the original `TODO.txt`, its original number is referenced as `(TODO #n)`.
- When an item comes from `cxma_app_spec.md`, it is referenced as `(Spec section x.y)`.

### Legend

- `[ ]` Not started / needs work
- `[x]` Complete (as of last update)

---

## 0. Architecture & Tech Stack

- [ ] Confirm frontend uses Vue 3 (Composition API), Tailwind CSS, Pinia, Vue Router, and Vite, and document any deviations. (Spec 7)
- [ ] Confirm backend uses Node.js/Express with Mongoose/MongoDB and document the main API surface. (Spec 5.1–5.2)
- [ ] Ensure project structure is clean and discoverable (backend API, frontend, shared config) and documented in `README.md` or `/docs`. (Spec 8)
- [ ] Document local development, testing, and deployment workflows for the full stack. (Spec 5–7,9)

---

## 1. Dashboard & Navigation

- [x] Highlight the active page in the side panel navigation. (TODO #4)
- [x] Allow the main content area to scroll while keeping the sidebar fixed. (TODO #44)
- [x] Update the dashboard to display Tasks information. (TODO #27)
- [ ] Implement core dashboard widgets: Issue Log Summary, Checklist Summary, Functional Test Summary. (Spec 2)
- [ ] Implement dashboard widgets for: systems/equipment with the most issues, activities with the most issues/equipment, spaces with the most issues/equipment. (Spec 2)
- [ ] Implement metrics for average time to resolve issues and upcoming commissioning tasks on the dashboard. (Spec 2)
- [ ] Ensure dashboard content is filtered by user role and the currently active project. (Spec 2, Spec 4.3)
- [ ] Fix visual ghosting when a modal is open. (TODO #43)
- [ ] Add a footer at the bottom of the page. (TODO #45)
- [ ] Confirm SPA routes cover all major sections and are discoverable from navigation. (Spec 2, Spec 7)

---

## 2. User & Project Management

- [x] Implement Project CRUD within the app. (TODO #3)
- [x] Implement password update logic in the user profile. (TODO #5)
- [x] Show project cards in the projects tab of the user profile. (TODO #6)
- [x] Implement a "Forgot Password" flow. (TODO #7)
- [x] Ensure all new users get a "user" role on registration; admin role is granted by global/super admins only; project-based roles are separate. (TODO #35)
- [ ] Confirm email/password registration and login flows are complete and robust (validation, errors, rate limiting). (Spec 4.1)
- [ ] Implement or explicitly defer OAuth/SSO support (e.g., Google, Microsoft), documenting the decision. (Spec 4.1)
- [ ] Confirm role definitions (Admin, CxA, Architect, Engineer, contractors, client roles, Guest, etc.) match the spec and are enforced. (Spec 4.2)
- [ ] Ensure role-based access control (RBAC) determines visible data and editable features, including project-level and system-level assignments. (Spec 4.3)
- [ ] Ensure tasks can be assigned per user and can be filtered by assignee and project. (Spec 4.3)

---

## 3. Issues Log

- [x] Load Issues data from the database instead of static seed issues. (TODO #1)
- [x] Keep all Issue interactions (create, update, close, comments) on the Issues page. (TODO #2)
- [ ] Confirm the Issues module supports create, update, assign, and close operations, and that Issues track severity, system, assignee, due date, and status as required. (Spec 3.1)
- [ ] Add an equipment column to the Issues list, or provide an "Add column" option that includes equipment. (TODO #20)
- [ ] Fix the distorted logos in report headers so they maintain aspect ratio. (TODO #21)
- [ ] Fix the bug where Issues created from within Equipment place the equipment tag in the location field and vice versa. (TODO #39)
- [x] Fix the photo upload issue in the `IssueEdit` Photos tab. (TODO #41)
- [ ] Ensure Issues-related reports support PDF and CSV export, aligned with the Reporting requirements. (Spec 3.5)

---

## 4. Equipment & Templates

- [ ] Confirm the Equipment model includes: attributes, components, photos, attachments, checklists, FPTs, issues, logs, and metadata, and is linked to Spaces and Activities. (Spec 3.2)
- [x] Fix the equipment selection behavior when multiple assets share the same tag on a project (e.g., in Activities/Issues). (TODO #10)
- [x] Investigate and fix why the Equipment list is being filtered when there is no filter applied. (TODO #15)
- [x] Add charting in the Equipment module to track progress (e.g., collapsible panel with charts and percentages for equipment, checklists, and functional tests). (TODO #16)
- [ ] Fix multi-file upload support on the Equipment Photos/File Upload tabs. (TODO #17)
- [ ] Implement bulk-edit for Equipment, including selecting which fields to update and checkbox selection of Equipment items. (TODO #18)
- [ ] Add an Equipment reporting component to select which fields/tabs to include and in what order. (TODO #19)
- [x] Add the ability to upload templates from CSV or XLSX files. (TODO #42)
- [ ] Confirm reusable Equipment templates can be used to bulk create/update Equipment and are manageable via the UI. (Spec 3.2)

---

## 5. Spaces

- [x] Display all locations as a breadcrumbed hierarchy in the Spaces module. (TODO #14)
- [ ] Confirm Spaces represent building, floor/level, room, and area, and support nested hierarchies: building → floor/level → room/area (and variants). (Spec 3.3)
- [ ] Ensure Spaces can contain many Equipment, Issues, Attachments, Attributes, Settings, Logs, and Metadata. (Spec 3.3)
- [ ] Add views or analytics to show spaces with the most issues/equipment (and integrate with dashboard widgets). (Spec 2, Spec 3.3)

---

## 6. Activities

- [x] Do not filter Activities by project list; only Activities for the default project need to be available. (TODO #8)
- [x] Add filtering on Activity Type and Start Date. (TODO #9)
- [x] Fix the Equipment list for Activities when there are assets with the same tag on a project so selection is deterministic. (TODO #10)
- [x] Add pagination to the Activities page and provide a list view mode. (TODO #11)
- [ ] Confirm Activities support photos, many Equipment, Issues, comments, attachments, settings, logs, metadata, and sub-activities (action items). (Spec 3.4)
- [ ] Add analytics or dashboard views for Activities with the most issues/equipment. (Spec 2, Spec 3.4)

---

## 7. Tasks & Scheduling

- [ ] Ensure Tasks support statuses: Open, In Progress, Complete, and that status changes are tracked. (Spec 3.6)
- [ ] Implement review and approval workflows per Task or section where appropriate. (Spec 3.6)
- [x] Add Task Templates (admin-managed) and allow Premium users to import Tasks from a template or upload custom MS Project XML. (Spec 3.6)
- [x] Add admin management UI for Task Templates at `/admin/templates/task-templates`. (Spec 5.2, Spec 7)
- [x] Remove the Gantt feature for now; plan to revisit later. (TODO #46)
- [ ] Revisit and reimplement a Gantt-style view once core Task workflows are stable. (TODO #25)
- [ ] Implement a 1:1 relationship between Tasks and Activities so a completed Activity marks the Task complete. (TODO #26)
- [ ] Add an attractive calendar view for Tasks. (TODO #28)
- [ ] Implement exporting Tasks to XLSX, CSV, XML, MPP, and PDF formats. (TODO #29)
- [x] Ensure "Collapse All" still shows at least one Task. (TODO #47)
- [x] Add an opt-out of auto cost to each Task. (TODO #48)
- [ ] Add an optional Travel section to each Task to help calculate travel cost when needed. (TODO #49)
- [ ] Refactor the Task list into a reusable component and use it for LEED/Fundamental/Enhanced Cx Tasks, Project Tracking, and Proposals. (TODO #50)
- [ ] Ensure "Upcoming commissioning tasks" appear on the dashboard based on Task dates and status. (Spec 2)

---

## 8. Checklists & Functional Performance Tests (FPTs)

- [ ] Confirm checklist data model is tied to specific systems or Equipment and supports comments, Issues, and status values (Pass/Fail/NA). (Spec 3.2)
- [ ] Implement or validate UI for authoring and completing checklists per Equipment/system. (Spec 3.2)
- [ ] Confirm FPTs have a separate structure from checklists and support step-by-step tests with expected vs actual results and outcomes. (Spec 3.2)
- [ ] Implement FPT authoring, execution, and result capture UI. (Spec 3.2)
- [ ] Integrate checklist and FPT status into Equipment, Spaces, Activities, and Dashboard views. (Spec 2, Spec 3.2–3.4)

---

## 9. Reporting & Analytics

- [ ] Implement PDF export for key reports (Issues, Equipment, Activities, Tasks, Checklists, FPTs). (Spec 3.5)
- [ ] Implement CSV export for key datasets where appropriate. (Spec 3.5)
- [ ] Implement charts/analytics for issue trends and resolution times. (Spec 3.5)
- [x] Add analytics for Equipment/checklist/FPT completion (potentially overlapping with Equipment charts). (Spec 3.2, TODO #16)
- [ ] Add dashboard visualizations for systems/equipment with the most Issues. (Spec 2)
- [ ] Add dashboard visualizations for Activities and Spaces with the most Issues/equipment. (Spec 2)
- [ ] Add a metric for average time to resolve Issues with filters (by project, system, assignee, etc.). (Spec 2)

---

## 10. Email & Notifications

- [ ] Build out email functionality for key commissioning workflows (Issues created/updated/closed, Tasks assigned/overdue, Activities scheduled/updated, password reset, invitations, billing events). (TODO #30, Spec 3.6, Spec 4, Spec 5.3)
- [ ] Create an Email module to create/modify email templates for the different email types. (TODO #31)
- [ ] Configure and verify SMTP/email service (e.g., via Azure or equivalent) for production and staging. (TODO #36)

---

## 11. Billing & Stripe

- [x] Update Stripe implementation so that it is accurate and complete for project subscriptions. (TODO #32)
- [x] Add a Transactions tab for each project to view all past transactions on that project. (TODO #32 duplicate – transactions tab)
- [ ] Configure live Stripe account with feature-based subscriptions, coupons, and discounts. (TODO #33)
- [x] Enable features based on subscription level. (TODO #51)
- [ ] Confirm pricing models (Standard: \$29/basic, \$49/project, Pro: \$79/project) and ensure they align with plan features and UI copy. (Spec 5.3)
- [ ] Ensure admin pages provide a window into projects and billing with appropriate access control (consent token/key, roles). (TODO #34, Spec 4, Spec 5.3)

---

## 12. Administration & DevOps

- [ ] Build out admin pages for super/global admins to view and manage projects and billing using a consent token/key or equivalent mechanism. (TODO #34)
- [x] Ensure global/super admin roles are distinct from project-based roles; new users default to "user". (TODO #35)
- [ ] Set up and verify email/SMTP service on Azure (or chosen provider), integrated with the Email module. (TODO #36)
- [ ] Purchase and configure a production domain name (e.g., `cxma.io`) and tie it to the app hosting environment. (TODO #37)
- [ ] Create a CxMa legal entity and document compliance requirements for billing and data handling. (TODO #38)
- [ ] Offload photo and file storage from the server to a cloud object storage service (e.g., S3 or Azure blob equivalent) and update the app to use it. (TODO #52)
- [ ] Ensure Node.js/Express backend and MongoDB deployment are production-ready (backups, monitoring, environment variables, secrets management). (Spec 5.1–5.2)
- [ ] Implement local caching/offline support where appropriate to support PWA behavior. (Spec 5.2, Spec 6)
- [ ] Confirm PWA installability (manifest, service worker) and define expected offline behavior for main flows. (Spec 6)
- [ ] Keep documentation of the architecture and deployment environments up to date. (Spec 5–7)
- [ ] Setup and configure a database backup strategy.

---

## 13. Documentation, Tagging, Logging & Help

- [ ] Implement a tagging feature across the app (Issues, Equipment, Activities, Tasks, etc.) to support fast search and filtering. (TODO #22)
- [ ] Implement a robust documentation and FAQ module for the app that covers both app usage and commissioning (Cx) concepts. (TODO #23)
- [ ] Finish application logging so that key actions and events are captured for transparency, auditing, and research, with appropriate privacy safeguards. (TODO #24)
- [ ] Expose logs or summaries in admin views where appropriate (e.g., per user, per project) while respecting RBAC. (TODO #24)
- [ ] Ensure documentation covers role-based access, the data model (Issues, Equipment, Spaces, Activities, Tasks, FPTs), billing, and integrations. (Spec 3–5)

---

## 14. Cross-Cutting UI, Lists & Bugs

- [x] Persist table sorting per session for all relevant list views. (TODO #12)
- [x] Persist pagination "per page" selections per session. (TODO #13)
- [x] Show a spinner when entering Edit pages while they load. (TODO #40)
- [x] Fix dropdown lists that show white text on a white background throughout the app. (TODO #56)
- [ ] Perform a UI QA pass for consistent spacing, typography, and responsiveness across modules (desktop, tablet, mobile). (Spec 6)

---

## 15. Future: Mobile, Desktop & AI

- [ ] Investigate options to create a mobile app experience from the web app (e.g., PWA installability, wrappers, or native clients). (TODO #53)
- [ ] Investigate options to provide a desktop app experience based on the existing web app. (TODO #54)
- [ ] Design a post-MVP blueprint/PDF ingestion workflow that reads uploaded drawings and proposes draft Spaces/Equipment lists for user review, integrated with the existing data model. (TODO #55)
