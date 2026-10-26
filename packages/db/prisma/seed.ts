import { PrismaClient, DirectiveCategory, Severity, DirectiveStatus, ActionItemStatus, Priority } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const AUTHORITIES = [
  { name: 'Food and Drug Administration', acronym: 'FDA', jurisdiction: 'United States', websiteUrl: 'https://www.fda.gov' },
  { name: 'European Medicines Agency', acronym: 'EMA', jurisdiction: 'European Union', websiteUrl: 'https://www.ema.europa.eu' },
  { name: 'Pharmaceuticals and Medical Devices Agency', acronym: 'PMDA', jurisdiction: 'Japan', websiteUrl: 'https://www.pmda.go.jp' },
  { name: 'Therapeutic Goods Administration', acronym: 'TGA', jurisdiction: 'Australia', websiteUrl: 'https://www.tga.gov.au' },
  { name: 'Health Canada', acronym: 'HC', jurisdiction: 'Canada', websiteUrl: 'https://www.canada.ca/en/health-canada.html' },
  { name: 'Medicines and Healthcare products Regulatory Agency', acronym: 'MHRA', jurisdiction: 'United Kingdom', websiteUrl: 'https://www.gov.uk/government/organisations/mhra' },
  { name: 'National Medical Products Administration', acronym: 'NMPA', jurisdiction: 'China', websiteUrl: 'https://www.nmpa.gov.cn' },
  { name: 'Central Drugs Standard Control Organisation', acronym: 'CDSCO', jurisdiction: 'India', websiteUrl: 'https://cdsco.gov.in' },
];

const PRODUCTS = [
  { name: 'Metformin HCl 500mg Tablets', ndcCode: '0093-7212-01', therapeuticArea: 'Endocrinology' },
  { name: 'Adalimumab Biosimilar 40mg/0.8mL', ndcCode: '0074-3799-02', therapeuticArea: 'Immunology' },
  { name: 'Pembrolizumab 100mg/4mL Injection', ndcCode: '0006-3026-02', therapeuticArea: 'Oncology' },
  { name: 'Apixaban 5mg Tablets', ndcCode: '0003-0894-21', therapeuticArea: 'Cardiovascular' },
  { name: 'Semaglutide 0.5mg Injection', ndcCode: '0169-4130-12', therapeuticArea: 'Endocrinology' },
  { name: 'Trastuzumab 150mg Powder', ndcCode: null, therapeuticArea: 'Oncology' },
  { name: 'Risperidone 2mg Tablets', ndcCode: '0591-0402-01', therapeuticArea: 'Psychiatry' },
  { name: 'Liraglutide 6mg/mL Injection', ndcCode: '0169-4060-12', therapeuticArea: 'Endocrinology' },
  { name: 'Nivolumab 240mg/24mL Injection', ndcCode: null, therapeuticArea: 'Oncology' },
  { name: 'Dapagliflozin 10mg Tablets', ndcCode: '0310-6205-30', therapeuticArea: 'Cardiovascular' },
];

const ASSIGNEES = [
  { name: 'Dr. Sarah Chen', email: 'sarah.chen@artixio.com', department: 'Regulatory Affairs' },
  { name: 'James Rodriguez', email: 'james.rodriguez@artixio.com', department: 'Quality Assurance' },
  { name: 'Dr. Priya Patel', email: 'priya.patel@artixio.com', department: 'Medical Safety' },
  { name: 'Michael Thompson', email: 'michael.thompson@artixio.com', department: 'Regulatory Affairs' },
  { name: 'Anika Müller', email: 'anika.mueller@artixio.com', department: 'Compliance Operations' },
];

interface DirectiveTemplate {
  title: string;
  description: string;
  category: DirectiveCategory;
  severity: Severity;
  status: DirectiveStatus;
  refPrefix: string;
  anomaly?: string;
}

const DIRECTIVE_TEMPLATES: DirectiveTemplate[] = [
  {
    title: 'Updated Guidance on Biosimilar Interchangeability Standards',
    description: 'This guidance provides updated recommendations for demonstrating interchangeability between a proposed biosimilar product and the reference product. It outlines study design considerations and statistical approaches for evaluating switching studies.',
    category: 'GUIDANCE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Safety Communication: Risk of Serious Hypoglycemia with SGLT2 Inhibitors',
    description: 'The agency is alerting healthcare professionals and patients about reports of serious hypoglycemia events in patients taking SGLT2 inhibitors concomitantly with insulin or insulin secretagogues.',
    category: 'SAFETY_ALERT',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Revision of Annex II: Environmental Risk Assessment Requirements',
    description: 'This regulatory revision introduces enhanced requirements for environmental risk assessments as part of the marketing authorization application for human medicinal products within the European Union.',
    category: 'RULE',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    refPrefix: 'EMA',
  },
  {
    title: 'Class II Recall: Contaminated Batch of Metformin Tablets',
    description: 'Voluntary recall of specific batches of Metformin HCl 500mg tablets due to detection of NDMA levels above the acceptable daily intake limit. Affected lot numbers: MET-2024-A1 through MET-2024-A7.',
    category: 'RECALL',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Draft Guidance on Real-World Evidence for Regulatory Decision-Making',
    description: 'This draft guidance describes considerations for using real-world data and real-world evidence in regulatory submissions for drug and biological products.',
    category: 'GUIDANCE',
    severity: 'LOW',
    status: 'DRAFT',
    refPrefix: 'FDA',
  },
  {
    title: 'Labeling Update Requirements for Oncology Products: Patient Information Leaflets',
    description: 'New requirements for patient information leaflets accompanying oncology products, including enhanced adverse reaction tables and dosing modification guidelines.',
    category: 'LABELING_CHANGE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'EMA',
  },
  {
    title: 'Post-Market Surveillance Report Requirements: Biologic Products',
    description: 'Updated periodic safety update report (PSUR) submission timelines and format requirements for all authorized biologic products.',
    category: 'RULE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'PMDA',
  },
  {
    title: 'Safety Review of Cardiovascular Outcomes with GLP-1 Receptor Agonists',
    description: 'Comprehensive safety review examining cardiovascular outcomes data from post-marketing surveillance studies of GLP-1 receptor agonists.',
    category: 'SAFETY_ALERT',
    severity: 'HIGH',
    status: 'UNDER_REVIEW',
    refPrefix: 'TGA',
  },
  {
    title: 'Guidance on Clinical Trial Design for Rare Disease Therapies',
    description: 'Recommendations for adaptive and innovative clinical trial designs when developing therapies for rare diseases with limited patient populations.',
    category: 'GUIDANCE',
    severity: 'LOW',
    status: 'PUBLISHED',
    refPrefix: 'HC',
  },
  {
    title: 'Post-Brexit Regulatory Alignment: Mutual Recognition Procedures',
    description: 'Transitional guidance on mutual recognition procedures for medicinal products between the UK and EU regulatory frameworks following the UK departure from the European Union.',
    category: 'RULE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'MHRA',
  },
  {
    title: 'Emergency Use Authorization: Novel Antiviral Compound NV-2847',
    description: 'Emergency use authorization for investigational antiviral compound NV-2847 for treatment of severe respiratory infections in hospitalized adults.',
    category: 'RULE',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
    anomaly: 'missing_effective_date',
  },
  {
    title: 'Superseded Guidance on Dissolution Testing for Oral Dosage Forms',
    description: 'This guidance has been withdrawn and superseded by updated recommendations. Previous dissolution testing protocols are no longer considered current.',
    category: 'GUIDANCE',
    severity: 'LOW',
    status: 'WITHDRAWN',
    refPrefix: 'FDA',
    anomaly: 'withdrawn_with_pending_actions',
  },
  {
    title: 'Quality Standards for Active Pharmaceutical Ingredients from Biological Sources',
    description: 'Updated quality standards and testing requirements for APIs derived from biological sources including recombinant proteins and monoclonal antibodies.',
    category: 'RULE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'INVALID',
    anomaly: 'malformed_reference',
  },
  {
    title: 'Upcoming Regulatory Framework for AI-Assisted Drug Discovery',
    description: 'Preliminary framework establishing regulatory expectations for the use of artificial intelligence and machine learning in drug discovery and preclinical development.',
    category: 'GUIDANCE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'EMA',
    anomaly: 'future_published_date',
  },
  {
    title: 'Safety Alert: Hepatotoxicity Risk with Novel Kinase Inhibitors',
    description: 'Alert regarding increased hepatotoxicity risk observed in post-marketing data for certain novel kinase inhibitors. Healthcare providers should monitor liver function tests.',
    category: 'SAFETY_ALERT',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
    anomaly: 'duplicate_reference',
  },
  {
    title: 'DUPLICATE — Safety Alert: Hepatotoxicity Risk with Novel Kinase Inhibitors',
    description: 'This is a duplicate entry that was accidentally ingested from a secondary data feed. It should be flagged for deduplication.',
    category: 'SAFETY_ALERT',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
    anomaly: 'duplicate_reference',
  },
  {
    title: 'Pharmacovigilance Reporting Standards Update',
    description: '<script>alert("xss")</script><b>IMPORTANT:</b> Updated pharmacovigilance reporting standards including <a href="javascript:void(0)">new electronic submission</a> requirements. Contact: regulatory@example.com\n\n' + 'A'.repeat(5000) + '\n\nEnd of notice.',
    category: 'RULE',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    refPrefix: 'NMPA',
    anomaly: 'malformed_description',
  },
  {
    title: 'Revised Guidelines for Pediatric Clinical Trials in Oncology',
    description: 'Updated guidelines addressing specific considerations for designing and conducting clinical trials for pediatric oncology indications.',
    category: 'GUIDANCE',
    severity: 'MEDIUM',
    status: 'DRAFT',
    refPrefix: 'FDA',
  },
  {
    title: 'Class I Recall: Defective Drug Delivery Device for Insulin Pens',
    description: 'Urgent recall of insulin delivery pen devices due to reports of incorrect dosing mechanism that may deliver higher-than-intended insulin doses.',
    category: 'RECALL',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'HC',
  },
  {
    title: 'New Requirements for Elemental Impurities Testing in Drug Products',
    description: 'Implementation of ICH Q3D guidelines for elemental impurities testing, requiring risk assessment and potential testing for 24 elemental impurities in pharmaceutical products.',
    category: 'RULE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'CDSCO',
  },
  {
    title: 'Guidance on Continuous Manufacturing for Pharmaceutical Products',
    description: 'Recommendations for implementing continuous manufacturing processes in pharmaceutical production, including process validation and real-time release testing considerations.',
    category: 'GUIDANCE',
    severity: 'LOW',
    status: 'PUBLISHED',
    refPrefix: 'PMDA',
  },
  {
    title: 'Safety Communication: Updated Boxed Warning for Fluoroquinolone Antibiotics',
    description: 'Strengthened warnings regarding the risk of disabling and potentially permanent side effects of fluoroquinolone antibiotics involving tendons, muscles, joints, nerves, and central nervous system.',
    category: 'SAFETY_ALERT',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Labeling Requirements for Combination Products: Device-Drug Interface',
    description: 'New labeling standards for combination products addressing the device-drug interface, including instructions for use and safety information integration.',
    category: 'LABELING_CHANGE',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    refPrefix: 'MHRA',
  },
  {
    title: 'Post-Authorization Safety Study Requirements for Conditional Approvals',
    description: 'Requirements for post-authorization safety studies for products granted conditional marketing authorization, including timelines and reporting obligations.',
    category: 'RULE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'EMA',
  },
  {
    title: 'Draft Guidance: Digital Health Technologies in Clinical Investigations',
    description: 'Framework for the use of digital health technologies such as wearables and mobile apps as data collection tools in clinical trials.',
    category: 'GUIDANCE',
    severity: 'LOW',
    status: 'DRAFT',
    refPrefix: 'TGA',
  },
  {
    title: 'Recall Notice: Contaminated Ophthalmic Solutions — Multiple Brands',
    description: 'Class I recall of multiple ophthalmic solution products due to potential bacterial contamination. Products manufactured at facility ID: OPH-MFG-2024.',
    category: 'RECALL',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Updated Stability Testing Requirements for Tropical Climate Zones',
    description: 'Revised stability testing conditions and shelf-life determination guidelines for pharmaceutical products intended for distribution in ICH Climatic Zones III and IV.',
    category: 'RULE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'CDSCO',
  },
  {
    title: 'Risk Evaluation and Mitigation Strategy: Opioid Analgesics',
    description: 'Updated REMS requirements for opioid analgesic products including enhanced patient counseling requirements and prescriber education programs.',
    category: 'SAFETY_ALERT',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'FDA',
  },
  {
    title: 'Good Manufacturing Practice Updates: Annex 1 Sterile Medicinal Products',
    description: 'Comprehensive revision of GMP Annex 1 covering the manufacture of sterile medicinal products, including new contamination control strategy requirements.',
    category: 'RULE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'EMA',
  },
  {
    title: 'Compassionate Use Programs: Regulatory Framework Update',
    description: 'Updated framework for compassionate use and expanded access programs, including streamlined application procedures and safety reporting requirements.',
    category: 'GUIDANCE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'NMPA',
  },
  {
    title: 'Safety Review: Thrombotic Events with COVID-19 Vaccines',
    description: 'Ongoing safety review of thrombotic thrombocytopenic events associated with adenoviral vector COVID-19 vaccines. Updated risk-benefit analysis included.',
    category: 'SAFETY_ALERT',
    severity: 'HIGH',
    status: 'SUPERSEDED',
    refPrefix: 'TGA',
  },
  {
    title: 'Labeling Update: Pregnancy and Lactation Information for Biologics',
    description: 'New labeling standards requiring structured pregnancy and lactation risk summaries, exposure registry information, and clinical considerations for all biologic products.',
    category: 'LABELING_CHANGE',
    severity: 'MEDIUM',
    status: 'PUBLISHED',
    refPrefix: 'HC',
  },
  {
    title: 'Quality Review: Data Integrity in GxP-Regulated Environments',
    description: 'Guidance on ensuring data integrity across all GxP-regulated environments including laboratory systems, manufacturing execution systems, and clinical data management.',
    category: 'GUIDANCE',
    severity: 'HIGH',
    status: 'PUBLISHED',
    refPrefix: 'MHRA',
  },
  {
    title: 'Draft Rule: Electronic Submissions Mandate for All Regulatory Filings',
    description: 'Proposed rule mandating electronic submission format (eCTD v4.0) for all regulatory filings, eliminating paper-based submissions effective 2026.',
    category: 'RULE',
    severity: 'MEDIUM',
    status: 'DRAFT',
    refPrefix: 'PMDA',
  },
  {
    title: 'Recall: Counterfeit Supply Chain Infiltration — Anti-Cancer Agents',
    description: 'Alert regarding confirmed counterfeit anti-cancer agents identified in the legitimate supply chain. Affected products include specific lots of generic imatinib and erlotinib.',
    category: 'RECALL',
    severity: 'CRITICAL',
    status: 'PUBLISHED',
    refPrefix: 'NMPA',
  },
];

const ACTION_ITEM_TEMPLATES = [
  { title: 'Review updated guidance and assess impact on current submissions', priority: 'P1' as Priority },
  { title: 'Update internal SOPs to align with new requirements', priority: 'P2' as Priority },
  { title: 'Notify affected product teams of regulatory change', priority: 'P1' as Priority },
  { title: 'Prepare compliance gap analysis report', priority: 'P2' as Priority },
  { title: 'Submit response to agency within comment period', priority: 'P0' as Priority },
  { title: 'Coordinate with manufacturing on batch disposition', priority: 'P0' as Priority },
  { title: 'Update labeling materials for affected products', priority: 'P1' as Priority },
  { title: 'Schedule cross-functional review meeting', priority: 'P3' as Priority },
  { title: 'File periodic safety update report (PSUR)', priority: 'P1' as Priority },
  { title: 'Conduct risk assessment for affected patient population', priority: 'P0' as Priority },
  { title: 'Archive superseded documentation', priority: 'P3' as Priority },
  { title: 'Verify batch testing compliance with new standards', priority: 'P1' as Priority },
  { title: 'Draft communication to healthcare providers', priority: 'P0' as Priority },
  { title: 'Review and update risk management plan', priority: 'P2' as Priority },
  { title: 'Assess training needs for updated procedures', priority: 'P3' as Priority },
];

function generateReferenceCode(prefix: string, index: number, anomaly?: string): string {
  if (anomaly === 'malformed_reference') {
    return `inv_ref_${index}!!!`;
  }
  if (anomaly === 'duplicate_reference') {
    return `FDA-2024-S-9999`;
  }
  const year = faker.helpers.arrayElement(['2023', '2024', '2025']);
  const letterCode = faker.helpers.arrayElement(['D', 'N', 'S', 'R', 'G']);
  const number = String(1000 + index).padStart(4, '0');
  return `${prefix}-${year}-${letterCode}-${number}`;
}

function generateDates(template: DirectiveTemplate): {
  effectiveDate: Date | null;
  commentDeadline: Date | null;
  publishedDate: Date | null;
} {
  const now = new Date();

  if (template.anomaly === 'missing_effective_date') {
    return {
      effectiveDate: null,
      commentDeadline: null,
      publishedDate: faker.date.recent({ days: 30 }),
    };
  }

  if (template.anomaly === 'future_published_date') {
    return {
      effectiveDate: faker.date.future({ years: 1 }),
      commentDeadline: null,
      publishedDate: faker.date.future({ years: 1 }),
    };
  }

  const publishedDate = template.status === 'DRAFT'
    ? null
    : faker.date.between({ from: new Date('2023-01-01'), to: now });

  const effectiveDate = template.status === 'DRAFT' || template.status === 'UNDER_REVIEW'
    ? null
    : publishedDate
      ? faker.date.between({ from: publishedDate, to: new Date(publishedDate.getTime() + 90 * 24 * 60 * 60 * 1000) })
      : null;

  const commentDeadline = template.status === 'DRAFT' || template.status === 'UNDER_REVIEW'
    ? faker.date.between({ from: now, to: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) })
    : null;

  return { effectiveDate, commentDeadline, publishedDate };
}

async function seed() {
  console.log('Beginning database seeding...');

  await prisma.actionItem.deleteMany();
  await prisma.complianceDirective.deleteMany();
  await prisma.affectedProduct.deleteMany();
  await prisma.assignee.deleteMany();
  await prisma.regulatoryAuthority.deleteMany();

  const authorities = await Promise.all(
    AUTHORITIES.map(a => prisma.regulatoryAuthority.create({ data: a }))
  );
  const authorityMap = new Map(authorities.map(a => [a.acronym, a]));

  const products = await Promise.all(
    PRODUCTS.map(p => prisma.affectedProduct.create({ data: p }))
  );

  const assignees = await Promise.all(
    ASSIGNEES.map(a => prisma.assignee.create({ data: a }))
  );

  const directives = [];

  for (let i = 0; i < DIRECTIVE_TEMPLATES.length; i++) {
    const template = DIRECTIVE_TEMPLATES[i];
    const authority = authorityMap.get(template.refPrefix) || authorities[0];
    const dates = generateDates(template);
    const referenceCode = generateReferenceCode(template.refPrefix, i, template.anomaly);

    const productCount = faker.number.int({ min: 1, max: 3 });
    const shuffledProducts = faker.helpers.shuffle(products);
    const assignedProducts = shuffledProducts.slice(0, productCount);

    const directive = await prisma.complianceDirective.create({
      data: {
        authorityId: authority.id,
        referenceCode,
        title: template.title,
        description: template.description,
        category: template.category,
        severity: template.severity,
        status: template.status,
        effectiveDate: dates.effectiveDate,
        commentDeadline: dates.commentDeadline,
        publishedDate: dates.publishedDate,
        rawMetadata: {
          source_feed: faker.helpers.arrayElement(['primary_api', 'secondary_scraper', 'manual_entry', 'partner_feed']),
          ingestion_timestamp: new Date().toISOString(),
          source_url: faker.internet.url(),
          confidence_score: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
        },
        hasDataAnomaly: false,
        anomalyDetails: null,
        affectedProducts: {
          connect: assignedProducts.map(p => ({ id: p.id })),
        },
      },
    });

    directives.push({ ...directive, anomaly: template.anomaly });
  }

  const now = new Date();

  for (const directive of directives) {
    const itemCount = faker.number.int({ min: 1, max: 3 });
    const selectedTemplates = faker.helpers.shuffle(ACTION_ITEM_TEMPLATES).slice(0, itemCount);

    for (let j = 0; j < selectedTemplates.length; j++) {
      const tmpl = selectedTemplates[j];
      let status: ActionItemStatus = faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'] as ActionItemStatus[]);
      let assigneeId: string | null = faker.helpers.arrayElement(assignees).id;
      let dueDate: Date | null = faker.date.between({
        from: now,
        to: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      });
      let priority = tmpl.priority;
      let notes: string | null = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) ?? null;

      if (directive.anomaly !== 'withdrawn_with_pending_actions' && j === 0 && faker.datatype.boolean(0.2)) {
        status = 'PENDING';
        dueDate = faker.date.between({
          from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          to: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        });
      }

      if (directive.anomaly === 'withdrawn_with_pending_actions') {
        status = 'PENDING';
        priority = 'P1';
      }

      if (j === 0 && faker.datatype.boolean(0.15)) {
        priority = 'P0';
        assigneeId = null;
      }

      const resolvedAt = status === 'RESOLVED' ? faker.date.recent({ days: 14 }) : null;

      await prisma.actionItem.create({
        data: {
          directiveId: directive.id,
          assigneeId,
          title: tmpl.title,
          notes,
          priority,
          status,
          dueDate,
          resolvedAt,
          isFlagged: faker.datatype.boolean(0.1),
          hasDataAnomaly: false,
          anomalyDetails: null,
        },
      });
    }
  }

  await detectAnomalies();
  console.log('Seeding completed successfully.');
}

async function detectAnomalies() {
  const allDirectives = await prisma.complianceDirective.findMany({
    include: { actionItems: true },
  });

  const refCodePattern = /^[A-Z]{2,5}-\d{4}-[A-Z]-\d+$/;

  for (const directive of allDirectives) {
    const anomalies: string[] = [];

    if (directive.status === 'PUBLISHED' && !directive.effectiveDate) {
      anomalies.push('Published directive has no effective date');
    }

    if (!refCodePattern.test(directive.referenceCode)) {
      anomalies.push(`Reference code "${directive.referenceCode}" does not match standard format`);
    }

    if (directive.publishedDate && directive.publishedDate > new Date()) {
      anomalies.push('Published date is in the future');
    }

    const duplicates = allDirectives.filter(
      d => d.id !== directive.id && d.referenceCode === directive.referenceCode
    );
    if (duplicates.length > 0) {
      anomalies.push(`Duplicate reference code shared with ${duplicates.length} other directive(s)`);
    }

    if (directive.description) {
      if (/<script|<\/script|javascript:/i.test(directive.description)) {
        anomalies.push('Description contains potentially unsafe HTML/script content');
      }
      if (directive.description.length > 2000) {
        anomalies.push(`Description is excessively long (${directive.description.length} chars)`);
      }
    }

    if (directive.status === 'WITHDRAWN') {
      const pendingCount = directive.actionItems.filter(ai => ai.status === 'PENDING').length;
      if (pendingCount > 0) {
        anomalies.push(`Withdrawn directive still has ${pendingCount} pending action item(s)`);
      }
    }

    if (anomalies.length > 0) {
      await prisma.complianceDirective.update({
        where: { id: directive.id },
        data: {
          hasDataAnomaly: true,
          anomalyDetails: anomalies.join(' | '),
        },
      });
    }

    for (const actionItem of directive.actionItems) {
      const aiAnomalies: string[] = [];

      if (actionItem.status === 'PENDING' && actionItem.dueDate && actionItem.dueDate < new Date()) {
        aiAnomalies.push('Overdue action item still marked as pending');
      }

      if (actionItem.priority === 'P0' && !actionItem.assigneeId) {
        aiAnomalies.push('Critical (P0) action item has no assignee');
      }

      if (directive.status === 'WITHDRAWN' && actionItem.status === 'PENDING') {
        aiAnomalies.push('Action item references a withdrawn directive');
      }

      if (aiAnomalies.length > 0) {
        await prisma.actionItem.update({
          where: { id: actionItem.id },
          data: {
            hasDataAnomaly: true,
            anomalyDetails: aiAnomalies.join(' | '),
          },
        });
      }
    }
  }
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
