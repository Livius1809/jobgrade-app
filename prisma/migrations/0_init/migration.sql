-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension (required for pgvector embeddings in kb_entries)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'FACILITATOR', 'REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'BENCHMARK_SELECTION', 'PRE_SCORING', 'IN_PROGRESS', 'RECALIBRATION', 'VOTING', 'FACILITATION', 'SLOTTING', 'OWNER_VALIDATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConsensusState" AS ENUM ('PENDING', 'CONSENSUS', 'RECALIBRATING', 'VOTING', 'FACILITATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "KpiFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('JOB_AD', 'SOCIAL_MEDIA', 'KPI_SHEET', 'SESSION_ANALYSIS', 'JOB_ANALYSIS', 'COMPANY_EXTRACT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('HIERARCHY', 'SALARY_GRADES', 'KPI', 'BUDGET', 'FULL');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL');

-- CreateEnum
CREATE TYPE "CreditTxnType" AS ENUM ('PURCHASE', 'SUBSCRIPTION_MONTHLY', 'USAGE', 'REFUND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SESSION_LAUNCHED', 'EVALUATOR_COMPLETED', 'ALL_COMPLETED', 'CONSENSUS_REACHED', 'RECALIBRATION_STARTED', 'VOTE_STARTED', 'FACILITATOR_NEEDED', 'CLARIFICATION_RECEIVED', 'CLARIFICATION_ANSWERED', 'REPORT_GENERATED', 'CREDITS_LOW', 'INVOICE_ISSUED', 'EMPLOYEE_REQUEST_RECEIVED', 'EMPLOYEE_REQUEST_OVERDUE', 'PAY_GAP_THRESHOLD_EXCEEDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESPONDED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "KBType" AS ENUM ('PERMANENT', 'SHARED_DOMAIN', 'CLIENT_LEXICON', 'METHODOLOGY');

-- CreateEnum
CREATE TYPE "KBSource" AS ENUM ('SELF_INTERVIEW', 'EXPERT_HUMAN', 'DISTILLED_INTERACTION', 'PROPAGATED');

-- CreateEnum
CREATE TYPE "KBStatus" AS ENUM ('BUFFER', 'PERMANENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentLevel" AS ENUM ('STRATEGIC', 'TACTICAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "AgentActivityMode" AS ENUM ('PROACTIVE_CYCLIC', 'REACTIVE_TRIGGERED', 'DORMANT_UNTIL_DELEGATED', 'HYBRID', 'PAUSED_KNOWN_GAP');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('REPORTS_TO', 'COLLABORATES_WITH');

-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('ADD_AGENT', 'REMOVE_AGENT', 'MERGE_AGENTS', 'MODIFY_HIERARCHY', 'MODIFY_OBJECTIVES', 'MODIFY_PROPAGATION');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PROPOSED', 'COG_REVIEWED', 'OWNER_PENDING', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "OwnerDecision" AS ENUM ('APPROVED', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "BrainstormStatus" AS ENUM ('GENERATING', 'EVALUATING', 'EVALUATED', 'AGGREGATING', 'AGGREGATED', 'OWNER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PROPOSED', 'SCORED', 'SHORTLISTED', 'PROMOTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('API_SERVICE', 'INFRASTRUCTURE', 'DOMAIN', 'CERTIFICATE', 'SUBSCRIPTION', 'LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClientMemoryCategory" AS ENUM ('PREFERENCE', 'RELATIONSHIP', 'CONTEXT', 'PAIN_POINT', 'OPPORTUNITY', 'HISTORY', 'STYLE');

-- CreateEnum
CREATE TYPE "WorkSchedule" AS ENUM ('H2', 'H4', 'H6', 'H8');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CIM_NEDETERMINAT', 'CIM_DETERMINAT', 'CONVENTIE');

-- CreateEnum
CREATE TYPE "WorkLocation" AS ENUM ('SEDIU', 'REMOTE', 'HIBRID');

-- CreateEnum
CREATE TYPE "Education" AS ENUM ('MEDII', 'SUPERIOARE', 'MASTER', 'DOCTORAT');

-- CreateEnum
CREATE TYPE "LegalCriterion" AS ENUM ('CUNOSTINTE_DEPRINDERI', 'EFORT_INTELECTUAL_FIZIC', 'RESPONSABILITATI', 'CONDITII_MUNCA');

-- CreateEnum
CREATE TYPE "BenchmarkSource" AS ENUM ('INS_TEMPO', 'EUROSTAT', 'GLASSDOOR', 'UNDELUCRAM', 'BESTJOBS', 'HAYS', 'PWCRO', 'KPMGRO', 'MERCER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SeniorityLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('COG_CHAT', 'TEAM_CHAT', 'ASSISTANT', 'HR_COUNSELOR', 'B2C_GUIDE', 'B2C_PROFILER', 'B2C_CAREER', 'B2C_RELATIONS', 'B2C_COACH');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('PAGE_VIEW', 'PAGE_LEAVE', 'FEATURE_USE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'REPORT_GENERATE', 'SEARCH', 'EVALUATION_START', 'EVALUATION_SUBMIT', 'SESSION_JOIN', 'CHAT_START', 'CHAT_MESSAGE', 'SETTINGS_CHANGE', 'HELP_REQUEST');

-- CreateEnum
CREATE TYPE "DisfunctionClass" AS ENUM ('D1_TECHNICAL', 'D2_FUNCTIONAL_MGMT', 'D3_BUSINESS_PROCESS');

-- CreateEnum
CREATE TYPE "DisfunctionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DisfunctionStatus" AS ENUM ('OPEN', 'REMEDIATING', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DisfunctionTarget" AS ENUM ('SERVICE', 'WORKFLOW', 'ROLE', 'FLUX_STEP');

-- CreateEnum
CREATE TYPE "RemediationLevel" AS ENUM ('AUTO', 'AGENT', 'OWNER');

-- CreateEnum
CREATE TYPE "ReorganizationType" AS ENUM ('SUBORDINATE_REASSIGN', 'TASK_REASSIGN', 'ROLE_COLLAPSE', 'PEER_PROMOTION');

-- CreateEnum
CREATE TYPE "ReorgStatus" AS ENUM ('ACTIVE', 'REVERTED', 'ESCALATED', 'CONFLICTED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('PRE_LAUNCH', 'PILOT', 'ACTIVE', 'CONSOLIDATING', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BusinessLifecyclePhase" AS ENUM ('GROWTH', 'MATURE', 'CONSOLIDATION', 'PIVOT');

-- CreateEnum
CREATE TYPE "ObjectiveLevel" AS ENUM ('STRATEGIC', 'TACTICAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "ObjectiveDirection" AS ENUM ('INCREASE', 'DECREASE', 'MAINTAIN', 'REACH');

-- CreateEnum
CREATE TYPE "ObjectivePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AT_RISK', 'MET', 'FAILED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExternalSignalCategory" AS ENUM ('MARKET_HR', 'LEGAL_REG', 'TECH_AI', 'CULTURAL_SOCIAL', 'COMPETITOR', 'MACRO_ECONOMIC');

-- CreateEnum
CREATE TYPE "PatchType" AS ENUM ('PRIORITY_SHIFT', 'ATTENTION_SHIFT', 'SCOPE_EXPAND', 'SCOPE_NARROW', 'ACTIVITY_MODE', 'CYCLE_INTERVAL');

-- CreateEnum
CREATE TYPE "PatchStatus" AS ENUM ('PROPOSED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CONFIRMED', 'REVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HomeostaticTargetType" AS ENUM ('SERVICE', 'ROLE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HomeostaticStatus" AS ENUM ('UNKNOWN', 'OPTIMAL', 'NORMAL', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AgentTaskType" AS ENUM ('KB_RESEARCH', 'KB_VALIDATION', 'DATA_ANALYSIS', 'CONTENT_CREATION', 'PROCESS_EXECUTION', 'REVIEW', 'INVESTIGATION', 'OUTREACH');

-- CreateEnum
CREATE TYPE "AgentTaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVIEW_PENDING');

-- CreateEnum
CREATE TYPE "BlockerType" AS ENUM ('DEPENDENCY', 'WAITING_INPUT', 'WAITING_OWNER', 'EXTERNAL', 'RESOURCE', 'TECHNICAL', 'UNCLEAR_SCOPE');

-- CreateEnum
CREATE TYPE "BoundaryRuleType" AS ENUM ('MORAL_CORE', 'SCOPE_VIOLATION', 'CONSISTENCY', 'DATA_INTEGRITY', 'PRIVACY');

-- CreateEnum
CREATE TYPE "BoundarySeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BoundaryAction" AS ENUM ('BLOCK', 'QUARANTINE', 'WARN', 'LOG');

-- CreateEnum
CREATE TYPE "QuarantineStatus" AS ENUM ('QUARANTINED', 'RELEASED', 'DESTROYED', 'AUTO_RELEASED');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'AUTO_GRANTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PruneReason" AS ENUM ('UNUSED_90D', 'LOW_SUCCESS_RATE', 'SUPERSEDED', 'CONTRADICTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PruneStatus" AS ENUM ('FLAGGED', 'APPROVED', 'KEPT', 'PRUNED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "PropagationType" AS ENUM ('KB_CLONE', 'PATCH_TEMPLATE', 'PATTERN_SHARE');

-- CreateEnum
CREATE TYPE "PropagationStatus" AS ENUM ('PROPOSED', 'APPROVED', 'APPLIED', 'CONFIRMED', 'REVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WildCardType" AS ENUM ('CONTRARIAN', 'CROSS_DOMAIN', 'FUTURE_SELF', 'CONSTRAINT', 'ABSURD');

-- CreateEnum
CREATE TYPE "RitualType" AS ENUM ('RETROSPECTIVE', 'POST_INCIDENT', 'STRATEGIC', 'CELEBRATION', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_DONE', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'ONBOARDING', 'ACTIVE', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('OUTBOUND_EMAIL', 'INBOUND_WEBSITE', 'REFERRAL', 'LINKEDIN', 'EVENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "B2CJournalStatus" AS ENUM ('PROMPT_SENT', 'WRITING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "B2CUserStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "B2CCard" AS ENUM ('CARD_1', 'CARD_2', 'CARD_3', 'CARD_4', 'CARD_5', 'CARD_6');

-- CreateEnum
CREATE TYPE "B2CCardStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "B2CSpiralPhase" AS ENUM ('CHRYSALIS', 'BUTTERFLY', 'FLIGHT', 'LEAP');

-- CreateEnum
CREATE TYPE "B2CSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "B2CEvolutionType" AS ENUM ('MILESTONE', 'INSIGHT', 'REGRESSION', 'TRANSITION', 'HANDOFF', 'TEST_RESULT', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "B2CTestType" AS ENUM ('HERRMANN', 'VIA', 'HAWKINS', 'EXTERNAL_LICENSED');

-- CreateEnum
CREATE TYPE "B2CTestSource" AS ENUM ('INTERNAL_L2', 'EXTERNAL_PARTNER', 'OWNER_PROVIDED');

-- CreateEnum
CREATE TYPE "B2CCreditTxnType" AS ENUM ('PURCHASE', 'CARD_ACTIVATION', 'SERVICE', 'REFUND');

-- CreateEnum
CREATE TYPE "B2CCommunityRole" AS ENUM ('MEMBER', 'MENTOR', 'MODERATOR');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REPRESENTATIVE',
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "lastLogin" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mission" TEXT,
    "vision" TEXT,
    "values" TEXT[],
    "description" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "website" TEXT,
    "cui" TEXT,
    "regCom" TEXT,
    "address" TEXT,
    "county" TEXT,
    "logoUrl" TEXT,
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT,
    "representativeId" TEXT,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "purpose" TEXT,
    "description" TEXT,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "aiAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "aiAnalysis" JSONB,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subfactors" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "subfactors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "consensusThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "deadline" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assignments" (
    "id" TEXT NOT NULL,
    "sessionJobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "subfactorId" TEXT NOT NULL,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "askedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "answeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consensus_statuses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "status" "ConsensusState" NOT NULL DEFAULT 'PENDING',
    "round1Cv" DOUBLE PRECISION,
    "round2Cv" DOUBLE PRECISION,
    "finalSubfactorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consensus_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subfactorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilitator_decisions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "subfactorId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilitator_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "salaryGradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_grades" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scoreMin" INTEGER NOT NULL,
    "scoreMax" INTEGER NOT NULL,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "salaryGradeId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "variableComp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "department" TEXT,
    "jobCategory" TEXT,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_gap_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportYear" INTEGER NOT NULL,
    "indicators" JSONB NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,

    CONSTRAINT "pay_gap_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joint_pay_assessments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerReason" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'OPEN',
    "rootCause" TEXT,
    "actionPlan" JSONB,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "joint_pay_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestEmail" TEXT NOT NULL,
    "salaryGradeId" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'ART7',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDetails" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_overrides" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subfactorId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "components" JSONB NOT NULL,
    "benefits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensation_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "measurementUnit" TEXT NOT NULL,
    "frequency" "KpiFrequency" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_scenarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpiAchievements" JSONB NOT NULL,
    "calculatedResult" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AiGenerationType" NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "prompt" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "sections" TEXT[],
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "filePath" TEXT,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CreditTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_entries" (
    "id" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "kbType" "KBType" NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1024),
    "source" "KBSource" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "status" "KBStatus" NOT NULL DEFAULT 'BUFFER',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "propagatedFrom" TEXT,

    CONSTRAINT "kb_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_buffers" (
    "id" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "sessionRef" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "positiveOutcomes" INTEGER NOT NULL DEFAULT 0,
    "totalOutcomes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "kb_buffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_logs" (
    "id" TEXT NOT NULL,
    "managerRole" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "escalationId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "cycle_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "aboutRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "timeoutHours" INTEGER NOT NULL DEFAULT 24,
    "escalatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "AgentLevel" NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activityMode" "AgentActivityMode" NOT NULL DEFAULT 'PROACTIVE_CYCLIC',
    "cycleIntervalHours" INTEGER,
    "objectives" TEXT[],
    "thresholds" JSONB,
    "coldStartDescription" TEXT,
    "coldStartPrompts" TEXT[],
    "propagationTargets" JSONB,
    "createdBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_relationships" (
    "id" TEXT NOT NULL,
    "parentRole" TEXT NOT NULL,
    "childRole" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL DEFAULT 'REPORTS_TO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_proposals" (
    "id" TEXT NOT NULL,
    "proposalType" "ProposalType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "proposedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "impact" JSONB,
    "changeSpec" JSONB NOT NULL,
    "reviewedByCog" BOOLEAN NOT NULL DEFAULT false,
    "cogComment" TEXT,
    "ownerDecision" "OwnerDecision",
    "ownerComment" TEXT,
    "executedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "agentRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksEscalated" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER,
    "kbEntriesAdded" INTEGER NOT NULL DEFAULT 0,
    "kbEntriesUsed" INTEGER NOT NULL DEFAULT 0,
    "propagationsOut" INTEGER NOT NULL DEFAULT 0,
    "propagationsIn" INTEGER NOT NULL DEFAULT 0,
    "healthScoreAvg" DOUBLE PRECISION,
    "cycleActions" INTEGER NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brainstorm_sessions" (
    "id" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "level" "AgentLevel" NOT NULL,
    "topic" TEXT NOT NULL,
    "context" TEXT,
    "status" "BrainstormStatus" NOT NULL DEFAULT 'GENERATING',
    "participantRoles" TEXT[],
    "aggregatedFromId" TEXT,
    "aggregatedToId" TEXT,
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "brainstorm_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brainstorm_ideas" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "viability" DOUBLE PRECISION,
    "alignment" DOUBLE PRECISION,
    "marketFit" DOUBLE PRECISION,
    "costBenefit" DOUBLE PRECISION,
    "easeOfImpl" DOUBLE PRECISION,
    "timeToValue" DOUBLE PRECISION,
    "compositeScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "scoringRationale" TEXT,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PROPOSED',
    "promotedToLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brainstorm_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_memories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "ClientMemoryCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "tags" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyCost" DOUBLE PRECISION,
    "billingCycle" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 14,
    "lastCheckedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "hierarchyLevel" TEXT NOT NULL,
    "jobFamily" TEXT NOT NULL,
    "gradeCalculated" INTEGER,
    "gradeEvaluated" INTEGER,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "fixedAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualBonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualCommissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benefitsInKind" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealVouchers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gender" "Gender" NOT NULL,
    "workSchedule" "WorkSchedule" NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "tenureOrg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tenureRole" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workLocation" "WorkLocation" NOT NULL,
    "city" TEXT NOT NULL,
    "education" "Education" NOT NULL,
    "certifications" TEXT,
    "totalMonthlyGross" DOUBLE PRECISION,
    "salaryQuartile" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollImportBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriteriaMapping" (
    "id" TEXT NOT NULL,
    "legalCriterion" "LegalCriterion" NOT NULL,
    "jobgradeFactor" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "CriteriaMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_benchmarks" (
    "id" TEXT NOT NULL,
    "source" "BenchmarkSource" NOT NULL,
    "sourceDetail" TEXT,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "country" TEXT NOT NULL DEFAULT 'RO',
    "jobFamily" TEXT NOT NULL,
    "jobTitle" TEXT,
    "corCode" TEXT,
    "iscoCode" TEXT,
    "seniorityLevel" "SeniorityLevel" NOT NULL,
    "gradeMin" INTEGER,
    "gradeMax" INTEGER,
    "salaryP10" DOUBLE PRECISION,
    "salaryP25" DOUBLE PRECISION NOT NULL,
    "salaryMedian" DOUBLE PRECISION NOT NULL,
    "salaryP75" DOUBLE PRECISION NOT NULL,
    "salaryP90" DOUBLE PRECISION,
    "salaryMean" DOUBLE PRECISION,
    "sampleSize" INTEGER,
    "region" TEXT,
    "industry" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "threadType" "ThreadType" NOT NULL DEFAULT 'ASSISTANT',
    "title" TEXT,
    "pageContext" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "InteractionType" NOT NULL,
    "pageRoute" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "detail" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disfunction_events" (
    "id" TEXT NOT NULL,
    "class" "DisfunctionClass" NOT NULL,
    "severity" "DisfunctionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "DisfunctionStatus" NOT NULL DEFAULT 'OPEN',
    "targetType" "DisfunctionTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "detectorSource" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signal" TEXT NOT NULL,
    "durationMs" INTEGER,
    "remediationLevel" "RemediationLevel",
    "remediationAction" TEXT,
    "remediationAt" TIMESTAMP(3),
    "remediationOk" BOOLEAN,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disfunction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flux_step_roles" (
    "id" TEXT NOT NULL,
    "fluxId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "raci" TEXT NOT NULL,
    "slaMinutes" INTEGER,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flux_step_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorganization_events" (
    "id" TEXT NOT NULL,
    "triggeredByRole" TEXT NOT NULL,
    "triggeredByEventId" TEXT,
    "reorgType" "ReorganizationType" NOT NULL,
    "originalConfig" JSONB NOT NULL,
    "newConfig" JSONB NOT NULL,
    "status" "ReorgStatus" NOT NULL DEFAULT 'ACTIVE',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoRevertAt" TIMESTAMP(3) NOT NULL,
    "revertedAt" TIMESTAMP(3),
    "revertReason" TEXT,
    "isRepeatedPattern" BOOLEAN NOT NULL DEFAULT false,
    "patternSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reorganization_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "lifecyclePhase" "BusinessLifecyclePhase" NOT NULL DEFAULT 'GROWTH',
    "mvvStatement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizational_objectives" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricUnit" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "direction" "ObjectiveDirection" NOT NULL DEFAULT 'INCREASE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "priority" "ObjectivePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contributorRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceDocUrl" TEXT,
    "parentObjectiveId" TEXT,
    "level" "ObjectiveLevel" NOT NULL DEFAULT 'STRATEGIC',
    "cascadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "organizational_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_signals" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "category" "ExternalSignalCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "fingerprint" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_behavior_patches" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "patchType" "PatchType" NOT NULL,
    "patchSpec" JSONB NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggerSourceId" TEXT,
    "rationale" TEXT NOT NULL,
    "status" "PatchStatus" NOT NULL DEFAULT 'PROPOSED',
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "revertReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_behavior_patches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homeostatic_targets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metricName" TEXT NOT NULL,
    "metricUnit" TEXT,
    "targetType" "HomeostaticTargetType" NOT NULL,
    "targetEntityId" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "optimalValue" DOUBLE PRECISION,
    "warningPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "criticalPct" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "lastReading" DOUBLE PRECISION,
    "lastReadingAt" TIMESTAMP(3),
    "currentStatus" "HomeostaticStatus" NOT NULL DEFAULT 'UNKNOWN',
    "autoCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeostatic_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "cycleLogId" TEXT,
    "assignedTo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" "AgentTaskType" NOT NULL,
    "priority" "AgentTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "objectiveId" TEXT,
    "tags" TEXT[],
    "deadlineAt" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "blockerType" "BlockerType",
    "blockerDescription" TEXT,
    "blockerAgentRole" TEXT,
    "blockerTaskId" TEXT,
    "blockedAt" TIMESTAMP(3),
    "unblockedAt" TIMESTAMP(3),
    "result" TEXT,
    "resultQuality" INTEGER,
    "failureReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boundary_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "BoundaryRuleType" NOT NULL,
    "severity" "BoundarySeverity" NOT NULL DEFAULT 'HIGH',
    "condition" JSONB NOT NULL,
    "action" "BoundaryAction" NOT NULL DEFAULT 'BLOCK',
    "notifyRoles" TEXT[],
    "escalateToOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boundary_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boundary_violations" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "businessId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceRole" TEXT,
    "inputSnapshot" TEXT NOT NULL,
    "actionTaken" "BoundaryAction" NOT NULL,
    "wasOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideBy" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boundary_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantine_entries" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "businessId" TEXT,
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "QuarantineStatus" NOT NULL DEFAULT 'QUARANTINED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarantine_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "immune_patterns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "patternType" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "violationIds" TEXT[],
    "autoBlock" BOOLEAN NOT NULL DEFAULT false,
    "threshold" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immune_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "llmTokensIn" INTEGER NOT NULL DEFAULT 0,
    "llmTokensOut" INTEGER NOT NULL DEFAULT 0,
    "llmCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dbQueries" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "triggerSource" TEXT,
    "metadata" JSONB,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_budgets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "maxLlmTokensPerDay" INTEGER NOT NULL DEFAULT 100000,
    "maxLlmCostPerDay" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "maxCyclesPerDay" INTEGER NOT NULL DEFAULT 50,
    "maxDurationMsPerDay" INTEGER NOT NULL DEFAULT 300000,
    "usedLlmTokens" INTEGER NOT NULL DEFAULT 0,
    "usedLlmCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedCycles" INTEGER NOT NULL DEFAULT 0,
    "usedDurationMs" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_negotiations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requestorRole" TEXT NOT NULL,
    "donorRole" TEXT,
    "resourceType" TEXT NOT NULL,
    "amountRequested" INTEGER NOT NULL,
    "amountGranted" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "objectiveId" TEXT,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prune_candidates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "reason" "PruneReason" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "metrics" JSONB NOT NULL,
    "status" "PruneStatus" NOT NULL DEFAULT 'FLAGGED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prune_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propagation_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetRoles" TEXT[],
    "propagationType" "PropagationType" NOT NULL,
    "outcomeId" TEXT,
    "successMetric" TEXT NOT NULL,
    "improvementPct" DOUBLE PRECISION NOT NULL,
    "status" "PropagationStatus" NOT NULL DEFAULT 'PROPOSED',
    "appliedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propagation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_outcomes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricUnit" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "collectionMethod" TEXT NOT NULL,
    "collectionFrequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcome_measurements" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "tenantId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wild_cards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptType" "WildCardType" NOT NULL,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "cogReview" TEXT,
    "cogScore" INTEGER,
    "promotedToIdea" BOOLEAN NOT NULL DEFAULT false,
    "brainstormIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wild_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rituals" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ritualType" "RitualType" NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "templatePrompt" TEXT NOT NULL,
    "participantRoles" TEXT[],
    "outputTarget" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rituals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptation_metrics" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "metricCode" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactRole" TEXT,
    "contactPhone" TEXT,
    "companySize" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "score" INTEGER NOT NULL DEFAULT 0,
    "bantBudget" BOOLEAN,
    "bantAuthority" BOOLEAN,
    "bantNeed" BOOLEAN,
    "bantTimeline" BOOLEAN,
    "bantNotes" TEXT,
    "assignedAgent" TEXT NOT NULL DEFAULT 'SOA',
    "tenantId" TEXT,
    "threadId" TEXT,
    "lastEmailSentAt" TIMESTAMP(3),
    "emailSequenceStep" INTEGER NOT NULL DEFAULT 0,
    "nextFollowUpAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "demoAt" TIMESTAMP(3),
    "proposalSentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_users" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "lastJobTitle" TEXT,
    "hasCurrentJob" BOOLEAN,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "status" "B2CUserStatus" NOT NULL DEFAULT 'ONBOARDING',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deleteScheduledFor" TIMESTAMP(3),

    CONSTRAINT "b2c_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "herrmannA" DOUBLE PRECISION,
    "herrmannB" DOUBLE PRECISION,
    "herrmannC" DOUBLE PRECISION,
    "herrmannD" DOUBLE PRECISION,
    "hawkinsEstimate" INTEGER,
    "hawkinsConfidence" DOUBLE PRECISION,
    "viaSignature" TEXT[],
    "viaUndeveloped" TEXT[],
    "spiralLevel" INTEGER NOT NULL DEFAULT 1,
    "spiralStage" INTEGER NOT NULL DEFAULT 1,
    "dialogInsights" JSONB,
    "externalTests" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_card_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "card" "B2CCard" NOT NULL,
    "status" "B2CCardStatus" NOT NULL DEFAULT 'LOCKED',
    "phase" "B2CSpiralPhase" NOT NULL DEFAULT 'CHRYSALIS',
    "stage" INTEGER NOT NULL DEFAULT 1,
    "questionnaireData" JSONB,
    "communityReady" BOOLEAN NOT NULL DEFAULT false,
    "communityGrantedAt" TIMESTAMP(3),
    "cvFileUrl" TEXT,
    "cvExtractedData" JSONB,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_card_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "card" "B2CCard" NOT NULL,
    "agentRole" TEXT NOT NULL,
    "milestones" JSONB,
    "contextSnapshot" JSONB,
    "status" "B2CSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "threadId" TEXT,

    CONSTRAINT "b2c_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_test_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testType" "B2CTestType" NOT NULL,
    "testName" TEXT NOT NULL,
    "source" "B2CTestSource" NOT NULL,
    "rawScore" JSONB NOT NULL,
    "normScore" JSONB,
    "scoring" JSONB,
    "partnerId" TEXT,
    "licenseRef" TEXT,
    "supervisedBy" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_evolution_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "card" "B2CCard" NOT NULL,
    "type" "B2CEvolutionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase" "B2CSpiralPhase" NOT NULL,
    "stage" INTEGER NOT NULL,
    "sessionId" TEXT,
    "agentRole" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_evolution_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_communities" (
    "id" TEXT NOT NULL,
    "card" "B2CCard" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_community_members" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantReason" TEXT,
    "role" "B2CCommunityRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_community_messages" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "flaggedBy" TEXT,
    "flagReason" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_credit_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "B2CCreditTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "card" "B2CCard",
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2c_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_journal_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "card" "B2CCard" NOT NULL,
    "promptText" TEXT NOT NULL,
    "content" TEXT,
    "suggestedMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "herrmannDominance" TEXT,
    "dosageLevel" TEXT,
    "spiralPhase" "B2CSpiralPhase" NOT NULL DEFAULT 'CHRYSALIS',
    "competenceStage" INTEGER NOT NULL DEFAULT 1,
    "internalPurpose" TEXT,
    "targetDimension" TEXT,
    "status" "B2CJournalStatus" NOT NULL DEFAULT 'PROMPT_SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "writtenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_tenantId_key" ON "company_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenantId_name_key" ON "departments"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "criteria_name_key" ON "criteria"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subfactors_criterionId_code_key" ON "subfactors"("criterionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "session_jobs_sessionId_jobId_key" ON "session_jobs"("sessionId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "session_participants_sessionId_userId_key" ON "session_participants"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_sessionJobId_userId_key" ON "job_assignments"("sessionJobId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_assignmentId_criterionId_key" ON "evaluations"("assignmentId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "clarification_answers_questionId_key" ON "clarification_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "consensus_statuses_sessionId_jobId_criterionId_key" ON "consensus_statuses"("sessionId", "jobId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_sessionId_jobId_criterionId_userId_key" ON "votes"("sessionId", "jobId", "criterionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "facilitator_decisions_sessionId_jobId_criterionId_key" ON "facilitator_decisions"("sessionId", "jobId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "job_results_sessionId_jobId_key" ON "job_results"("sessionId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_salary_records_tenantId_employeeCode_periodYear_key" ON "employee_salary_records"("tenantId", "employeeCode", "periodYear");

-- CreateIndex
CREATE UNIQUE INDEX "pay_gap_reports_tenantId_reportYear_key" ON "pay_gap_reports"("tenantId", "reportYear");

-- CreateIndex
CREATE INDEX "ai_generations_tenantId_createdAt_idx" ON "ai_generations"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "reports_tenantId_type_idx" ON "reports"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_tenantId_key" ON "credit_balances"("tenantId");

-- CreateIndex
CREATE INDEX "credit_transactions_tenantId_createdAt_idx" ON "credit_transactions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "kb_entries_agentRole_status_idx" ON "kb_entries"("agentRole", "status");

-- CreateIndex
CREATE INDEX "kb_entries_agentRole_kbType_idx" ON "kb_entries"("agentRole", "kbType");

-- CreateIndex
CREATE INDEX "kb_buffers_agentRole_status_idx" ON "kb_buffers"("agentRole", "status");

-- CreateIndex
CREATE INDEX "cycle_logs_managerRole_resolved_idx" ON "cycle_logs"("managerRole", "resolved");

-- CreateIndex
CREATE INDEX "cycle_logs_targetRole_actionType_idx" ON "cycle_logs"("targetRole", "actionType");

-- CreateIndex
CREATE UNIQUE INDEX "escalations_externalId_key" ON "escalations"("externalId");

-- CreateIndex
CREATE INDEX "escalations_targetRole_status_idx" ON "escalations"("targetRole", "status");

-- CreateIndex
CREATE INDEX "escalations_sourceRole_status_idx" ON "escalations"("sourceRole", "status");

-- CreateIndex
CREATE INDEX "escalations_status_idx" ON "escalations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agent_definitions_agentRole_key" ON "agent_definitions"("agentRole");

-- CreateIndex
CREATE INDEX "agent_definitions_level_isActive_idx" ON "agent_definitions"("level", "isActive");

-- CreateIndex
CREATE INDEX "agent_relationships_parentRole_isActive_idx" ON "agent_relationships"("parentRole", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "agent_relationships_parentRole_childRole_key" ON "agent_relationships"("parentRole", "childRole");

-- CreateIndex
CREATE INDEX "org_proposals_status_idx" ON "org_proposals"("status");

-- CreateIndex
CREATE INDEX "org_proposals_proposedBy_idx" ON "org_proposals"("proposedBy");

-- CreateIndex
CREATE INDEX "agent_metrics_agentRole_periodStart_idx" ON "agent_metrics"("agentRole", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "agent_metrics_agentRole_periodStart_periodEnd_key" ON "agent_metrics"("agentRole", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "brainstorm_sessions_initiatedBy_status_idx" ON "brainstorm_sessions"("initiatedBy", "status");

-- CreateIndex
CREATE INDEX "brainstorm_sessions_level_status_idx" ON "brainstorm_sessions"("level", "status");

-- CreateIndex
CREATE INDEX "brainstorm_ideas_sessionId_compositeScore_idx" ON "brainstorm_ideas"("sessionId", "compositeScore");

-- CreateIndex
CREATE INDEX "brainstorm_ideas_generatedBy_idx" ON "brainstorm_ideas"("generatedBy");

-- CreateIndex
CREATE INDEX "client_memories_tenantId_category_idx" ON "client_memories"("tenantId", "category");

-- CreateIndex
CREATE INDEX "client_memories_tenantId_importance_idx" ON "client_memories"("tenantId", "importance");

-- CreateIndex
CREATE INDEX "external_resources_status_idx" ON "external_resources"("status");

-- CreateIndex
CREATE INDEX "external_resources_nextPaymentDate_idx" ON "external_resources"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "PayrollEntry_tenantId_importBatchId_idx" ON "PayrollEntry"("tenantId", "importBatchId");

-- CreateIndex
CREATE INDEX "PayrollEntry_tenantId_jobFamily_idx" ON "PayrollEntry"("tenantId", "jobFamily");

-- CreateIndex
CREATE INDEX "PayrollEntry_tenantId_gender_idx" ON "PayrollEntry"("tenantId", "gender");

-- CreateIndex
CREATE INDEX "PayrollEntry_tenantId_hierarchyLevel_idx" ON "PayrollEntry"("tenantId", "hierarchyLevel");

-- CreateIndex
CREATE INDEX "PayrollImportBatch_tenantId_idx" ON "PayrollImportBatch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CriteriaMapping_legalCriterion_jobgradeFactor_key" ON "CriteriaMapping"("legalCriterion", "jobgradeFactor");

-- CreateIndex
CREATE INDEX "salary_benchmarks_jobFamily_seniorityLevel_year_idx" ON "salary_benchmarks"("jobFamily", "seniorityLevel", "year");

-- CreateIndex
CREATE INDEX "salary_benchmarks_country_year_quarter_idx" ON "salary_benchmarks"("country", "year", "quarter");

-- CreateIndex
CREATE INDEX "salary_benchmarks_gradeMin_gradeMax_idx" ON "salary_benchmarks"("gradeMin", "gradeMax");

-- CreateIndex
CREATE INDEX "salary_benchmarks_corCode_idx" ON "salary_benchmarks"("corCode");

-- CreateIndex
CREATE INDEX "conversation_threads_tenantId_userId_isActive_idx" ON "conversation_threads"("tenantId", "userId", "isActive");

-- CreateIndex
CREATE INDEX "conversation_threads_userId_agentRole_idx" ON "conversation_threads"("userId", "agentRole");

-- CreateIndex
CREATE INDEX "conversation_messages_threadId_createdAt_idx" ON "conversation_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "interaction_logs_tenantId_userId_createdAt_idx" ON "interaction_logs"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "interaction_logs_userId_eventType_idx" ON "interaction_logs"("userId", "eventType");

-- CreateIndex
CREATE INDEX "interaction_logs_tenantId_entityType_entityId_idx" ON "interaction_logs"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "disfunction_events_class_status_idx" ON "disfunction_events"("class", "status");

-- CreateIndex
CREATE INDEX "disfunction_events_targetType_targetId_idx" ON "disfunction_events"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "disfunction_events_detectedAt_idx" ON "disfunction_events"("detectedAt");

-- CreateIndex
CREATE INDEX "flux_step_roles_fluxId_idx" ON "flux_step_roles"("fluxId");

-- CreateIndex
CREATE INDEX "flux_step_roles_roleCode_idx" ON "flux_step_roles"("roleCode");

-- CreateIndex
CREATE UNIQUE INDEX "flux_step_roles_fluxId_stepId_roleCode_raci_key" ON "flux_step_roles"("fluxId", "stepId", "roleCode", "raci");

-- CreateIndex
CREATE INDEX "reorganization_events_triggeredByRole_status_idx" ON "reorganization_events"("triggeredByRole", "status");

-- CreateIndex
CREATE INDEX "reorganization_events_status_autoRevertAt_idx" ON "reorganization_events"("status", "autoRevertAt");

-- CreateIndex
CREATE INDEX "reorganization_events_patternSignature_idx" ON "reorganization_events"("patternSignature");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_code_key" ON "businesses"("code");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "businesses"("status");

-- CreateIndex
CREATE INDEX "organizational_objectives_businessId_status_idx" ON "organizational_objectives"("businessId", "status");

-- CreateIndex
CREATE INDEX "organizational_objectives_businessId_priority_idx" ON "organizational_objectives"("businessId", "priority");

-- CreateIndex
CREATE INDEX "organizational_objectives_deadlineAt_idx" ON "organizational_objectives"("deadlineAt");

-- CreateIndex
CREATE INDEX "organizational_objectives_parentObjectiveId_idx" ON "organizational_objectives"("parentObjectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "organizational_objectives_businessId_code_key" ON "organizational_objectives"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "external_signals_fingerprint_key" ON "external_signals"("fingerprint");

-- CreateIndex
CREATE INDEX "external_signals_category_capturedAt_idx" ON "external_signals"("category", "capturedAt");

-- CreateIndex
CREATE INDEX "external_signals_processedAt_idx" ON "external_signals"("processedAt");

-- CreateIndex
CREATE INDEX "external_signals_source_capturedAt_idx" ON "external_signals"("source", "capturedAt");

-- CreateIndex
CREATE INDEX "agent_behavior_patches_businessId_status_idx" ON "agent_behavior_patches"("businessId", "status");

-- CreateIndex
CREATE INDEX "agent_behavior_patches_targetRole_status_idx" ON "agent_behavior_patches"("targetRole", "status");

-- CreateIndex
CREATE INDEX "agent_behavior_patches_expiresAt_idx" ON "agent_behavior_patches"("expiresAt");

-- CreateIndex
CREATE INDEX "homeostatic_targets_businessId_isActive_idx" ON "homeostatic_targets"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "homeostatic_targets_currentStatus_idx" ON "homeostatic_targets"("currentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "homeostatic_targets_businessId_code_key" ON "homeostatic_targets"("businessId", "code");

-- CreateIndex
CREATE INDEX "agent_tasks_businessId_assignedTo_status_idx" ON "agent_tasks"("businessId", "assignedTo", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_businessId_assignedBy_status_idx" ON "agent_tasks"("businessId", "assignedBy", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_assignedTo_status_idx" ON "agent_tasks"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_status_priority_idx" ON "agent_tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "agent_tasks_status_blockerType_idx" ON "agent_tasks"("status", "blockerType");

-- CreateIndex
CREATE INDEX "agent_tasks_deadlineAt_idx" ON "agent_tasks"("deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "boundary_rules_code_key" ON "boundary_rules"("code");

-- CreateIndex
CREATE INDEX "boundary_rules_businessId_ruleType_isActive_idx" ON "boundary_rules"("businessId", "ruleType", "isActive");

-- CreateIndex
CREATE INDEX "boundary_violations_ruleId_createdAt_idx" ON "boundary_violations"("ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "boundary_violations_businessId_createdAt_idx" ON "boundary_violations"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quarantine_entries_violationId_key" ON "quarantine_entries"("violationId");

-- CreateIndex
CREATE INDEX "quarantine_entries_status_idx" ON "quarantine_entries"("status");

-- CreateIndex
CREATE INDEX "quarantine_entries_contentHash_idx" ON "quarantine_entries"("contentHash");

-- CreateIndex
CREATE INDEX "immune_patterns_isActive_autoBlock_idx" ON "immune_patterns"("isActive", "autoBlock");

-- CreateIndex
CREATE UNIQUE INDEX "immune_patterns_businessId_patternType_patternKey_key" ON "immune_patterns"("businessId", "patternType", "patternKey");

-- CreateIndex
CREATE INDEX "resource_usage_businessId_agentRole_measuredAt_idx" ON "resource_usage"("businessId", "agentRole", "measuredAt");

-- CreateIndex
CREATE INDEX "resource_usage_businessId_measuredAt_idx" ON "resource_usage"("businessId", "measuredAt");

-- CreateIndex
CREATE INDEX "resource_usage_agentRole_actionType_idx" ON "resource_usage"("agentRole", "actionType");

-- CreateIndex
CREATE INDEX "resource_budgets_businessId_isActive_idx" ON "resource_budgets"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "resource_budgets_businessId_agentRole_key" ON "resource_budgets"("businessId", "agentRole");

-- CreateIndex
CREATE INDEX "resource_negotiations_businessId_status_idx" ON "resource_negotiations"("businessId", "status");

-- CreateIndex
CREATE INDEX "resource_negotiations_requestorRole_idx" ON "resource_negotiations"("requestorRole");

-- CreateIndex
CREATE INDEX "prune_candidates_businessId_status_idx" ON "prune_candidates"("businessId", "status");

-- CreateIndex
CREATE INDEX "prune_candidates_status_score_idx" ON "prune_candidates"("status", "score");

-- CreateIndex
CREATE UNIQUE INDEX "prune_candidates_entityType_entityId_key" ON "prune_candidates"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "propagation_events_businessId_status_idx" ON "propagation_events"("businessId", "status");

-- CreateIndex
CREATE INDEX "propagation_events_sourceRole_idx" ON "propagation_events"("sourceRole");

-- CreateIndex
CREATE INDEX "service_outcomes_businessId_isActive_idx" ON "service_outcomes"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_outcomes_businessId_serviceCode_key" ON "service_outcomes"("businessId", "serviceCode");

-- CreateIndex
CREATE INDEX "outcome_measurements_outcomeId_measuredAt_idx" ON "outcome_measurements"("outcomeId", "measuredAt");

-- CreateIndex
CREATE INDEX "wild_cards_businessId_weekOf_idx" ON "wild_cards"("businessId", "weekOf");

-- CreateIndex
CREATE UNIQUE INDEX "wild_cards_targetRole_weekOf_key" ON "wild_cards"("targetRole", "weekOf");

-- CreateIndex
CREATE INDEX "rituals_isActive_ritualType_idx" ON "rituals"("isActive", "ritualType");

-- CreateIndex
CREATE UNIQUE INDEX "rituals_businessId_code_key" ON "rituals"("businessId", "code");

-- CreateIndex
CREATE INDEX "adaptation_metrics_businessId_metricCode_measuredAt_idx" ON "adaptation_metrics"("businessId", "metricCode", "measuredAt");

-- CreateIndex
CREATE INDEX "adaptation_metrics_measuredAt_idx" ON "adaptation_metrics"("measuredAt");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_contactEmail_idx" ON "leads"("contactEmail");

-- CreateIndex
CREATE INDEX "leads_nextFollowUpAt_idx" ON "leads"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "leads_assignedAgent_idx" ON "leads"("assignedAgent");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_users_alias_key" ON "b2c_users"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_users_email_key" ON "b2c_users"("email");

-- CreateIndex
CREATE INDEX "b2c_users_deleteScheduledFor_idx" ON "b2c_users"("deleteScheduledFor");

-- CreateIndex
CREATE INDEX "b2c_users_status_idx" ON "b2c_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_profiles_userId_key" ON "b2c_profiles"("userId");

-- CreateIndex
CREATE INDEX "b2c_card_progress_userId_status_idx" ON "b2c_card_progress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_card_progress_userId_card_key" ON "b2c_card_progress"("userId", "card");

-- CreateIndex
CREATE INDEX "b2c_sessions_userId_card_idx" ON "b2c_sessions"("userId", "card");

-- CreateIndex
CREATE INDEX "b2c_sessions_userId_agentRole_idx" ON "b2c_sessions"("userId", "agentRole");

-- CreateIndex
CREATE INDEX "b2c_test_results_userId_testType_idx" ON "b2c_test_results"("userId", "testType");

-- CreateIndex
CREATE INDEX "b2c_evolution_entries_userId_card_createdAt_idx" ON "b2c_evolution_entries"("userId", "card", "createdAt");

-- CreateIndex
CREATE INDEX "b2c_evolution_entries_userId_createdAt_idx" ON "b2c_evolution_entries"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_communities_card_key" ON "b2c_communities"("card");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_community_members_communityId_userId_key" ON "b2c_community_members"("communityId", "userId");

-- CreateIndex
CREATE INDEX "b2c_community_messages_communityId_createdAt_idx" ON "b2c_community_messages"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_credit_balances_userId_key" ON "b2c_credit_balances"("userId");

-- CreateIndex
CREATE INDEX "b2c_credit_transactions_userId_createdAt_idx" ON "b2c_credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "b2c_journal_entries_userId_card_createdAt_idx" ON "b2c_journal_entries"("userId", "card", "createdAt");

-- CreateIndex
CREATE INDEX "b2c_journal_entries_userId_status_idx" ON "b2c_journal_entries"("userId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subfactors" ADD CONSTRAINT "subfactors_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_jobs" ADD CONSTRAINT "session_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_jobs" ADD CONSTRAINT "session_jobs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_sessionJobId_fkey" FOREIGN KEY ("sessionJobId") REFERENCES "session_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "job_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subfactorId_fkey" FOREIGN KEY ("subfactorId") REFERENCES "subfactors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_questions" ADD CONSTRAINT "clarification_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_questions" ADD CONSTRAINT "clarification_questions_askedBy_fkey" FOREIGN KEY ("askedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_answers" ADD CONSTRAINT "clarification_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "clarification_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_answers" ADD CONSTRAINT "clarification_answers_answeredBy_fkey" FOREIGN KEY ("answeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_statuses" ADD CONSTRAINT "consensus_statuses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_statuses" ADD CONSTRAINT "consensus_statuses_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_statuses" ADD CONSTRAINT "consensus_statuses_finalSubfactorId_fkey" FOREIGN KEY ("finalSubfactorId") REFERENCES "subfactors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_subfactorId_fkey" FOREIGN KEY ("subfactorId") REFERENCES "subfactors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilitator_decisions" ADD CONSTRAINT "facilitator_decisions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilitator_decisions" ADD CONSTRAINT "facilitator_decisions_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilitator_decisions" ADD CONSTRAINT "facilitator_decisions_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilitator_decisions" ADD CONSTRAINT "facilitator_decisions_subfactorId_fkey" FOREIGN KEY ("subfactorId") REFERENCES "subfactors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_results" ADD CONSTRAINT "job_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_results" ADD CONSTRAINT "job_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_results" ADD CONSTRAINT "job_results_salaryGradeId_fkey" FOREIGN KEY ("salaryGradeId") REFERENCES "salary_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_grades" ADD CONSTRAINT "salary_grades_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_grades" ADD CONSTRAINT "salary_grades_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_records" ADD CONSTRAINT "employee_salary_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_records" ADD CONSTRAINT "employee_salary_records_salaryGradeId_fkey" FOREIGN KEY ("salaryGradeId") REFERENCES "salary_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_gap_reports" ADD CONSTRAINT "pay_gap_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joint_pay_assessments" ADD CONSTRAINT "joint_pay_assessments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joint_pay_assessments" ADD CONSTRAINT "joint_pay_assessments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "pay_gap_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_salaryGradeId_fkey" FOREIGN KEY ("salaryGradeId") REFERENCES "salary_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_subfactorId_fkey" FOREIGN KEY ("subfactorId") REFERENCES "subfactors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_packages" ADD CONSTRAINT "compensation_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_packages" ADD CONSTRAINT "compensation_packages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_definitions" ADD CONSTRAINT "kpi_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_definitions" ADD CONSTRAINT "kpi_definitions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "compensation_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_parentRole_fkey" FOREIGN KEY ("parentRole") REFERENCES "agent_definitions"("agentRole") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_childRole_fkey" FOREIGN KEY ("childRole") REFERENCES "agent_definitions"("agentRole") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_proposals" ADD CONSTRAINT "org_proposals_agentRole_fkey" FOREIGN KEY ("agentRole") REFERENCES "agent_definitions"("agentRole") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_metrics" ADD CONSTRAINT "agent_metrics_agentRole_fkey" FOREIGN KEY ("agentRole") REFERENCES "agent_definitions"("agentRole") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brainstorm_ideas" ADD CONSTRAINT "brainstorm_ideas_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "brainstorm_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_memories" ADD CONSTRAINT "client_memories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollImportBatch" ADD CONSTRAINT "PayrollImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boundary_violations" ADD CONSTRAINT "boundary_violations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "boundary_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_entries" ADD CONSTRAINT "quarantine_entries_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "boundary_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcome_measurements" ADD CONSTRAINT "outcome_measurements_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "service_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_profiles" ADD CONSTRAINT "b2c_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_card_progress" ADD CONSTRAINT "b2c_card_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_sessions" ADD CONSTRAINT "b2c_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_test_results" ADD CONSTRAINT "b2c_test_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_evolution_entries" ADD CONSTRAINT "b2c_evolution_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_community_members" ADD CONSTRAINT "b2c_community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "b2c_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_community_members" ADD CONSTRAINT "b2c_community_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_community_messages" ADD CONSTRAINT "b2c_community_messages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "b2c_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_credit_balances" ADD CONSTRAINT "b2c_credit_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_credit_transactions" ADD CONSTRAINT "b2c_credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_journal_entries" ADD CONSTRAINT "b2c_journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "b2c_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

