import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user table (required by template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Container table
export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  containerId: text("container_id").notNull().unique(),
  zone: text("zone").notNull(),
  width: integer("width").notNull(),
  depth: integer("depth").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContainerSchema = createInsertSchema(containers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContainer = z.infer<typeof insertContainerSchema>;
export type Container = typeof containers.$inferSelect;

// Coordinates schema for item positioning
export const coordinatesSchema = z.object({
  width: z.number(),
  depth: z.number(),
  height: z.number(),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

// Position schema for item placement
export const positionSchema = z.object({
  startCoordinates: coordinatesSchema,
  endCoordinates: coordinatesSchema,
});

export type Position = z.infer<typeof positionSchema>;

// Item table
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  itemId: text("item_id").notNull().unique(),
  name: text("name").notNull(),
  containerId: text("container_id").notNull().references(() => containers.containerId),
  expiryDate: text("expiry_date").notNull(),
  usageLimit: integer("usage_limit").notNull(),
  mass: integer("mass").notNull(),
  position: json("position").$type<Position>(),
  width: integer("width"),
  depth: integer("depth"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

// Retrieval log table
export const retrievalLogs = pgTable("retrieval_logs", {
  id: serial("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => items.itemId),
  retrievedBy: text("retrieved_by").notNull(),
  fromContainer: text("from_container").notNull(),
  newContainer: text("new_container"),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type"),
  title: text("title"),
  description: text("description"),
  user: text("user"),
});

export const insertRetrievalLogSchema = createInsertSchema(retrievalLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertRetrievalLog = z.infer<typeof insertRetrievalLogSchema>;
export type RetrievalLog = typeof retrievalLogs.$inferSelect;

// Waste return table
export const wasteReturns = pgTable("waste_returns", {
  id: serial("id").primaryKey(),
  itemIds: text("item_ids").array().notNull(),
  schedule: text("schedule").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWasteReturnSchema = createInsertSchema(wasteReturns).omit({
  id: true,
  createdAt: true,
});

export type InsertWasteReturn = z.infer<typeof insertWasteReturnSchema>;
export type WasteReturn = typeof wasteReturns.$inferSelect;

// Simulation settings table
export const simulationSettings = pgTable("simulation_settings", {
  id: serial("id").primaryKey(),
  isRunning: boolean("is_running").default(false),
  speed: integer("speed").default(10),
  elapsedHours: integer("elapsed_hours").default(0),
  autoExpiry: boolean("auto_expiry").default(true),
  expiredItems: integer("expired_items").default(0),
});

export const insertSimulationSettingsSchema = createInsertSchema(simulationSettings).omit({
  id: true,
});

export type InsertSimulationSettings = z.infer<typeof insertSimulationSettingsSchema>;
export type SimulationSettings = typeof simulationSettings.$inferSelect;
