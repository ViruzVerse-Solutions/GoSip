import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    
    if (!branchId) {
      return NextResponse.json({ error: "Missing branchId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .order("table_number");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Fetch tables API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
