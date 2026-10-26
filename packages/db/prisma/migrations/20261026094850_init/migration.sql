-- CreateEnum
CREATE TYPE "DirectiveCategory" AS ENUM ('GUIDANCE', 'RULE', 'RECALL', 'SAFETY_ALERT', 'LABELING_CHANGE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DirectiveStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNDER_REVIEW', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateTable
CREATE TABLE "regulatory_authorities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "website_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_directives" (
    "id" TEXT NOT NULL,
    "authority_id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DirectiveCategory" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'UNKNOWN',
    "status" "DirectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_date" DATE,
    "comment_deadline" DATE,
    "published_date" DATE,
    "raw_metadata" JSONB,
    "has_data_anomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_directives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" TEXT NOT NULL,
    "directive_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'P3',
    "status" "ActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" DATE,
    "resolved_at" TIMESTAMP(3),
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "has_data_anomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affected_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ndc_code" TEXT,
    "therapeutic_area" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affected_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DirectiveProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DirectiveProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_authorities_name_key" ON "regulatory_authorities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_authorities_acronym_key" ON "regulatory_authorities"("acronym");

-- CreateIndex
CREATE INDEX "compliance_directives_authority_id_idx" ON "compliance_directives"("authority_id");

-- CreateIndex
CREATE INDEX "compliance_directives_status_idx" ON "compliance_directives"("status");

-- CreateIndex
CREATE INDEX "compliance_directives_severity_idx" ON "compliance_directives"("severity");

-- CreateIndex
CREATE INDEX "compliance_directives_has_data_anomaly_idx" ON "compliance_directives"("has_data_anomaly");

-- CreateIndex
CREATE INDEX "action_items_directive_id_idx" ON "action_items"("directive_id");

-- CreateIndex
CREATE INDEX "action_items_assignee_id_idx" ON "action_items"("assignee_id");

-- CreateIndex
CREATE INDEX "action_items_status_idx" ON "action_items"("status");

-- CreateIndex
CREATE INDEX "action_items_priority_idx" ON "action_items"("priority");

-- CreateIndex
CREATE INDEX "action_items_has_data_anomaly_idx" ON "action_items"("has_data_anomaly");

-- CreateIndex
CREATE UNIQUE INDEX "assignees_email_key" ON "assignees"("email");

-- CreateIndex
CREATE INDEX "_DirectiveProducts_B_index" ON "_DirectiveProducts"("B");

-- AddForeignKey
ALTER TABLE "compliance_directives" ADD CONSTRAINT "compliance_directives_authority_id_fkey" FOREIGN KEY ("authority_id") REFERENCES "regulatory_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_directive_id_fkey" FOREIGN KEY ("directive_id") REFERENCES "compliance_directives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "assignees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectiveProducts" ADD CONSTRAINT "_DirectiveProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "affected_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectiveProducts" ADD CONSTRAINT "_DirectiveProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "compliance_directives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
