// app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function getIstDate(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
}

interface OrderItem {
  itemId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionToken, tableNumber, branchId, items } = body as {
      sessionToken: string;
      tableNumber: string;
      branchId: string;
      items: OrderItem[];
    };

    if (!sessionToken || !tableNumber || !branchId || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const today = getIstDate();
    const itemIds = items.map((i) => i.itemId);

    const [
      { count, error: countError },
      { data: menuItems, error: menuItemsError },
      dailyNumberResult
    ] = await Promise.all([
      // Rate limiting
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("table_number", tableNumber)
        .gte("created_at", tenMinAgo),

      // Item validation
      supabase
        .from("menu_items")
        .select("id, price, is_available")
        .in("id", itemIds),

      // Atomic daily number from the function
      supabase.rpc('next_daily_order_number', {
        p_branch_id: branchId,
        p_date: today,
      })
    ]);

    if (countError) return NextResponse.json({ error: "Rate check failed" }, { status: 500 });
    if (count !== null && count >= 3)
      return NextResponse.json({ error: "Too many orders. Please wait." }, { status: 429 });

    if (menuItemsError || !menuItems) {
      return NextResponse.json({ error: "Failed to verify items" }, { status: 500 });
    }

    // Validate items & calculate total
    let total = 0;
    const orderItemsToInsert: { item_id: string; quantity: number; price: number }[] = [];
    const menuItemsMap = new Map(menuItems.map((mi) => [mi.id, mi]));

    for (const { itemId, quantity } of items) {
      const menuItem = menuItemsMap.get(itemId);
      if (!menuItem || !menuItem.is_available) {
        return NextResponse.json({ error: `Item ${itemId} not available` }, { status: 400 });
      }
      total += menuItem.price * quantity;
      orderItemsToInsert.push({ item_id: itemId, quantity, price: menuItem.price });
    }

    // Use the number returned by the function
    if (dailyNumberResult.error || dailyNumberResult.data == null) {
      return NextResponse.json({ error: "Failed to generate order number" }, { status: 500 });
    }
    const dailyOrderNumber = dailyNumberResult.data as number;
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        branch_id: branchId,
        table_number: tableNumber,
        token,
        daily_order_number: dailyOrderNumber,
        total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order)
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });

    // Insert order items
    const itemsToInsert = orderItemsToInsert.map((oi) => ({
      order_id: order.id,
      item_id: oi.item_id,
      quantity: oi.quantity,
      price: oi.price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Failed to save items" }, { status: 500 });
    }

    return NextResponse.json({
      token,
      orderId: order.id,
      dailyOrderNumber,
      total,
    });
  } catch (err) {
    console.error("Order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}