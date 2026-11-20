import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  roleTitle: text('role_title'),
  programLevelScope: text('program_level_scope'),
  assignedDepartment: text('assigned_department'),
  departmentOfferStatus: text('department_offer_status'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const records = pgTable('records', {
  id: text('id').primaryKey(),
  year: integer('year').notNull(),
  program: text('program').notNull(),
  department: text('department').notNull(),
  mode: text('mode').notNull(),
  campus: text('campus'),
  male: integer('male'),
  female: integer('female'),
  total: integer('total'),
  sourceCell: text('source_cell'),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  institution: text('institution'),
  preparedBy: text('prepared_by'),
  date: text('date'),
  status: text('status').default('Draft'),
  sections: jsonb('sections'),
  customSummary: text('custom_summary'),
  customFindings: jsonb('custom_findings'),
  customNotes: jsonb('custom_notes'),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const loginLogs = pgTable('login_logs', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  timestamp: timestamp('timestamp').defaultNow()
});
