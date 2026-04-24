/**
 * permissions-definitions.ts — Definiții roluri organizaționale + matrice permisiuni
 *
 * SAFE pentru client components — nu importă Prisma.
 * Tipurile OrgRole sunt re-exportate ca string literals.
 */

// Re-export ca string type (nu din @/generated/prisma — ar trage Prisma în bundle)
export type OrgRoleType =
  | "DG" | "IDG" | "DHR" | "RSAL" | "RREC" | "RAP" | "RLD"
  | "FJE" | "FA10" | "REPS" | "REPM" | "CEXT" | "SAL"

export type PermActionType = "READ" | "WRITE" | "MODIFY"

export type PermResourceType =
  | "JOBS" | "JOB_POSTINGS" | "SESSIONS" | "SALARY_GRADES" | "SALARY_DATA"
  | "PAY_GAP_REPORT" | "PAY_GAP_JUSTIFICATIONS" | "JOINT_ASSESSMENT"
  | "EMPLOYEE_REQUESTS" | "COMPLIANCE_REPORT" | "BENCHMARK"
  | "PERSONNEL_EVAL" | "ORG_DEVELOPMENT" | "SETTINGS" | "BILLING"
  | "USERS" | "AUDIT_TRAIL"

export interface OrgRoleDefinition {
  role: OrgRoleType
  label: string
  description: string
  required: boolean
  cumulableWith: OrgRoleType[]
  category: "management" | "hr" | "process" | "external" | "employee"
}

export const ORG_ROLE_DEFINITIONS: OrgRoleDefinition[] = [
  {
    role: "DG",
    label: "Director General / Owner",
    description: "Vede tot, aproba, semneaza. Responsabil final.",
    required: true,
    cumulableWith: ["IDG", "DHR", "RSAL", "RREC", "RAP", "RLD", "FJE", "FA10", "REPM"],
    category: "management",
  },
  {
    role: "IDG",
    label: "Imputernicit DG",
    description: "Actioneaza in numele Directorului General pe probleme HR.",
    required: false,
    cumulableWith: ["DHR", "RSAL", "RREC", "RAP", "RLD", "FJE", "FA10", "REPM"],
    category: "management",
  },
  {
    role: "DHR",
    label: "Director HR",
    description: "Configureaza, supervizeaza toate functiunile HR.",
    required: true,
    cumulableWith: ["RSAL", "RREC", "RAP", "RLD", "FJE", "FA10", "REPM"],
    category: "hr",
  },
  {
    role: "RSAL",
    label: "Responsabil Salarizare (Comp & Ben)",
    description: "Gestioneaza grile salariale, completeaza fise, raspunde la cereri Art. 7.",
    required: false,
    cumulableWith: ["RREC", "RAP", "RLD"],
    category: "hr",
  },
  {
    role: "RREC",
    label: "Responsabil Recrutare",
    description: "Publica posturi (Art. 5), gestioneaza candidati.",
    required: false,
    cumulableWith: ["RSAL", "RAP", "RLD"],
    category: "hr",
  },
  {
    role: "RAP",
    label: "Responsabil Administrare Personal",
    description: "Date administrative, import, relatii de munca, cereri angajati.",
    required: false,
    cumulableWith: ["RSAL", "RREC", "RLD"],
    category: "hr",
  },
  {
    role: "RLD",
    label: "Responsabil Learning & Development",
    description: "Dezvoltare profesionala, training, evaluare competente.",
    required: false,
    cumulableWith: ["RSAL", "RREC", "RAP"],
    category: "hr",
  },
  {
    role: "FJE",
    label: "Facilitator Evaluare Posturi",
    description: "Conduce sesiunile de evaluare a posturilor (Job Evaluation).",
    required: false,
    cumulableWith: ["DG", "IDG", "DHR", "RSAL", "FA10", "CEXT"],
    category: "process",
  },
  {
    role: "FA10",
    label: "Facilitator Evaluare Comuna Art. 10",
    description: "Conduce procesul de evaluare comuna cand gap > 5%.",
    required: false,
    cumulableWith: ["DG", "IDG", "DHR", "RSAL", "FJE", "CEXT"],
    category: "process",
  },
  {
    role: "REPS",
    label: "Reprezentant Salariati",
    description: "Participa, voteaza, semneaza in comisia de evaluare comuna. Obligatoriu legal pt Art. 10.",
    required: false,
    cumulableWith: [],
    category: "process",
  },
  {
    role: "REPM",
    label: "Reprezentant Management",
    description: "Participa in comisia de evaluare comuna din partea managementului.",
    required: false,
    cumulableWith: ["DG", "IDG", "DHR"],
    category: "process",
  },
  {
    role: "CEXT",
    label: "Consultant Extern",
    description: "Vizualizare si mediere. Fara acces la modificarea datelor.",
    required: false,
    cumulableWith: ["FJE", "FA10"],
    category: "external",
  },
  {
    role: "SAL",
    label: "Salariat",
    description: "Angajat fara functie HR. Poate trimite cereri Art. 7, vizualiza posturi Art. 5.",
    required: false,
    cumulableWith: ["REPS"],
    category: "employee",
  },
]
