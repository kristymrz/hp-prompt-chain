import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HumorFlavorStepsClient from "./HumorFlavorStepsClient";

type Params = { id: string };

export default async function HumorFlavorStepsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const flavorId = Number(id);
  if (isNaN(flavorId)) notFound();

  const supabase = await createClient();

  const [
    { data: flavor },
    { data: steps },
    { data: stepTypes },
    { data: models },
    { data: inputTypes },
    { data: outputTypes },
  ] = await Promise.all([
    supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .eq("id", flavorId)
      .single(),
    supabase
      .from("humor_flavor_steps")
      .select(`
        id,
        order_by,
        description,
        llm_temperature,
        llm_system_prompt,
        llm_user_prompt,
        created_datetime_utc,
        modified_datetime_utc,
        humor_flavor_step_types ( id, slug, description ),
        llm_input_types ( id, slug, description ),
        llm_output_types ( id, slug, description ),
        llm_models ( id, name, provider_model_id, is_temperature_supported )
      `)
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true }),
    supabase
      .from("humor_flavor_step_types")
      .select("id, slug, description")
      .order("id"),
    supabase
      .from("llm_models")
      .select("id, name, provider_model_id, is_temperature_supported")
      .order("name"),
    supabase
      .from("llm_input_types")
      .select("id, slug, description")
      .order("id"),
    supabase
      .from("llm_output_types")
      .select("id, slug, description")
      .order("id"),
  ]);

  if (!flavor) notFound();

  return (
    <HumorFlavorStepsClient
      flavor={flavor}
      initialSteps={(steps ?? []) as unknown as import("./HumorFlavorStepsClient").HumorFlavorStep[]}
      stepTypes={stepTypes ?? []}
      models={models ?? []}
      inputTypes={inputTypes ?? []}
      outputTypes={outputTypes ?? []}
    />
  );
}
