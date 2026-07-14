export interface ProposalInputs {
  productId: string;
  productName: string;
  productTagline: string;
  productObjective: string;
  systemPrompt: string;
  generatorId: string;
  generatorLabel: string;
  generatorPrefix: string;
  proposalType: "vsk" | "vai" | "module";
  selectedModuleNames: string[];
  selectedSurroundNames: string[];
  singleModuleName: string | null;
  state: string;
  department: string;
  submissionType: string;
  schools: string;
  grades: string;
  students: string;
  teachers: string;
  duration: string;
  implementingPartner: string;
  budget: string;
  cm2: string;
  context: string;
  differentiators: string;
  org: string;
  psuContext: string;
  rfpLoaded: boolean;
  rfpText: string;
  rfpFilename?: string;
  rfpBlobUrl?: string;
  sections?: string[];
  additionalInstructions?: string;
}

export interface CurrentProposal {
  id: string | null;
  title: string;
  output: string;
  status: string;
  streaming: boolean;
  rfpLoaded: boolean;
  outcomeReason?: string; // mandatory reason captured when an outcome is set
  starred?: boolean;      // starred by the user (same star as in My Docs)
}

export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  state?: string | null;
}

export type Screen =
  | "research"
  | "generate"
  | "marketing"
  | "chat"
  | "output"
  | "history"
  | "knowledge"
  | "rfplibrary"
  | "products"
  | "curation"
  | "costing"
  | "analytics"
  | "team"
  | "changelog";

export type ModuleId = "proposal" | "marketing" | "admin";
