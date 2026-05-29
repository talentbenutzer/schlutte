"use server";

import { revalidatePath } from "next/cache";
import {
  createOrder,
  updateOrder,
  deleteOrder,
  placeOrder,
} from "@/lib/data/orders";
import { getCurrentEmployee } from "@/lib/data/employees";
import type { CreateOrderInput } from "@/lib/types";

export async function createOrderAction(
  input: CreateOrderInput
): Promise<{ error?: string }> {
  try {
    await createOrder(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
  revalidatePath("/bestellliste");
  return {};
}

export async function updateOrderAction(
  id: string,
  input: CreateOrderInput
): Promise<{ error?: string }> {
  try {
    await updateOrder(id, input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
  revalidatePath("/bestellliste");
  return {};
}

export async function deleteOrderAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteOrder(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
  revalidatePath("/bestellliste");
  return {};
}

export async function placeOrderAction(): Promise<{ error?: string }> {
  try {
    const me = await getCurrentEmployee();
    await placeOrder(me?.initials);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
  revalidatePath("/bestellliste");
  return {};
}
