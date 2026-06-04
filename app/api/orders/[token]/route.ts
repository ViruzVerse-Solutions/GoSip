import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, token, table_number, status, daily_order_number, total, created_at,
        order_items (
          id, quantity, price,
          menu_items!order_items_item_id_fkey ( id, name, image_url )
        )
        `
      )
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/orders/[token]
// Body: { status: "collected" | "delivered" | "cancelled" }
// Called by the admin dashboard when pressing the Collected / status button.
const ALLOWED_STATUSES = ["pending", "delivered", "cancelled", "collected"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body as { status: string };

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("token", token)
      .select("id, token, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
