import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOutward extends Document {
  clientId: mongoose.Types.ObjectId;
  commodityId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  quantityMT: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutwardSchema: Schema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantityMT: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Outward: Model<IOutward> =
  mongoose.models.Outward || mongoose.model<IOutward>('Outward', OutwardSchema);

export default Outward;
