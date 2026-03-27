"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

// Many-to-one FK joins return a single object, not an array
export type HumorFlavorStep = {
  id: number;
  order_by: number;
  description: string | null;
  llm_temperature: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  created_datetime_utc: string;
  modified_datetime_utc: string;
  humor_flavor_step_types: { id: number; slug: string; description: string } | null;
  llm_input_types: { id: number; slug: string; description: string } | null;
  llm_output_types: { id: number; slug: string; description: string } | null;
  llm_models: { id: number; name: string; provider_model_id: string; is_temperature_supported: boolean } | null;
};

type Flavor = { id: number; slug: string; description: string | null };
type StepType = { id: number; slug: string; description: string };
type LLMModel = { id: number; name: string; provider_model_id: string; is_temperature_supported: boolean };
type InputType = { id: number; slug: string; description: string };
type OutputType = { id: number; slug: string; description: string };

type ModalMode = "closed" | "create" | "edit";

type Props = {
  flavor: Flavor;
  initialSteps: HumorFlavorStep[];
  stepTypes: StepType[];
  models: LLMModel[];
  inputTypes: InputType[];
  outputTypes: OutputType[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_FORM = {
  description: "",
  stepTypeId: "",
  modelId: "",
  inputTypeId: "",
  outputTypeId: "",
  temperature: "",
  systemPrompt: "",
  userPrompt: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HumorFlavorStepsClient({
  flavor,
  initialSteps,
  stepTypes,
  models,
  inputTypes,
  outputTypes,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [steps, setSteps] = useState<HumorFlavorStep[]>(initialSteps);
  const [modal, setModal] = useState<ModalMode>("closed");
  const [editTarget, setEditTarget] = useState<HumorFlavorStep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HumorFlavorStep | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ─── Refetch ──────────────────────────────────────────────────────────────

  async function refetch() {
    const { data } = await supabase
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
      .eq("humor_flavor_id", flavor.id)
      .order("order_by", { ascending: true });
    setSteps((data ?? []) as unknown as HumorFlavorStep[]);
  }

  // ─── Modal helpers ────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("create");
  }

  function openEdit(step: HumorFlavorStep) {
    setForm({
      description: step.description ?? "",
      stepTypeId: String(step.humor_flavor_step_types?.id ?? ""),
      modelId: String(step.llm_models?.id ?? ""),
      inputTypeId: String(step.llm_input_types?.id ?? ""),
      outputTypeId: String(step.llm_output_types?.id ?? ""),
      temperature: step.llm_temperature != null ? String(step.llm_temperature) : "",
      systemPrompt: step.llm_system_prompt ?? "",
      userPrompt: step.llm_user_prompt ?? "",
    });
    setEditTarget(step);
    setModal("edit");
  }

  function closeModal() {
    setModal("closed");
    setEditTarget(null);
  }

  const selectedModel = models.find((m) => String(m.id) === form.modelId);
  const formIsValid =
    form.stepTypeId !== "" &&
    form.modelId !== "" &&
    form.inputTypeId !== "" &&
    form.outputTypeId !== "";

  // ─── Create ───────────────────────────────────────────────────────────────

  async function handleCreate() {
    setSaving(true);
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order_by)) + 1 : 1;
    const { error } = await supabase.from("humor_flavor_steps").insert({
      humor_flavor_id: flavor.id,
      order_by: nextOrder,
      description: form.description || null,
      humor_flavor_step_type_id: Number(form.stepTypeId),
      llm_model_id: Number(form.modelId),
      llm_input_type_id: Number(form.inputTypeId),
      llm_output_type_id: Number(form.outputTypeId),
      llm_temperature: form.temperature !== "" ? Number(form.temperature) : null,
      llm_system_prompt: form.systemPrompt || null,
      llm_user_prompt: form.userPrompt || null,
    });
    if (!error) {
      await refetch();
      closeModal();
    }
    setSaving(false);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async function handleUpdate() {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        description: form.description || null,
        humor_flavor_step_type_id: Number(form.stepTypeId),
        llm_model_id: Number(form.modelId),
        llm_input_type_id: Number(form.inputTypeId),
        llm_output_type_id: Number(form.outputTypeId),
        llm_temperature: form.temperature !== "" ? Number(form.temperature) : null,
        llm_system_prompt: form.systemPrompt || null,
        llm_user_prompt: form.userPrompt || null,
      })
      .eq("id", editTarget.id);
    if (!error) {
      await refetch();
      closeModal();
    }
    setSaving(false);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("humor_flavor_steps")
      .delete()
      .eq("id", deleteTarget.id);
    if (!error) {
      // Decrement order_by for all steps after the deleted one
      const stepsAfter = steps.filter((s) => s.order_by > deleteTarget.order_by);
      for (const s of stepsAfter) {
        await supabase
          .from("humor_flavor_steps")
          .update({ order_by: s.order_by - 1 })
          .eq("id", s.id);
      }
      await refetch();
      setDeleteTarget(null);
    }
    setDeleting(false);
  }

  // ─── Reorder ──────────────────────────────────────────────────────────────

  async function handleMoveUp(step: HumorFlavorStep) {
    const prev = steps.find((s) => s.order_by === step.order_by - 1);
    if (!prev) return;
    setReordering(step.id);
    await supabase.from("humor_flavor_steps").update({ order_by: prev.order_by }).eq("id", step.id);
    await supabase.from("humor_flavor_steps").update({ order_by: step.order_by }).eq("id", prev.id);
    await refetch();
    setReordering(null);
  }

  async function handleMoveDown(step: HumorFlavorStep) {
    const next = steps.find((s) => s.order_by === step.order_by + 1);
    if (!next) return;
    setReordering(step.id);
    await supabase.from("humor_flavor_steps").update({ order_by: next.order_by }).eq("id", step.id);
    await supabase.from("humor_flavor_steps").update({ order_by: step.order_by }).eq("id", next.id);
    await refetch();
    setReordering(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-grey-500 transition hover:text-dsg-900 dark:text-grey-400 dark:hover:text-dsg-50"
          >
            ← Back to Flavors
          </Link>
          <h2 className="mt-3 text-2xl font-bold text-dsg-900 dark:text-dsg-50">
            <code className="mr-2 rounded bg-dsg-100 px-2 py-0.5 font-mono text-xl dark:bg-dsg-800">
              {flavor.slug}
            </code>
            Steps
          </h2>
          {flavor.description && (
            <p className="mt-1 text-sm text-grey-500 dark:text-grey-400">
              {flavor.description}
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 rounded-lg bg-dsg-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-dsg-700 dark:bg-dsg-50 dark:text-dsg-900 dark:hover:bg-dsg-200"
        >
          + Add Step
        </button>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 p-16 text-center dark:border-dsg-700 dark:bg-dsg-900">
          <p className="text-sm text-grey-400 dark:text-grey-500">
            No steps yet. Add the first step to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const stepType = step.humor_flavor_step_types ?? null;
            const model = step.llm_models ?? null;
            const inputType = step.llm_input_types ?? null;
            const outputType = step.llm_output_types ?? null;
            const isReordering = reordering === step.id;

            return (
              <div
                key={step.id}
                className="rounded-xl border border-grey-200 bg-white p-5 shadow-sm dark:border-dsg-700 dark:bg-dsg-900"
              >
                {/* Top row: reorder arrows + badge + description + step type badge + actions */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(step)}
                        disabled={idx === 0 || isReordering}
                        className="rounded p-1 text-xl text-grey-400 transition hover:text-dsg-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-dsg-50"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(step)}
                        disabled={idx === steps.length - 1 || isReordering}
                        className="rounded p-1 text-xl text-grey-400 transition hover:text-dsg-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-dsg-50"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    {/* Step number badge */}
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-700/30 dark:text-teal-300">
                      {step.order_by}
                    </span>

                    {/* Description */}
                    {step.description ? (
                      <p className="font-medium text-dsg-900 dark:text-dsg-50">
                        {step.description}
                      </p>
                    ) : (
                      <p className="italic text-grey-400 dark:text-grey-500">
                        No step description
                      </p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {stepType && (
                      <span className="rounded-full bg-dsg-100 px-3 py-1 text-sm font-medium text-dsg-700 dark:bg-dsg-800 dark:text-dsg-300">
                        {stepType.slug}
                      </span>
                    )}
                    <button
                      onClick={() => openEdit(step)}
                      className="rounded-lg border border-grey-200 px-4 py-1.5 text-sm font-medium text-dsg-700 transition hover:border-dsg-400 hover:text-dsg-900 dark:border-dsg-700 dark:text-dsg-300 dark:hover:border-dsg-500 dark:hover:text-dsg-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(step)}
                      className="rounded-lg border border-grey-200 px-4 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700 dark:border-dsg-700 dark:text-red-400 dark:hover:border-red-700 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Attribute list */}
                <dl className="ml-14 mt-3 space-y-1.5 text-sm">
                  {[
                    { label: "id", value: String(step.id), plain: true },
                    { label: "description", value: step.description, plain: true },
                    { label: "humor_flavor_step_type_id", value: stepType ? `${stepType.id} — ${stepType.slug} (${stepType.description})` : null, plain: true },
                    { label: "llm_model_id", value: model ? `${model.id} — ${model.name} (${model.provider_model_id})` : null, plain: true },
                    { label: "llm_input_type_id", value: inputType ? `${inputType.id} — ${inputType.slug} (${inputType.description})` : null, plain: true },
                    { label: "llm_output_type_id", value: outputType ? `${outputType.id} — ${outputType.slug} (${outputType.description})` : null, plain: true },
                    { label: "llm_temperature", value: step.llm_temperature != null ? String(step.llm_temperature) : null, plain: true },
                    { label: "llm_system_prompt", value: step.llm_system_prompt, plain: false },
                    { label: "llm_user_prompt", value: step.llm_user_prompt, plain: false },
                    { label: "created_datetime_utc", value: formatDate(step.created_datetime_utc), plain: true },
                    { label: "modified_datetime_utc", value: formatDate(step.modified_datetime_utc), plain: true },
                  ].map(({ label, value, plain }) => (
                    <div key={label} className="flex gap-2">
                      <dt className="w-56 flex-shrink-0 font-mono text-xs text-grey-400 dark:text-grey-500 pt-0.5">
                        {label}
                      </dt>
                      <dd className="flex-1 text-dsg-800 dark:text-dsg-200">
                        {value == null ? (
                          <span className="italic text-grey-400 dark:text-grey-600">—</span>
                        ) : plain ? (
                          <span className="break-words">{value}</span>
                        ) : (
                          <pre className="whitespace-pre-wrap rounded-lg bg-grey-50 p-3 text-xs text-dsg-800 dark:bg-dsg-950 dark:text-dsg-200">
                            {value}
                          </pre>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {modal !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-dsg-900">
            <h3 className="mb-6 text-lg font-bold text-dsg-900 dark:text-dsg-50">
              {modal === "create" ? "Add Step" : "Edit Step"}
            </h3>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Identify celebrities in image"
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                />
              </div>

              {/* Step Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  Step Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.stepTypeId}
                  onChange={(e) => setForm({ ...form, stepTypeId: e.target.value })}
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                >
                  <option value="" disabled>Select a step type...</option>
                  {stepTypes.map((st) => (
                    <option key={st.id} value={String(st.id)}>
                      {st.slug} — {st.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  LLM Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value, temperature: "" })}
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                >
                  <option value="" disabled>Select a model...</option>
                  {models.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name} ({m.provider_model_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperature — only shown if model supports it */}
              {selectedModel?.is_temperature_supported && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    placeholder="e.g. 0.7"
                    className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                  />
                </div>
              )}

              {/* Input Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  Input Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.inputTypeId}
                  onChange={(e) => setForm({ ...form, inputTypeId: e.target.value })}
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                >
                  <option value="" disabled>Select an input type...</option>
                  {inputTypes.map((it) => (
                    <option key={it.id} value={String(it.id)}>
                      {it.slug} — {it.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Output Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  Output Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.outputTypeId}
                  onChange={(e) => setForm({ ...form, outputTypeId: e.target.value })}
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                >
                  <option value="" disabled>Select an output type...</option>
                  {outputTypes.map((ot) => (
                    <option key={ot.id} value={String(ot.id)}>
                      {ot.slug} — {ot.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  System Prompt
                </label>
                <textarea
                  rows={4}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="Instructions for the model's behavior..."
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                />
              </div>

              {/* User Prompt */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
                  User Prompt
                </label>
                <textarea
                  rows={4}
                  value={form.userPrompt}
                  onChange={(e) => setForm({ ...form, userPrompt: e.target.value })}
                  placeholder="The prompt sent to the model..."
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-dsg-700 transition hover:border-grey-400 dark:border-dsg-700 dark:text-dsg-300"
              >
                Cancel
              </button>
              <button
                onClick={modal === "create" ? handleCreate : handleUpdate}
                disabled={!formIsValid || saving}
                className="rounded-lg bg-dsg-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-dsg-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dsg-50 dark:text-dsg-900 dark:hover:bg-dsg-200"
              >
                {saving ? "Saving…" : modal === "create" ? "Add Step" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-dsg-900">
            <h3 className="mb-2 text-lg font-bold text-dsg-900 dark:text-dsg-50">
              Delete Step {deleteTarget.order_by}?
            </h3>
            <p className="mb-1 text-sm text-grey-600 dark:text-grey-400">
              {deleteTarget.description
                ? <>This will permanently delete <span className="font-medium text-dsg-900 dark:text-dsg-50">&ldquo;{deleteTarget.description}&rdquo;</span>.</>
                : "This will permanently delete this step."}
            </p>
            <p className="text-sm text-grey-500 dark:text-grey-500">
              All following steps will be renumbered.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-dsg-700 transition hover:border-grey-400 dark:border-dsg-700 dark:text-dsg-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
