'use server';

import connectToDatabase from '@/lib/mongoose';
import Client from '@/lib/models/Client';
import { revalidatePath } from 'next/cache';

export async function getClients() {
  await connectToDatabase();
  const clients = await Client.find({}).sort({ name: 1 });
  return JSON.parse(JSON.stringify(clients));
}

export async function createClient(data: {
  name: string;
  address: string;
  clientType: 'FARMER' | 'FPO' | 'COMPANY';
  mobile: string;
}) {
  await connectToDatabase();
  try {
    const client = await Client.create(data);
    revalidatePath('/dashboard/clients');
    return { success: true, data: JSON.parse(JSON.stringify(client)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateClient(id: string, data: Partial<{
  name: string;
  address: string;
  clientType: string;
  mobile: string;
}>) {
  await connectToDatabase();
  try {
    const client = await Client.findByIdAndUpdate(id, data, { new: true });
    revalidatePath('/dashboard/clients');
    return { success: true, data: JSON.parse(JSON.stringify(client)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
