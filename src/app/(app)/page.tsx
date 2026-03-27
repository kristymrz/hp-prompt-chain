import { createClient } from "@/lib/supabase/server";
import HumorFlavorsClient from "./HumorFlavorsClient";

export default async function HumorFlavorsPage() {
  const supabase = await createClient();
  const { data: flavors } = await supabase
    .from("humor_flavors")
    .select("id, slug, description, created_datetime_utc")
    .order("created_datetime_utc", { ascending: false });

  return <HumorFlavorsClient initialFlavors={flavors ?? []} />;
}
