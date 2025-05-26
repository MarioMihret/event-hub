import mongoose, { Schema, Document } from 'mongoose';

// Define interfaces for the nested objects
interface Feature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

interface Limits {
  maxEvents: number;
  maxAttendeesPerEvent: number;
  maxFileUploads: number;
  maxImageSize: number;
  maxVideoLength: number;
  customDomain: boolean;
  analytics: string;
  support: string;
  eventTypes: string[];
}

interface Metadata {
  isPopular: boolean;
  isTrial: boolean;
  isEnterpriseFlag: boolean;
}

// Define the main document interface
export interface IPlanDefinition extends Document {
  slug: string;
  name: string;
  price: number;
  durationDays: number;
  description: string;
  features: Feature[];
  limits: Limits;
  displayOrder: number;
  isActive: boolean;
  metadata: Metadata;
  updatedAt: Date;
}

// Define schemas for the nested objects
const FeatureSchema = new Schema<Feature>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  included: { type: Boolean, default: false }
});

const LimitsSchema = new Schema<Limits>({
  maxEvents: { type: Number, default: 0 },
  maxAttendeesPerEvent: { type: Number, default: 0 },
  maxFileUploads: { type: Number, default: 0 },
  maxImageSize: { type: Number, default: 0 },
  maxVideoLength: { type: Number, default: 0 },
  customDomain: { type: Boolean, default: false },
  analytics: { type: String, default: 'basic' },
  support: { type: String, default: 'email' },
  eventTypes: [{ type: String }]
});

const MetadataSchema = new Schema<Metadata>({
  isPopular: { type: Boolean, default: false },
  isTrial: { type: Boolean, default: false },
  isEnterpriseFlag: { type: Boolean, default: false }
});

// Define the main schema
const PlanDefinitionSchema = new Schema<IPlanDefinition>({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  description: { type: String, required: true },
  features: [FeatureSchema],
  limits: { type: LimitsSchema, required: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: MetadataSchema, default: () => ({}) },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create or retrieve the model
export default mongoose.models.PlanDefinition || mongoose.model<IPlanDefinition>('PlanDefinition', PlanDefinitionSchema); 