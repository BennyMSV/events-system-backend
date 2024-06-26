import * as mongoose from "mongoose";

export interface orderType {
  checkout_date: Date;
  ticket_type: string;
  quantity: number;
  event_id: string;
  username: string;
}

const orderSchema = new mongoose.Schema<orderType>({
  checkout_date: { type: Date, required: true },
  ticket_type: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  event_id: { type: String, required: true },
  username: { type: String, required: true },
});

export default mongoose.model<orderType>("Order", orderSchema);
