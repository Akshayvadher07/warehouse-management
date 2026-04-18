import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommodity extends Document {
  name: string;
  ratePerMtMonth: number; // ₹ per MT per Month
  createdAt: Date;
  updatedAt: Date;
}

const CommoditySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, uppercase: true },
    ratePerMtMonth: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

const Commodity: Model<ICommodity> =
  mongoose.models.Commodity || mongoose.model<ICommodity>('Commodity', CommoditySchema);

export default Commodity;
