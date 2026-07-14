// ─────────────────────────────────────────────────────────────────
// GENERATORS CONFIG — built from CG pre-sales workflow
// To add a generator: copy one object, paste at the end, fill fields.
// ─────────────────────────────────────────────────────────────────

export const GENERATORS: any[] = [

  {
    id: "proposal",
    label: "Generate proposal",
    sections: ["Executive summary", "Background & context", "Understanding of the brief", "Proposed solution & architecture", "Implementation & phased rollout", "Team & capability", "Past experience & references", "Financial proposal", "Risk mitigation", "Conclusion & way forward"],
    icon: "ti-file-text",
    outputTitle: "Proposal draft",
    promptPrefix: `Generate a full government proposal document with the following sections:

1. Executive Summary (concise — 1 page max)
2. Background & Context (state education landscape, gaps, why now)
3. Understanding of the Brief / Scope of Work
4. Proposed Solution & Technical Architecture
5. Implementation Approach & Phased Rollout Plan
6. Team Composition & Organisational Capability
7. Past Experience & Reference Deployments
8. Financial Proposal & Value for Money Justification
9. Risk Mitigation Plan
10. Conclusion & Way Forward

Use formal government document language throughout. Mix structured lists with prose paragraphs — do not make everything bullet points. Reference specific government schemes, policies, and data where provided. Be specific about the scale and numbers given. Make the proposal directly responsive to the state's stated objectives.

If submitting via a PSU (TCIL/RailTel/NIC), frame CG as the technology partner and the PSU as the prime bidder with references to GeM compliance and CPSU procurement norms.`
  },

  {
    id: "pab_note",
    label: "PAB proposal note",
    sections: ["State & programme overview", "Current status & gap analysis", "Proposed intervention & rationale", "Physical targets", "Financial proposal (component-wise)", "Implementation plan & timeline", "Expected outcomes & monitoring"],
    icon: "ti-building-bank",
    outputTitle: "PAB proposal note",
    promptPrefix: `Draft a PAB (Project Approval Board) proposal note for Samagra Shiksha funding approval. A PAB note is a FUNDING-APPROVAL document — the Board releases money against budget heads — so the costing and the cited evidence carry it, not the prose. Follow standard PAB note format precisely:

1. State & Programme Overview
   - State name, current education status, key challenges
   - Alignment to the state's Samagra Shiksha Annual Work Plan & Budget (AWP&B)

2. Current Status / Gap Analysis  — QUANTIFIED, CITED
   - What exists today vs. what is missing, sized with numbers.
   - Every learning/access statistic MUST carry its source + year (e.g. "NAS 2021", "PARAKH 2024", "UDISE+ 2023–24"). If a figure isn't supplied, write a marked [INSERT: … , source + year] placeholder — NEVER invent or round a number.

3. Proposed Intervention & Rationale
   - What is being proposed, why this intervention, and its theory of change linking activity → output → outcome.
   - Alignment to NIPUN Bharat / NEP 2020 / PM SHRI goals.

4. Physical Targets
   - Districts/blocks, schools, students, teachers, grades covered — year-wise.
   - Use the exact figures from the brief; where one is missing use an [INSERT: …] placeholder.

5. Financial Proposal (Component-wise) — THE SPINE OF THE NOTE
   - Present a costing TABLE. Every line MUST resolve as: component → physical units → unit cost → total → amount (₹ in lakhs) → tagged Recurring (R) or Non-Recurring (NR) → mapped to a specific PAB budget head.
   - PAB heads to map against: Quality Intervention, Teacher Education, Assessment Reform, FLN / Assessment, PM SHRI, Holistic Progress Card (HPC).
   - Show year-wise phasing and a grand total.
   - Rates are negotiable and state-specific: NEVER fabricate a unit cost. Where a rate isn't given, write [INSERT: unit cost for <component>] and still show the structure. A cost with no PAB head is incomplete — flag it, never guess the head.

6. Implementation Plan & Timeline
   - Key milestones, responsibilities, roles, year-wise.

7. Expected Outcomes & Measurable Indicators
   - KPIs tied to the PAB monitoring framework, each linked back to the spend it justifies (budget ↔ outcome).
   - State how each outcome will be measured and the baseline it moves from.

8. Convergence with Other Schemes
   - Show how this CONVERGES with (does not duplicate) existing funded lines: NIPUN Bharat, PM POSHAN, STARS, PM SHRI, and relevant state schemes.

STRICT RULES:
- Formal government-note register; measured, institutional, third-person.
- Lead with magnitude; every claim carries a number where one exists.
- Never fabricate a figure, rate, citation, or PAB head — emit a marked [INSERT: …] placeholder instead.
- All costs in Indian Rupees, ₹ in lakhs, every rupee mapped to a PAB head and tagged R/NR.`
  },

  {
    id: "rfp_response",
    label: "RFP response",
    sections: ["Executive summary", "Compliance matrix", "Understanding of the requirement", "Proposed solution", "Implementation timeline", "Commercials", "Team & governance", "Case studies"],
    icon: "ti-clipboard-list",
    outputTitle: "RFP response draft",
    promptPrefix: `Draft a comprehensive technical proposal in response to the uploaded RFP. Structure the response to directly address every section, evaluation criterion, and scope item mentioned in the RFP.

Follow this structure:
1. Technical Bid Covering Letter
2. Understanding of the Project & Conformity to Scope of Work
3. Detailed Solution Architecture addressing each module in the RFP scope
4. Implementation Approach & Timeline (matching RFP milestones)
5. Team Composition & CVs (describe profiles, not names)
6. Organisational Capability & Relevant Past Experience
   - Reference comparable government deployments with contract values
   - Address each experience criterion in the RFP's evaluation matrix
7. Data Integration & Technical Specifications
   - UDISE+, APAAR, NIC/MeitY compliance, state SDC hosting
8. Service Level Agreement & Support Commitments
9. Risk Mitigation

IMPORTANT: For each scope item in the RFP, explicitly state how the proposed solution addresses it. Do not leave any RFP requirement unaddressed. If the RFP has a technical evaluation matrix with specific criteria and marks, address each criterion explicitly.

Write in formal government procurement language. Reference QCBS methodology, GFR 2017, GeM norms where applicable.`
  },

  {
    id: "cm2_analysis",
    label: "CM2 margin analysis",
    sections: ["Cost summary", "Component-wise breakdown", "Margin analysis (post-CM2)", "Assumptions & rates", "Sensitivity & risks", "Recommendation"],
    icon: "ti-calculator",
    outputTitle: "CM2 margin analysis",
    promptPrefix: `Generate a CM2 margin analysis memo for this engagement. This is an internal finance document — be analytically precise.

Structure:
1. Engagement Summary
   - Product, state, scale, duration, implementing partner

2. Revenue Model
   - Total contract value (based on budget ceiling if provided)
   - Revenue recognition schedule / payment milestones
   - GST treatment

3. Cost Structure Breakdown (estimated)
   - Manpower costs (project management, implementation, support)
   - Technology licensing and platform costs
   - Content and assessment costs (if applicable)
   - Cloud/infrastructure costs
   - Print and delivery costs (if applicable)
   - Travel and field costs
   - CPSU/implementing partner overhead (if PSU route)
   - Overheads and contingency

4. CM1 Calculation (Revenue minus direct costs)
5. CM2 Calculation (CM1 minus overheads)
   - CM2 percentage vs target margin provided

6. Key Risk Flags
   - Where margins could compress
   - Volume assumptions that affect unit economics
   - CPSU overhead impact if routed via PSU

7. Viability Assessment
   - Is the engagement viable at the stated CM2 target?
   - What would need to change to hit target margin?
   - Recommended go/no-go with conditions

Flag clearly where assumptions have been made due to missing data. Use ₹ for all figures. This is for internal CG leadership review.`
  },

  {
    id: "executive_summary",
    label: "Executive summary",
    sections: ["The opportunity", "Proposed approach", "Impact & outcomes", "Commercial snapshot", "Why ConveGenius"],
    icon: "ti-file-description",
    outputTitle: "Executive summary",
    promptPrefix: `Write a concise executive summary for a senior government official — Principal Secretary, Secretary, or Mission Director level. Maximum 2 pages when printed. This person has 3 minutes to read it.

Structure:
1. The Opportunity / Challenge (2-3 sentences — why this matters now)
2. Our Proposed Solution (what CG is offering, in plain language)
3. Scale & Investment (key numbers — schools, students, cost)
4. Why ConveGenius? (3-4 sharp differentiators, no marketing fluff)
5. Proven Track Record (2-3 comparable deployments with outcomes)
6. Immediate Next Steps (what you want the official to approve or decide)

Rules:
- Write clearly — no jargon, no acronyms without expansion
- Every sentence must earn its place — no filler
- Lead with impact, not features
- Numbers make it real — use them wherever provided
- The tone should be confident and direct, not salesy`
  },

  {
    id: "concept_note",
    label: "Concept note",
    sections: ["Context & rationale", "Objectives", "Proposed intervention", "Scope & coverage", "Implementation approach", "Indicative budget", "Expected outcomes"],
    icon: "ti-bulb",
    outputTitle: "Concept note",
    promptPrefix: `Write a concept note — a shorter, earlier-stage document used to initiate a conversation with a state before a formal proposal is ready. This is typically 3-4 pages.

Structure:
1. Context & Problem Statement
   - State education landscape, specific gaps, why intervention is needed now
   - Reference relevant data (NAS, UDISE+, PARAKH if available)

2. Proposed Concept
   - What CG proposes to do, in broad strokes
   - Theory of change — how this intervention leads to outcomes
   - Alignment to state/national priorities

3. Indicative Scope
   - Schools, students, teachers, grades, duration
   - High-level components (not a full technical proposal)

4. Indicative Investment
   - Broad cost range per school / per student / total
   - Funding mechanism (Samagra Shiksha, state budget, CSR etc.)

5. CG's Relevant Experience
   - 2-3 comparable deployments — brief, specific
   - Key proof points and outcomes

6. Proposed Next Steps
   - Suggest a meeting, presentation, or pilot discussion

Keep language accessible — this may go to officials who are not familiar with CG. Focus on outcomes, not technology. The concept note opens the door; the proposal wins the deal.`
  }

  // ── ADD NEW GENERATORS BELOW THIS LINE ──
  // Copy one block above, paste here, update the fields
];
