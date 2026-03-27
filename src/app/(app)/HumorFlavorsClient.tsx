"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type HumorFlavor = {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
};

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; flavor: HumorFlavor };

export default function HumorFlavorsClient({
  initialFlavors,
}: {
  initialFlavors: HumorFlavor[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [flavors, setFlavors] = useState<HumorFlavor[]>(initialFlavors);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<HumorFlavor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");

  async function refetch() {
    const { data } = await supabase
      .from("humor_flavors")
      .select("id, slug, description, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false });
    setFlavors(data ?? []);
  }

  function openCreate() {
    setFormSlug("");
    setFormDescription("");
    setError(null);
    setModal({ type: "create" });
  }

  function openEdit(flavor: HumorFlavor) {
    setFormSlug(flavor.slug);
    setFormDescription(flavor.description ?? "");
    setError(null);
    setModal({ type: "edit", flavor });
  }

  function closeModal() {
    setModal({ type: "closed" });
    setError(null);
  }

  async function handleSave() {
    if (!formSlug.trim() || !formDescription.trim()) return;
    setSaving(true);
    setError(null);

    if (modal.type === "create") {
      const { error } = await supabase.from("humor_flavors").insert({
        slug: formSlug.trim(),
        description: formDescription.trim(),
      });
      if (error) { setError(error.message); setSaving(false); return; }
    } else if (modal.type === "edit") {
      const { error } = await supabase
        .from("humor_flavors")
        .update({ slug: formSlug.trim(), description: formDescription.trim() })
        .eq("id", modal.flavor.id);
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    closeModal();
    await refetch();
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
    if (error) setError(error.message);
    else setDeleteTarget(null);
    setDeleting(false);
    await refetch();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dsg-900 dark:text-dsg-50">
            Humor Flavors
          </h2>
          <p className="mt-1 text-sm text-grey-500 dark:text-grey-400">
            Manage humor flavors and their prompt chain steps.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
        >
          + New Flavor
        </button>
      </div>

      {/* Global error (shown outside modals) */}
      {error && modal.type === "closed" && !deleteTarget && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {flavors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 p-16 text-center dark:border-dsg-700 dark:bg-dsg-900">
          <p className="text-sm text-grey-400 dark:text-grey-500">
            No humor flavors yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-grey-200 dark:border-dsg-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 dark:border-dsg-800 dark:bg-dsg-900">
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">
                  ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">
                  Slug
                </th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-grey-600 dark:text-grey-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100 dark:divide-dsg-800">
              {flavors.map((flavor) => (
                <tr
                  key={flavor.id}
                  className="bg-white transition-colors hover:bg-grey-50 dark:bg-dsg-950 dark:hover:bg-dsg-900"
                >
                  <td className="px-4 py-3 text-grey-500 dark:text-grey-400">
                    <code className="font-mono text-xs">{flavor.id}</code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs text-dsg-700 dark:bg-dsg-800 dark:text-dsg-200">
                      {flavor.slug}
                    </code>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-grey-700 dark:text-grey-300">
                    {flavor.description ? (
                      <span className="line-clamp-2">{flavor.description}</span>
                    ) : (
                      <span className="text-grey-400 dark:text-grey-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-grey-500 dark:text-grey-400">
                    {new Date(flavor.created_datetime_utc).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/humor-flavors/${flavor.id}`}
                        className="rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
                      >
                        Manage Steps
                      </Link>
                      <button
                        onClick={() => openEdit(flavor)}
                        className="rounded-md border border-grey-200 px-3 py-1.5 text-xs font-medium text-grey-600 transition hover:bg-grey-50 dark:border-dsg-700 dark:text-grey-300 dark:hover:bg-dsg-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(flavor)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-grey-200 bg-white p-6 shadow-lg dark:border-dsg-800 dark:bg-dsg-900">
            <h3 className="mb-2 text-lg font-semibold text-dsg-900 dark:text-dsg-50">
              Delete Humor Flavor
            </h3>
            <p className="mb-1 text-sm text-grey-600 dark:text-grey-300">
              Are you sure you want to delete{" "}
              <code className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs text-dsg-700 dark:bg-dsg-800 dark:text-dsg-200">
                {deleteTarget.slug}
              </code>
              ?
            </p>
            <p className="mb-6 text-sm text-grey-400 dark:text-grey-500">
              This will also delete all associated steps. This action cannot be undone.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setError(null); }}
                disabled={deleting}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-grey-600 transition hover:bg-grey-50 disabled:opacity-50 dark:border-dsg-700 dark:text-grey-300 dark:hover:bg-dsg-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal.type !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-grey-200 bg-white p-6 shadow-lg dark:border-dsg-800 dark:bg-dsg-900">

            <h3 className="mb-5 text-lg font-semibold text-dsg-900 dark:text-dsg-50">
              {modal.type === "create" ? "New Humor Flavor" : "Edit Humor Flavor"}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dsg-800 dark:text-dsg-200">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. dry-wit"
                  className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 font-mono text-sm text-dsg-900 placeholder-grey-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-dsg-700 dark:bg-dsg-800 dark:text-dsg-50 dark:placeholder-grey-600"
                />
                <p className="mt-1 text-xs text-grey-400 dark:text-grey-600">
                  Lowercase, hyphen-separated identifier.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-dsg-800 dark:text-dsg-200">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the humor style…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-dsg-700 dark:bg-dsg-800 dark:text-dsg-50 dark:placeholder-grey-600"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-grey-600 transition hover:bg-grey-50 dark:border-dsg-700 dark:text-grey-300 dark:hover:bg-dsg-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formSlug.trim() || !formDescription.trim()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
