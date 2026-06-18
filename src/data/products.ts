// ═══════════════════════════════════════════════════════════════════
// SWIFTVERSE PRODUCTS CONFIG
// Built from Swiftverse Stack 2026 — all sheets fully internalised
//
// Architecture:
//   TYPE 1 — VSK Packages (modular governance platforms)
//   TYPE 2 — VAI Packages (standalone PAB-ready bundles)
//   TYPE 3 — Individual modules (single bot/component proposals)
//
// To add a product: copy one object block, paste at the end.
// ═══════════════════════════════════════════════════════════════════

export const PRODUCTS: any[] = [

  // ────────────────────────────────────────────────────────────────
  // TYPE 1: VSK PACKAGES — modular governance platforms
  // ────────────────────────────────────────────────────────────────

  {
    id: "vsk1",
    type: "vsk",
    name: "VSK 1.0",
    tagline: "Samiksha",
    description: "Enabling reliable analysis",
    version: "1.0",
    pabHead: "Quality Intervention, Teacher Education, Assessment Reform",
    objective: "Establish a foundational data-driven governance system for education by integrating core administrative and academic data sources.",
    insightsStack: "IDP 1.0 — State-level KPI dashboard for foundational governance reforms",
    modules: [
      { id: "cloud", name: "State Owned Cloud Infrastructure", mandatory: true, pab: "Quality Intervention", unit: "Per State/Year", tags: ["infrastructure"] },
      { id: "attendance_students", name: "Smart Attendance — Students", mandatory: false, pab: "Quality Intervention", unit: "Per School/Year", tags: ["attendance","application"] },
      { id: "attendance_teachers", name: "Smart Attendance — Teachers", mandatory: false, pab: "Quality Intervention", unit: "Per School/Year", tags: ["attendance","application"] },
      { id: "mdm", name: "Mid-Day Meal (MDM) Dashboard", mandatory: false, pab: "Quality Intervention", tags: ["dashboard"] },
      { id: "nipun_bot_1", name: "NIPUN Bot 1.0 (Classroom Progress, Student Observation, Assessments)", mandatory: false, pab: "Quality Intervention", tags: ["bot","fln","assessment"] },
      { id: "weekly_practice_1", name: "Weekly Practice 1.0 (State-level homework + remedial content scheduling)", mandatory: false, tags: ["bot","fln"] },
      { id: "shikshak_sahayak_1", name: "Shikshak Sahayak 1.0 (Standard Remedial TLM — LP, Worksheets, Videos)", mandatory: false, tags: ["bot","teacher"] },
      { id: "fmb_1", name: "Field Monitoring Bot (FMB) — surveys, photo/video evidence, custom form builder", mandatory: false, pab: "Quality Intervention", tags: ["bot","monitoring"] },
      { id: "pat_1", name: "PAT 1.0 / SBA — Manual Data Digitisation", mandatory: false, pab: "Quality Intervention", tags: ["assessment","application"] },
      { id: "parent_connect_1", name: "Parent Connect 1.0 (FAQ)", mandatory: false, pab: "Quality Intervention", tags: ["bot","parent"] },
      { id: "media_mgmt", name: "Media Management", mandatory: false, tags: ["service"] },
      { id: "consultant", name: "Consultant Service", mandatory: false, tags: ["service"] }
    ],
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: VSK 1.0 — "Samiksha" (Enabling Reliable Analysis)
Tagline: Samiksha — rigorous analysis as the foundation of governance reform.

Objective: Establish a foundational data-driven governance system for education by integrating core administrative and academic data sources. VSK 1.0 is the entry point to CG's Swiftverse ecosystem.

VSK 1.0 Philosophy: VSKs do not reinvent the wheel — they amplify the impact of existing systems, help identify gaps and allow for targeted interventions.

Core principle from Notes: "Every state will pick 2-3 innovations amounting to max 3.5 Cr per state. Only mention Tech development and not Usage."

Analytics layer — IDP 1.0: Provides state-level stakeholders with a unified view of key performance indicators (KPIs) for foundational governance reforms.

Key differentiators:
- NIPUN Bot assessment is always formative for teachers, summative for third party/CG
- Smart Attendance uses geo-tagging from day one
- All applications hosted on state-owned cloud infrastructure (mandatory)
- Plugs into UDISE+, APAAR, DIKSHA without reinventing
- Proven deployments: Gujarat (National Innovation Award from PM), HP, Rajasthan, Delhi, Assam, Maharashtra, Uttarakhand, Goa, Sikkim

Write in formal Government of India document language. Reference Samagra Shiksha, NEP 2020, NIPUN Bharat where relevant. Be specific about the modules selected and their PAB heads. Only write about modules that are included in this proposal — do not assume all modules are selected unless told so.`
  },

  {
    id: "vsk2",
    type: "vsk",
    name: "VSK 2.0",
    tagline: "Samiksha se Sudhar",
    description: "Taking analysis to action",
    version: "2.0",
    pabHead: "Quality Intervention, Teacher Education, Assessment Reform",
    objective: "Enable decentralised decision-making and integration of data systems, fostering cross-validation and actionable insights across all administrative levels.",
    insightsStack: "IDP 2.0 — Extends to district, block, cluster levels + Story Dashboard showing correlations and causations (for policy-level decision making)",
    modules: [
      { id: "cloud", name: "State Owned Cloud Infrastructure", mandatory: true, pab: "Quality Intervention", unit: "Per State/Year", tags: ["infrastructure"] },
      { id: "data_lake", name: "Data Lake Formation", mandatory: true, pab: "Quality Intervention", tags: ["infrastructure","data"] },
      { id: "attendance_online_students", name: "Online Geo-Tagged Smart Attendance — Students", mandatory: false, pab: "Quality Intervention", tags: ["attendance","application"] },
      { id: "attendance_online_teachers", name: "Online Geo-Tagged Smart Attendance — Teachers", mandatory: false, pab: "Quality Intervention", tags: ["attendance","application"] },
      { id: "attendance_offline_students", name: "Offline Attendance with Geo-tagging — Students", mandatory: false, pab: "Quality Intervention", tags: ["attendance","offline"] },
      { id: "attendance_offline_teachers", name: "Offline Attendance with Geo-tagging — Teachers", mandatory: false, pab: "Quality Intervention", tags: ["attendance","offline"] },
      { id: "mdm", name: "Mid-Day Meal (MDM) Dashboard", mandatory: false, pab: "Quality Intervention", tags: ["dashboard"] },
      { id: "nipun_bot_2", name: "NIPUN Bot 2.0 with ORF Integration (Oral Reading Fluency)", mandatory: false, pab: "Quality Intervention", tags: ["bot","fln","assessment","ai"], note: "NIPUN assessment: formative for teachers, summative for third party/CG" },
      { id: "weekly_practice_2", name: "Weekly Practice 2.0 (Re-practice same LO to show delta improvement week-on-week)", mandatory: false, tags: ["bot","fln"], note: "Re-practice on same LO to show delta improvement — 'practice makes perfect'" },
      { id: "shikshak_sahayak_2", name: "Shikshak Sahayak 2.0 (Personalised Remedial TLM linked to PAT data, Homework Scheduling, Class/Student/Question level Reports)", mandatory: false, tags: ["bot","teacher"] },
      { id: "fmb_offline", name: "FMB Offline — School Inspection (with geo-tag, photo/video, custom form builder)", mandatory: false, pab: "Quality Intervention", tags: ["bot","monitoring","offline"] },
      { id: "pat_2", name: "PAT 2.0 / SBA with AI-Based OCR Assessments (Worksheet + MCQ Format)", mandatory: false, pab: "Quality Intervention", tags: ["assessment","ai","ocr"], note: "Requires CAMS as dependency for question bank and content" },
      { id: "parent_connect_2", name: "Parent Connect 2.0 (Surveys, Feedback, Student Report Cards, APAAR consent)", mandatory: false, pab: "Quality Intervention", tags: ["bot","parent"] },
      { id: "data_review", name: "Data Review System (Dynamic forms with editor/approver access)", mandatory: false, pab: "Quality Intervention", tags: ["platform","data"] },
      { id: "mis_1", name: "MIS 1.0 — Registry Management, Student Transfer, Grade Progression, User Access Management", mandatory: false, pab: "Quality Intervention", tags: ["platform","mis"] },
      { id: "inventory", name: "Inventory Management (Sports/Library/General) with Procurement Recommendations", mandatory: false, pab: "Quality Intervention", tags: ["platform"] },
      { id: "fund_flow", name: "Fund Flow Management — utilisation/verification alerts", mandatory: false, pab: "Quality Intervention", tags: ["platform"] },
      { id: "tims", name: "TIMS — Teacher Information Management System (lifecycle history, retirement planning, rationalisation planning)", mandatory: false, pab: "Teacher Education", tags: ["platform","teacher"], note: "Leave Management: State is default view; district/block officers can change it in the bot" },
      { id: "teacher_leave", name: "Teacher Leave Management + HR Capabilities", mandatory: false, tags: ["platform","teacher"] },
      { id: "plc_1", name: "PLC 1.0 — CPD Management (self training creation, geo-tagged attendance, feedback, content sharing, MT view)", mandatory: false, pab: "Teacher Education", tags: ["platform","teacher","tpd"] },
      { id: "tpd_bot", name: "TPD Bot (Content Sharing, Quizzes, Certification)", mandatory: false, pab: "Teacher Education", tags: ["bot","teacher","tpd"] },
      { id: "cams", name: "CAMS — Content & Assessment Management System (State Knowledge Graph, PAT Question Paper Generation, content for SwiftClass, Weekly Practice 2.0, Shikshak Sahayak 2.0)", mandatory: false, pab: "Quality Intervention", tags: ["platform","cms"], note: "CMS is the backbone — required if PAT 2.0, Shikshak Sahayak 2.0, or Weekly Practice 2.0 are selected" },
      { id: "cams_ocr", name: "CAMS OCR — Assessment Automation / Practice Worksheet Generation", mandatory: false, pab: "Quality Intervention", tags: ["platform","cms","ai","ocr"] },
      { id: "live_reports_1", name: "Live Reports 1.0 (Administrators and HMs only — Accreditation, Attendance, Class Assessment Reports)", mandatory: false, pab: "Quality Intervention", tags: ["dashboard","ai"] },
      { id: "school_accreditation", name: "School Accreditation (Faceless + Limited Self Reporting & Auditing)", mandatory: false, pab: "Quality Intervention", tags: ["platform"] },
      { id: "data_integration_partners", name: "Data Integration & Triangulation — Non-Govt Actors/Partners", mandatory: false, tags: ["integration"] },
      { id: "data_integration_depts", name: "Data Integration — Other Departments (WCD, Tribal, Social Welfare, Health)", mandatory: false, tags: ["integration"] },
      { id: "media_mgmt", name: "Media Management", mandatory: false, tags: ["service"] },
      { id: "consultant", name: "Consultant Service", mandatory: false, tags: ["service"] }
    ],
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: VSK 2.0 — "Samiksha se Sudhar" (Taking Analysis to Action)
Tagline: From rigorous analysis to targeted, decentralised action.

Objective: Enable decentralised decision-making and integration of data systems, fostering cross-validation and actionable insights across state, district, block and school levels.

VSK 2.0 Philosophy: VSK 2.0 is where governance transitions from data collection to action. The platform integrates all state education data into a unified layer, then pushes actionable insights down to the last mile.

Analytics layer — IDP 2.0: Extends KPI-centred insights to district, block, and cluster levels for triangulated data analysis and local-level ownership. Additionally, a Story Dashboard shows all relevant correlations and causations for policy-level decision-making.

Critical technical notes to incorporate correctly:
- NIPUN Bot assessment: always formative for teachers, summative for third party/CG
- CAMS is the backbone dependency — required when PAT 2.0, Shikshak Sahayak 2.0, or Weekly Practice 2.0 are selected
- Weekly Practice 2.0 shows delta improvement week-on-week (practice makes perfect)
- Leave Management: State is default view; district/block officers can change it in the bot
- Student-level live reports are in 3.0, not 2.0 (Live Reports 1.0 = admins/HMs only)
- STEM AI Assistants are surround support only — no payment tagging, not core to VSK 2.0
- All systems hosted on Samagra Shiksha Server / State SDC

Flagship reference: Maharashtra Unified Education Governance System (MUEGS) — 89,169 schools, 4,99,040 teachers, 1,46,03,967 students. HP Vidya Utkarsh — ₹16.08 Cr, QCBS 80:20.

Three-pillar architecture: VSK-enabled Analysis to Action + Assessment Reforms + Teacher Professional Development Reforms.

Important: Only write about modules that are actually selected/included in this proposal. If the user has excluded OCR assessments, do not reference PAT 2.0 OCR. Be precise about what is and isn't in scope.

Write in formal Government of India document language. Reference Samagra Shiksha, NEP 2020, NIPUN Bharat, APAAR, UDISE+ where relevant.`
  },

  {
    id: "vsk3",
    type: "vsk",
    name: "VSK 3.0",
    tagline: "Sudhar se Safalta",
    description: "Advancing actions to achievement",
    version: "3.0",
    pabHead: "Quality Intervention, Teacher Education, Assessment Reform",
    objective: "Leverage AI-driven analytics to build a holistic ecosystem connecting education to employment, ensuring seamless student progress tracking and impact analysis.",
    insightsStack: "IDP 3.0 — Talk to your data (Swiftee), AI Alerts, Auto Notifications, AI Call Agents, Live Reports with Swiftee reading assistant",
    modules: [
      { id: "cloud", name: "State Owned Cloud Infrastructure + Data Lake", mandatory: true, tags: ["infrastructure"] },
      { id: "attendance_frs", name: "Facial Recognition based Attendance — Teachers and Students (group audits, leave management at state/district/block level)", mandatory: false, pab: "Quality Intervention", tags: ["attendance","ai","biometric"] },
      { id: "attendance_online", name: "Online Geo-Tagged Smart Attendance — Students and Teachers", mandatory: false, tags: ["attendance"] },
      { id: "attendance_offline", name: "Offline Attendance — Students and Teachers", mandatory: false, tags: ["attendance","offline"] },
      { id: "mdm", name: "Mid-Day Meal (MDM) Dashboard", mandatory: false, tags: ["dashboard"] },
      { id: "nipun_bot_2", name: "NIPUN Bot 2.0 with ORF Integration", mandatory: false, tags: ["bot","fln","ai"] },
      { id: "weekly_practice_3", name: "Weekly Practice 3.0 — Agent-led student practice and remedial journey", mandatory: false, tags: ["bot","ai","agent"] },
      { id: "shikshak_sahayak_3", name: "Shikshak Sahayak 3.0 — Agent-led teacher classroom support", mandatory: false, tags: ["bot","teacher","ai","agent"] },
      { id: "fmb_2", name: "FMB 2.0 Offline — Calendarisation and process automation of school inspection", mandatory: false, tags: ["bot","monitoring","ai"] },
      { id: "pat_2_ai", name: "PAT 2.0 with Digital Auto-updated HPC, Subjective OCR, Sentimental/Socio-Emotional Analytics", mandatory: false, tags: ["assessment","ai","ocr"] },
      { id: "parent_connect_2", name: "Parent Connect 2.0 + Digital PTM", mandatory: false, tags: ["bot","parent"] },
      { id: "srm", name: "SRM — State Registry Manager (comprehensive student, teacher, school registry)", mandatory: false, tags: ["platform","mis"] },
      { id: "data_review_calendar", name: "Data Review System with Calendarisation of priority activities", mandatory: false, tags: ["platform","data"] },
      { id: "inventory", name: "Inventory Management — State to School level", mandatory: false, tags: ["platform"] },
      { id: "fund_flow", name: "Fund Flow Management — State to School level", mandatory: false, tags: ["platform"] },
      { id: "tims_3", name: "TIMS with ACR standardisation + Faceless ACR Recommendation", mandatory: false, pab: "Teacher Education", tags: ["platform","teacher"] },
      { id: "teacher_leave", name: "Teacher Leave Management + HR Capabilities", mandatory: false, tags: ["teacher"] },
      { id: "plc_2", name: "PLC 2.0 — Training invite creation, digital trainee/trainer deployment, TIMS linkages", mandatory: false, pab: "Teacher Education", tags: ["platform","teacher","tpd"] },
      { id: "tpd_bot", name: "TPD Bot (Content Sharing, Quizzes, Certification)", mandatory: false, pab: "Teacher Education", tags: ["bot","teacher","tpd"] },
      { id: "cams_ai", name: "CAMS with AI-based content creation, QC, unique remedial worksheet generation", mandatory: false, tags: ["platform","cms","ai"] },
      { id: "live_reports_2", name: "Live Reports 2.0 — APAAR Integration + Student Achievement Reports / Skill Passport", mandatory: false, tags: ["dashboard","ai"], note: "Student-level reports move to 3.0 as they become actionable with AI" },
      { id: "school_accreditation", name: "School Accreditation (Faceless + Self Reporting & Auditing)", mandatory: false, tags: ["platform"] },
      { id: "data_integration", name: "Data Integration — Non-Govt Actors + Other Departments (WCD, Tribal, Health) with AI", mandatory: false, tags: ["integration","ai"] },
      { id: "scholarships", name: "Scholarships Management — Performance-linked disbursal", mandatory: false, tags: ["platform"] },
      { id: "career_counseling", name: "Career Counseling Support — Post-assessment counselling", mandatory: false, tags: ["platform","ai"] },
      { id: "skills_integration", name: "Integration with Skills and Higher Education systems", mandatory: false, tags: ["integration"] },
      { id: "swiftlens", name: "SwiftLens — GenAI contextual layer with limited credits", mandatory: false, tags: ["ai"], note: "In vernacular only when AI systems mature; good-to-have not must" },
      { id: "ai_doubt_solver", name: "AI-Powered Doubt-Solving Agents — STEM Focus (SLM)", mandatory: false, tags: ["ai","bot"], note: "Surround support only — no payment tagging, not core VSK 3.0" },
      { id: "swiftee", name: "Swiftee — Talk to your data (AI Insights Bot)", mandatory: false, tags: ["ai","dashboard"] },
      { id: "ai_notifications", name: "AI Auto Notifications + AI Call Agents", mandatory: false, tags: ["ai"] },
      { id: "media_mgmt", name: "Media Management", mandatory: false, tags: ["service"] },
      { id: "consultant", name: "Consultant Service", mandatory: false, tags: ["service"] }
    ],
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: VSK 3.0 — "Sudhar se Safalta" (Advancing Actions to Achievement)
Tagline: From targeted actions to measurable achievement — connecting school education to employment outcomes via AI.

Objective: Leverage AI-driven analytics to build a holistic ecosystem connecting education to employment, ensuring seamless student progress tracking and impact analysis across the full school-to-workforce journey.

IDP 3.0 — Insights Stack: Talk to your data (Swiftee AI bot for state and district review meetings), Live Reports with Swiftee reading assistant, AI Auto Notifications, AI Call Agents.

Key positioning: VSK 3.0 is the vision product for states with mature VSK 1.0/2.0 deployments. It introduces AI agents (not just tools), facial recognition, APAAR-linked skill passports, career counselling, and integration with higher education and skills systems.

Critical notes:
- Student-level live reports move to 3.0 where they become actionable through AI
- SwiftLens (GenAI contextual layer) — good-to-have, not must; available when AI systems mature and state data is in vernacular
- STEM AI Doubt Solving Agents — surround support only, no payment tagging, not core VSK 3.0
- Swiftee AI Insights Bot may require rethinking with Copilot integration coming

Only write about modules that are actually selected. Be precise about the AI capabilities — distinguish between agents (autonomous) vs tools (human-operated) vs dashboards (visibility only).

Write in formal Government of India document language. Reference NEP 2020, NIPUN Bharat, APAAR, NAS, PARAKH, PM SHRI, STARS where relevant.`
  },

  // ────────────────────────────────────────────────────────────────
  // TYPE 2: VAI PACKAGES — standalone PAB-ready bundles
  // ────────────────────────────────────────────────────────────────

  {
    id: "nat",
    type: "vai",
    name: "NAT++",
    tagline: "NIPUN Assessment Test",
    description: "FLN — grades Balvatika to 2",
    pabHead: "FLN — Assessment, Quality Intervention, HPC, Teacher Education",
    objective: "Focused on FLN goals (Grades Balvatika to 2), combining AI-driven chatbots and dashboards for literacy and numeracy tracking.",
    merit: "Enables real-time tracking of NIPUN Bharat objectives with reliable and scalable solutions.",
    coreModules: [
      "NIPUN Chatbot with Oral Reading Fluency (ORF) integration",
      "Assessment Tool Development (Question Paper)",
      "Assessment Data Digitisation Tool",
      "Teacher-led NIPUN Assessments",
      "Third-Party NIPUN Diagnostic Assessments",
      "Student Report Cards",
      "NIPUN TLM for Students (Print)",
      "TLM Delivery Tracking App",
      "TLM Usage Dashboard",
      "NIPUN TRM for Teachers (Print + Application)",
      "TRM Delivery Tracking",
      "NIPUN Capacity Building",
      "Digital HPC for NIPUN Grades",
      "NIPUN Progress Dashboard"
    ],
    surroundSupport: [
      "Teacher Training Administration MiniApp",
      "TPD Bot",
      "TPD Content Modules",
      "Field Monitoring Bot (any version)",
      "Shikshak Sahayak 2.0",
      "CMS"
    ],
    analytics: "Assessment Data Dashboards with Class, School, Block, District and State cuts",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: NAT++ — NIPUN Assessment Test
Full form: NAT++ (NIPUN Assessment Test)
PAB Category: FLN — Assessment, Quality Intervention, HPC, Teacher Education
Focus: Foundational Literacy and Numeracy for grades Balvatika to Grade 2

Description: Focused on FLN goals combining AI-driven chatbots and dashboards for literacy and numeracy tracking.
Merit: Enables real-time tracking of NIPUN Bharat objectives with reliable and scalable solutions.

Critical positioning note: NIPUN assessment is always formative when delivered to/by teachers, and summative when conducted by third party or CG. This distinction is important for proposal framing.

Core offering:
- NIPUN Chatbot with Oral Reading Fluency (ORF) integration — the key differentiator
- Assessment tool development (NCERT-approved format)
- Teacher-led NIPUN assessments via application
- Third-party NIPUN diagnostic assessments
- Assessment data digitisation tool
- Digital HPC (Holistic Progress Card) for NIPUN grades
- NIPUN Progress Dashboard (class, school, block, district, state cuts)
- Student Report Cards
- NIPUN TLM (Teaching Learning Materials) in print for students
- TLM delivery tracking
- NIPUN TRM (Teacher Resource Material) print + application
- Capacity building for teachers
- Professional Learning Communities

Optional surround support (flag as optional in proposal):
- Teacher Training Administration MiniApp
- TPD Bot and Content Modules
- Field Monitoring Bot
- Shikshak Sahayak 2.0
- CMS

Gateway principle: NAT++ is a standalone offering that serves as a gateway to VSK. Frame it as the evidence-generation layer that necessitates a full VSK for governance action.

Write in formal Government of India document language. Reference NIPUN Bharat, Samagra Shiksha, NEP 2020, FLN Mission, NCERT competency framework.`
  },

  {
    id: "pat",
    type: "vai",
    name: "PAT++",
    tagline: "Periodic Assessment Test",
    description: "Standardised assessments — grades 3 to 12",
    pabHead: "Assessment Reforms, Quality Interventions",
    objective: "Facilitates standardised formative and summative assessments (Grades 3–12) using CMS and OCR tools.",
    merit: "Ensures consistent evaluation across states, reducing teacher workload and enhancing data accuracy.",
    coreModules: [
      "Centralised Content Management System (CMS)",
      "OCR-Supported MiniApp/Bot for assessment digitisation",
      "Teacher-led Assessment Data Digitisation Tool",
      "Weekly Practice Module",
      "Assessment Dashboard (state, district, block cuts)",
      "Grade-level Report Cards",
      "Digital HPC for Elementary grades",
      "Digital HPC for Secondary grades",
      "Insight Dissemination Workshops",
      "Product Adoption Workshops"
    ],
    surroundSupport: [
      "Third-Party Item Creation/Validation Services",
      "Teacher Training Administration MiniApp",
      "TPD Bot",
      "Field Monitoring Tools (any version)",
      "Shikshak Sahayak 2.0",
      "Weekly Practice 2.0",
      "Professional Learning Communities",
      "Teacher Professional Development Bot"
    ],
    analytics: "Assessment Data Dashboards with Class, School, Block, District and State cuts",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: PAT++ — Periodic Assessment Test
Full form: PAT++ (Periodic Assessment Test)
PAB Category: Assessment Reforms, Quality Interventions
Focus: Standardised formative and summative assessments for grades 3–12

Description: Facilitates standardised assessments using CMS and OCR tools.
Merit: Ensures consistent evaluation across states, reducing teacher workload and enhancing data accuracy. OCR reduces evaluation time from weeks to days.

Core offering:
- Centralised Content Management System (CMS) — backbone of the assessment system
- OCR-Supported MiniApp/Bot for instant assessment digitisation
- Teacher-led Assessment Data Digitisation Tool
- Weekly Practice Module (re-practice same LO to show delta improvement)
- Assessment Dashboard (state/district/block cuts)
- Grade-level Report Cards via AI + Application
- Digital HPC for Elementary and Secondary grades
- Insight Dissemination Workshops at state/district/block level

Note: CMS is the core dependency — it powers question paper generation, content for remediation, and the OCR assessment bank. Position this prominently.

Gateway principle: PAT++ generates the assessment data that necessitates VSK for governance action.

Write in formal Government of India document language. Reference Samagra Shiksha, NEP 2020, NAS, PARAKH assessment frameworks.`
  },

  {
    id: "lat",
    type: "vai",
    name: "LAT++",
    tagline: "Learning Assessment Test",
    description: "LEP remediation — personalised handbooks for all grades",
    pabHead: "Assessment, Assessment Reform, Teacher Education",
    objective: "Supports offline remediation under LEP (Learning Enhancement Programme) for all grades through personalised handbooks driven by insights from state SATs.",
    merit: "Addresses learning gaps through targeted interventions and comprehensive monitoring leveraging already-running programs.",
    coreModules: [
      "Assessment Tool Creation (Question Paper) — Print + Service",
      "Response Sheets — Print",
      "Teacher-led Assessment Data Digitisation Tool",
      "School-led OCR-based Diagnostic Assessment",
      "Invigilator Deployment for Diagnostic Test",
      "CMS for Personalised Handbooks",
      "Pre-tagged Question Bank",
      "OCR for State SAT Integration",
      "Personalised Workbooks/Handbooks for every student",
      "Assessment Dashboard (state, district, block cuts)",
      "Grade-level Report Cards",
      "Digital HPC for Elementary and Secondary grades",
      "Insight Dissemination Workshops",
      "Product Adoption Workshops"
    ],
    surroundSupport: [
      "Weekly Practice Bot (any version)",
      "STEM AI Assistants for Doubt Solving",
      "Teacher Training Administration MiniApp",
      "TPD Bot",
      "TPD Content Modules",
      "Shikshak Sahayak 2.0",
      "Professional Learning Communities",
      "Teacher Professional Development Bot",
      "Weekly Practice 2.0"
    ],
    analytics: "Assessment Data Dashboards with Class, School, Block, District and State cuts",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: LAT++ — Learning Assessment Test
Full form: LAT++ (Learning Assessment Test)
PAB Category: Assessment, Assessment Reform, Teacher Education
Focus: Offline remediation under LEP (Learning Enhancement Programme) for all grades

Description: Supports LEP through personalised handbooks driven by state SAT insights.
Merit: Addresses learning gaps through targeted, personalised interventions leveraging already-running programs. Does not reinvent — it builds on existing state assessment investments.

The unique differentiator: Personalised Workbooks/Handbooks for every individual student based on their specific competency gaps identified in the baseline diagnostic. This is not generic remediation — it is precision intervention at scale.

Implementation context: LAT++ is typically proposed as LEP (Learning Enhancement Programme) in PAB submissions under Samagra Shiksha. Budget primarily from Samagra Shiksha's LEP component. TCIL and RailTel are common implementing partners for this product.

Core flow: Baseline diagnostic → OCR digitisation → Competency gap analysis → Personalised handbook generation → Teacher-delivered remediation → Follow-up assessment.

Reference (TCIL UK LEP proposal context): Uttarakhand positioned for NAS 2027 top-10 target, phygital remediation model, competency-based diagnostics for grades 3, 6, 9.

Write in formal Government of India document language. Reference Samagra Shiksha LEP, NIPUN Bharat, NAS 2024 data, PARAKH where relevant. Emphasise competency-based diagnostic and personalised approach.`
  },

  {
    id: "tat",
    type: "vai",
    name: "TAT++",
    tagline: "Teacher Assessment Test",
    description: "Evidence-based TPD framework",
    pabHead: "Teacher Education",
    objective: "Provides a structured framework for teacher training, monitoring, and certification.",
    merit: "Builds teacher capacity with a focus on evidence-based pedagogy and continuous professional development.",
    coreModules: [
      "Need Diagnosis Tool Creation — Print + Service",
      "Teacher Need Assessment (OCR-based)",
      "Need-based NPST-aligned Module Development",
      "Master Trainer Creation (In-person TPD)",
      "Teacher Professional Development Bot (Self-paced learning and certification)",
      "TPD Dashboard (course completion, attendance, pre/post assessment, feedback)",
      "Professional Learning Community (PLC) Application",
      "PLC Dashboard for Training Management",
      "Printed Teacher Support Module"
    ],
    surroundSupport: [
      "Expert Team for Training Content Designing (ATU)",
      "Third-Party Impact Assessment (ATU)",
      "Capacity-Building Workshops (ATU)"
    ],
    analytics: "TPD Dashboard — course completion, attendance, pre/post assessment feedback. TA Dashboard on training administration.",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: TAT++ — Teacher Assessment Test
Full form: TAT++ (Teacher Assessment Test)
PAB Category: Teacher Education
Focus: Structured framework for teacher training, monitoring, and certification

Description: Provides evidence-based TPD framework starting with rigorous needs assessment.
Merit: Builds teacher capacity with focus on evidence-based pedagogy and continuous professional development.

Key differentiator: TAT++ starts with a rigorous needs assessment before any training begins — ensuring what is taught is what teachers actually need, aligned to NPST (National Professional Standards for Teachers). This is not a generic training programme.

Core flow: Need diagnosis (OCR) → NPST-aligned module development → Master trainer creation → TPD delivery → Certification tracking → PLC for continued peer learning.

ATU context: Surround support from expert teams (ATU) for content design and third-party impact assessment can be proposed as optional budget items.

Write in formal Government of India document language. Reference NPST, NEP 2020, NISHTHA, Samagra Shiksha Teacher Education component.`
  },

  {
    id: "tpd",
    type: "vai",
    name: "TPD++",
    tagline: "Teacher Professional Development",
    description: "End-to-end standalone TPD",
    pabHead: "Teacher Education",
    objective: "End-to-end teacher professional development with digital tools and in-person training when state does not require the full VSK platform.",
    merit: "Complete training management — from need to delivery to certification tracking — in one integrated system.",
    coreModules: [
      "Focused Module Development (need-based, NPST-aligned)",
      "Master Trainer Creation (In-person TPD delivery)",
      "Teacher Professional Development Bot (Self-paced learning and certification)",
      "TPD Dashboard (state and district level)",
      "Professional Learning Community (PLC) Application",
      "PLC Dashboard for Training Management",
      "Printed Teacher Support Module",
      "FMS and State-level Planning Consultants",
      "Training Management Tools",
      "CPD Tools (TPD Bot)",
      "Delivery Support (Master Trainers)",
      "Print-rich Offline Modules"
    ],
    surroundSupport: [],
    analytics: "TPD Dashboard, PLC Dashboard",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: TPD++ — Teacher Professional Development (Standalone)
PAB Category: Teacher Education
Focus: End-to-end teacher capacity building with digital tools and in-person training

Description: Complete standalone TPD solution when state does not require the full VSK platform.
Merit: End-to-end training management from need assessment to module delivery to certification tracking. Digital + print hybrid model ensures last-mile reach.

Key differentiators vs competitors:
- Not just content delivery — includes training administration, attendance tracking, certification
- PLC (Professional Learning Community) ensures peer learning continues beyond formal training
- Digital + print hybrid model for low-connectivity environments
- FMS (Field Management System) ensures quality of in-person delivery

Write in formal Government of India document language. Reference NPST, NEP 2020, NISHTHA, Samagra Shiksha Teacher Education, PM SHRI.`
  },

  {
    id: "lsa",
    type: "vai",
    name: "LSA",
    tagline: "Large Scale Assessment",
    description: "Census-level diagnostic and evaluation",
    pabHead: "Assessment Reform, Quality Intervention",
    objective: "Large-scale census-level diagnostic assessment with third-party invigilation, statistical analysis, and remediation guidance.",
    merit: "Independent, unbiased, census-scale evidence generation for policy-level decision-making.",
    coreModules: [
      "Printed Diagnostic Tool Development",
      "Response Sheets — Print",
      "Assessment Invigilation (AI-assisted + Service)",
      "Invigilator Training Program",
      "Diagnosis Dashboard",
      "Diagnostic Reporting",
      "Remediation Posters",
      "Insight Dissemination Workshop"
    ],
    surroundSupport: [],
    analytics: "Diagnosis Dashboard, State-level Diagnostic Reporting",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: LSA — Large Scale Assessment
PAB Category: Assessment Reform, Quality Intervention
Focus: Census-level diagnostic assessment with third-party invigilation

Description: Independent, census-scale diagnostic assessment for policy-level evidence generation.
Merit: Provides unbiased, statistically robust evidence of learning levels at scale — the foundation for any evidence-based remediation intervention.

Context: LSA is typically proposed as a standalone baseline/endline evaluation, often used to establish the need for other interventions (NAT++, PAT++, LAT++) or to measure their impact. It is not an ongoing system — it is an episodic, high-credibility measurement exercise.

Write in formal Government of India document language. Reference NAS, PARAKH, NIPUN Bharat assessment frameworks, state-level evaluation policies.`
  },

  {
    id: "swiftschool",
    type: "vai",
    name: "SwiftSchool",
    tagline: "360° school ecosystem",
    description: "SwiftPAL + SwiftClass + SwiftChat — grades 1 to 12",
    pabHead: "Quality Intervention",
    objective: "Combines adaptive learning (SwiftPAL), hyper-interactive teaching (SwiftClass), and AI-assisted at-home learning (SwiftChat) for Grades 1–12.",
    merit: "Creates a 360-degree learning ecosystem aligned with NEP 2020, fostering personalised education and data-driven teaching.",
    coreModules: [
      "SwiftPAL — Personalised Adaptive Learning System (classroom/lab)",
      "SwiftClass — Hyper-interactive Content Modules (classroom delivery)",
      "SwiftChat — AI Chatbot for STEM/Language Doubt-Solving (at-home, WhatsApp-based)"
    ],
    surroundSupport: [
      "Field Monitoring and Technical Support",
      "Field Monitoring Bot (any version)"
    ],
    analytics: "SwiftPAL Dashboards for Teachers, SwiftClass Content Utilisation Dashboards, MDM Dashboards",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: SwiftSchool
PAB Category: Quality Intervention
Description: Combines three integrated products into a 360-degree learning ecosystem for grades 1–12.
Merit: Creates a 360-degree learning ecosystem aligned with NEP 2020, fostering personalised education and data-driven teaching.

Three components:
1. SwiftPAL (Personalised Adaptive Learning) — AI-driven adaptive engine adjusting content difficulty in real time. Works offline/low-connectivity. Covers grades 3–10, core subjects. Proven NAS/PARAKH improvement.
2. SwiftClass (Interactive Content Modules) — Hyper-interactive classroom content aligned to state curriculum. Subject-specific digital content. Content utilisation dashboards.
3. SwiftChat (AI Chatbot for STEM/Language) — WhatsApp-based, zero app download, works on 2G, at-home doubt solving. The most accessible delivery channel.

Note: All three can also be sold separately (SwiftPAL, SwiftClass, SwiftSkill). SwiftSchool is the bundle proposal.

Write in formal Government of India document language. Reference NEP 2020, Samagra Shiksha, NAS, PARAKH where relevant.`
  },

  {
    id: "swiftpal",
    type: "vai",
    name: "SwiftPAL",
    tagline: "Personalised Adaptive Learning",
    description: "AI-driven adaptive learning platform — grades 3 to 10",
    pabHead: "Quality Intervention",
    objective: "AI-powered adaptive learning that adjusts content difficulty in real time based on student learning level, pace, and gaps.",
    merit: "Personalised learning at scale — each student gets the right content at the right level. Proven NAS/PARAKH improvement.",
    coreModules: [
      "Adaptive learning engine (real-time content difficulty adjustment)",
      "Grades 3–10 coverage — Maths, Science, Languages",
      "Offline/low-connectivity capability",
      "Student-level learning reports for teachers",
      "School/class level dashboards for Head Masters",
      "NCERT and state curriculum alignment",
      "Teacher dashboards for learning outcome tracking"
    ],
    surroundSupport: ["Field Monitoring and Technical Support"],
    analytics: "SwiftPAL Dashboards for Teachers and HMs, Student Proficiency Reports",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: SwiftPAL — Personalised Adaptive Learning
PAB Category: Quality Intervention
Focus: AI-driven adaptive learning for grades 3–10 in school computer labs or on tablets

Description: AI-powered adaptive learning engine adjusting content to each student's level.
Merit: Personalised learning at scale with proven improvement in NAS/PARAKH scores.

Key differentiators:
- Not one-size-fits-all: adapts in real time to each student's demonstrated competency
- Works offline — critical for Tier 2/3 school lab environments
- NCERT + state curriculum aligned
- Teacher visibility: dashboards show which students need intervention

Write in formal Government of India document language. Reference NEP 2020, NAS, PARAKH, Samagra Shiksha where relevant.`
  },

  {
    id: "swiftclass",
    type: "vai",
    name: "SwiftClass",
    tagline: "Hyper-interactive classroom content",
    description: "Interactive digital content for classroom delivery",
    pabHead: "Quality Intervention",
    objective: "Hyper-interactive, curriculum-aligned digital content for classroom delivery via smart boards and projectors.",
    merit: "Transforms classroom instruction with interactive content that increases student engagement and teacher confidence.",
    coreModules: [
      "Subject-specific interactive content modules",
      "State curriculum and NCERT alignment",
      "Smart board / projector compatible delivery",
      "Content utilisation dashboards",
      "Teacher training on content usage"
    ],
    surroundSupport: ["CMS for content updates and additions"],
    analytics: "SwiftClass Content Utilisation Dashboards",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government school education.

PRODUCT: SwiftClass — Hyper-interactive Classroom Content
PAB Category: Quality Intervention
Focus: Interactive digital content for classroom delivery

Description: Hyper-interactive teaching content for classroom use via smart boards/projectors.
Merit: Increases student engagement and teacher confidence through curriculum-aligned interactive content.

Note: SwiftClass is the classroom delivery layer. It is most powerful when combined with SwiftPAL (for practice) and SwiftChat (for at-home support) as part of SwiftSchool. However, it works as a standalone for states with existing school ICT infrastructure.

Write in formal Government of India document language. Reference NEP 2020, ICT in Education, Samagra Shiksha ICT lab norms.`
  },

  {
    id: "swiftskill",
    type: "vai",
    name: "SwiftSkill / KSK",
    tagline: "Kshamta Samiksha Kendra",
    description: "Skills governance for ITIs — 6A framework",
    pabHead: "Skills — Ministry of Skill Development and Entrepreneurship / State Skill Mission",
    objective: "Apply the proven VSK governance architecture to Industrial Training Institutes (ITIs) for evidence-backed systemic reform of India's vocational education system.",
    merit: "Translates CG's award-winning school education platform into the skilling sector, creating a KSK (Kshamta Samiksha Kendra) for ITIs aligned to NSQF and the 5th Industrial Revolution.",
    coreModules: [
      "KSK — Kshamta Samiksha Kendra (ITI governance platform)",
      "ITI Student and Trainer Registry (digital profiles)",
      "Attendance — Geo-tagging + Facial Recognition (CCTV/IoT based)",
      "Assessments — OCR digitisation + Virtual Proctoring + ORF for soft skills",
      "PASE — Personalised Adaptive Skilling Environment (AI-guided self-paced)",
      "ITI Administration Dashboard (budget, infrastructure, field inspection)",
      "ITI Accreditation System (faceless, NSQF-aligned)",
      "Career Advancement — Skill Fingerprint + Job Matching + Scholarship Management",
      "SwiftChat for ITI students (AI-assisted self-paced skilling, soft skills, language)",
      "Insights Dashboard — KSK (role-based, state/district/ITI level)"
    ],
    surroundSupport: [
      "Skills on Wheels (coming soon)",
      "Industry Samvaad Bot",
      "3D Simulations for Trade Skills",
      "LMIS — Learning Management Information System"
    ],
    analytics: "KSK Department Overview Dashboard, AI Forecast Dashboard, District risk tier analysis, Sector demand projections",
    systemPrompt: `You are an expert proposal writer for ConveGenius (CG), an Indian edtech company building AI-powered platforms for government education and skills development.

PRODUCT: SwiftSkill / KSK — Kshamta Samiksha Kendra
Sector: Vocational Education — Industrial Training Institutes (ITIs)
Ministry: Ministry of Skill Development and Entrepreneurship / State Skill Mission / NSDC
Framework: 6A Framework — Attendance, Assessments & Certification, Administration, Accreditation of ITIs, Advancement in Career + AI

Description: Applies CG's proven VSK architecture to the ITI/skilling sector.
Merit: Evidence-backed systemic reform of India's vocational education system, aligned to NSQF and the 5th Industrial Revolution.

Key positioning from KSK document:
- "VSKs do not reinvent the wheel — they amplify the impact of existing systems"
- Builds on existing SIDH (Skill India Digital Hub), e-Shram, National Career Service
- Creates a unique Skills Fingerprint for every student (mapped to Aadhaar, stored in DigiLocker)
- Skills Fingerprint updates with every job experience throughout career
- NSQF-based Common Skilling Framework across 5 domains: Basic Skills, Technical Skills, Cognitive Skills, Psychomotor Skills, Soft Skills
- AI enables: dropout early warning, predictive infrastructure maintenance, dynamic accreditation scoring, skill premium analysis
- PASE (Personalised Adaptive Skilling Environment): bias-free skill evaluation, personalised learning pathways, foundational competencies for workplace success

Proven analog: Gujarat VSK received National Innovation Award from PM of India. KSK is VSK for skills.

Write in formal government language. Reference Ministry of Skill Development, NSQF, NSDC, PM KAUSHAL VIKAS YOJANA (PMKVY), ITI norms, Skill India Mission, National Career Service, SIDH where relevant.`
  }

  // ── ADD NEW PRODUCTS BELOW THIS LINE ──
];

// ─────────────────────────────────────────────────────────────────
// ALL INDIVIDUAL MODULES — for single-module/bot proposals
// Derived from the full Swiftverse module list
// ─────────────────────────────────────────────────────────────────
export const INDIVIDUAL_MODULES: any[] = [
  // VSK Bots & Applications
  { id: "nipun_bot_1", name: "NIPUN Bot 1.0", package: "VSK 1.0", tags: ["bot","fln"] },
  { id: "nipun_bot_2", name: "NIPUN Bot 2.0 with ORF", package: "VSK 2.0", tags: ["bot","fln","ai"] },
  { id: "weekly_practice_1", name: "Weekly Practice 1.0", package: "VSK 1.0", tags: ["bot","fln"] },
  { id: "weekly_practice_2", name: "Weekly Practice 2.0", package: "VSK 2.0", tags: ["bot","fln"] },
  { id: "weekly_practice_3", name: "Weekly Practice 3.0 (Agent-led)", package: "VSK 3.0", tags: ["bot","fln","ai"] },
  { id: "shikshak_sahayak_1", name: "Shikshak Sahayak 1.0", package: "VSK 1.0", tags: ["bot","teacher"] },
  { id: "shikshak_sahayak_2", name: "Shikshak Sahayak 2.0", package: "VSK 2.0", tags: ["bot","teacher"] },
  { id: "shikshak_sahayak_3", name: "Shikshak Sahayak 3.0 (Agent-led)", package: "VSK 3.0", tags: ["bot","teacher","ai"] },
  { id: "fmb_1", name: "Field Monitoring Bot (FMB 1.0)", package: "VSK 1.0", tags: ["bot","monitoring"] },
  { id: "fmb_offline", name: "FMB Offline — School Inspection", package: "VSK 2.0", tags: ["bot","monitoring"] },
  { id: "fmb_2", name: "FMB 2.0 with Calendarisation", package: "VSK 3.0", tags: ["bot","monitoring","ai"] },
  { id: "parent_connect_1", name: "Parent Connect 1.0 (FAQ)", package: "VSK 1.0", tags: ["bot","parent"] },
  { id: "parent_connect_2", name: "Parent Connect 2.0 (Surveys, Reports)", package: "VSK 2.0", tags: ["bot","parent"] },
  { id: "tpd_bot", name: "TPD Bot (Teacher Professional Development)", package: "VSK 2.0", tags: ["bot","teacher","tpd"] },
  { id: "swiftee", name: "Swiftee — AI Insights Bot (Talk to your data)", package: "VSK 3.0", tags: ["bot","ai","dashboard"] },
  // Platforms & Systems
  { id: "mis_1", name: "MIS 1.0 — Registry Management", package: "VSK 2.0", tags: ["platform","mis"] },
  { id: "tims", name: "TIMS — Teacher Information Management System", package: "VSK 2.0", tags: ["platform","teacher"] },
  { id: "plc_1", name: "PLC 1.0 — Professional Learning Community", package: "VSK 2.0", tags: ["platform","teacher","tpd"] },
  { id: "plc_2", name: "PLC 2.0 — with TIMS integration", package: "VSK 3.0", tags: ["platform","teacher","tpd"] },
  { id: "cams", name: "CAMS — Content & Assessment Management System", package: "VSK 2.0", tags: ["platform","cms"] },
  { id: "school_accreditation", name: "School Accreditation System", package: "VSK 2.0", tags: ["platform"] },
  { id: "data_review", name: "Data Review System", package: "VSK 2.0", tags: ["platform","data"] },
  // Assessments
  { id: "pat_1", name: "PAT 1.0 / SBA — Manual Digitisation", package: "VSK 1.0", tags: ["assessment"] },
  { id: "pat_2_ocr", name: "PAT 2.0 with OCR (AI-based)", package: "VSK 2.0", tags: ["assessment","ai","ocr"] },
  { id: "cams_ocr", name: "CAMS OCR — Assessment Automation", package: "VSK 2.0", tags: ["assessment","ai","ocr","cms"] },
  // Dashboards & Reports
  { id: "live_reports_1", name: "Live Reports 1.0 (Admins/HMs)", package: "VSK 2.0", tags: ["dashboard"] },
  { id: "live_reports_2", name: "Live Reports 2.0 (APAAR + Skill Passport)", package: "VSK 3.0", tags: ["dashboard","ai"] },
  { id: "mdm", name: "Mid-Day Meal (MDM) Dashboard", package: "VSK 1.0", tags: ["dashboard"] },
];
