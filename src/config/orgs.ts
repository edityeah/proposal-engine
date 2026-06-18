export interface Org {
  id: string;
  name: string;
  icon: string;
}

export const ORGS: Org[] = [
  { id: "direct", name: "CG direct", icon: "ti-building" },
  { id: "tcil", name: "TCIL", icon: "ti-building-factory-2" },
  { id: "railtel", name: "RailTel", icon: "ti-radio-tower" },
  { id: "nic", name: "NIC", icon: "ti-server" },
  { id: "other", name: "Other PSU", icon: "ti-building-bank" },
];

export const STATES = [
  "Rajasthan",
  "Himachal Pradesh",
  "Assam",
  "Delhi (GNCT)",
  "Uttar Pradesh",
  "Bihar",
  "Madhya Pradesh",
  "Uttarakhand",
  "Odisha",
  "Jharkhand",
  "Other",
];

export const SUBMISSION_TYPES = [
  "Unsolicited proposal",
  "Response to RFP",
  "PAB proposal note",
  "GeM bid support document",
  "EOI response",
];

export const DURATIONS = [
  "1 year",
  "2 years",
  "3 years",
  "2025–26 (1 year)",
  "2025–27 (2 years)",
];

export const IMPLEMENTING_PARTNERS = ["RailTel", "TCIL", "NIC", "Other CPSU"];
