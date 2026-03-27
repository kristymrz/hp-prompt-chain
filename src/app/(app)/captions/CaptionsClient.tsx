"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type CaptionImage = {
  id: string;
  url: string | null;
  image_description: string | null;
  celebrity_recognition: string | null;
  additional_context: string | null;
  is_public: boolean | null;
  is_common_use: boolean | null;
  created_datetime_utc: string;
  modified_datetime_utc: string;
};

type Caption = {
  id: string;
  content: string | null;
  is_public: boolean;
  is_featured: boolean;
  like_count: number;
  profile_id: string;
  image_id: string;
  humor_flavor_id: number | null;
  caption_request_id: number | null;
  llm_prompt_chain_id: number | null;
  created_by_user_id: string;
  modified_by_user_id: string;
  created_datetime_utc: string;
  modified_datetime_utc: string;
  humor_flavors: { id: number; slug: string } | null;
  images: CaptionImage | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateUUID(uuid: string) {
  return uuid.slice(0, 8) + "…";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CaptionsClient() {
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalCaption, setModalCaption] = useState<Caption | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setCaptions(null);

    const select = `
      id,
      content,
      is_public,
      is_featured,
      like_count,
      profile_id,
      image_id,
      humor_flavor_id,
      caption_request_id,
      llm_prompt_chain_id,
      created_by_user_id,
      modified_by_user_id,
      created_datetime_utc,
      modified_datetime_utc,
      humor_flavors ( id, slug ),
      images (
        id, url, image_description, celebrity_recognition,
        additional_context, is_public, is_common_use,
        created_datetime_utc, modified_datetime_utc
      )
    `;

    if (UUID_RE.test(trimmed)) {
      // Search by caption ID
      const { data, error: err } = await supabase
        .from("captions")
        .select(select)
        .eq("id", trimmed);
      if (err) setError(err.message);
      else setCaptions((data ?? []) as unknown as Caption[]);
    } else if (/^\d+$/.test(trimmed)) {
      // Search by humor flavor ID
      const { data, error: err } = await supabase
        .from("captions")
        .select(select)
        .eq("humor_flavor_id", Number(trimmed))
        .order("created_datetime_utc", { ascending: false });
      if (err) setError(err.message);
      else setCaptions((data ?? []) as unknown as Caption[]);
    } else {
      setError("Enter a valid caption UUID or a numeric humor flavor ID.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dsg-900 dark:text-dsg-50">Captions by Humor Flavor</h2>
        <p className="mt-1 text-sm text-grey-500 dark:text-grey-400">
          Search captions by caption ID or humor flavor ID.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caption UUID or humor flavor ID (e.g. 145)"
          className="flex-1 rounded-lg border border-grey-200 bg-white px-4 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50 dark:placeholder-grey-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-dsg-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-dsg-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dsg-50 dark:text-dsg-900 dark:hover:bg-dsg-200"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty state before search */}
      {captions === null && !loading && (
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 p-16 text-center dark:border-dsg-700 dark:bg-dsg-900">
          <p className="text-sm text-grey-400 dark:text-grey-500">
            Enter a caption UUID or numeric humor flavor ID to search.
          </p>
        </div>
      )}

      {/* No results */}
      {captions !== null && captions.length === 0 && (
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 p-16 text-center dark:border-dsg-700 dark:bg-dsg-900">
          <p className="text-sm text-grey-400 dark:text-grey-500">No results found.</p>
        </div>
      )}

      {/* Results table */}
      {captions !== null && captions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-grey-200 dark:border-dsg-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 dark:border-dsg-800 dark:bg-dsg-900">
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">ID</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Content</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Humor Flavor</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Likes</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Public</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Featured</th>
                <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Created</th>
                <th className="px-4 py-3 text-right font-medium text-grey-600 dark:text-grey-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100 dark:divide-dsg-800">
              {captions.map((caption) => (
                <tr
                  key={caption.id}
                  className="bg-white transition-colors hover:bg-grey-50 dark:bg-dsg-950 dark:hover:bg-dsg-900"
                >
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-grey-500 dark:text-grey-400">
                      {truncateUUID(caption.id)}
                    </code>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-dsg-800 dark:text-dsg-200">
                    {caption.content ? (
                      <span className="line-clamp-2">{caption.content}</span>
                    ) : (
                      <span className="italic text-grey-400 dark:text-grey-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {caption.humor_flavors ? (
                      <code className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs text-dsg-700 dark:bg-dsg-800 dark:text-dsg-200">
                        {caption.humor_flavors.slug}
                      </code>
                    ) : (
                      <span className="italic text-grey-400 dark:text-grey-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-grey-600 dark:text-grey-400">{caption.like_count}</td>
                  <td className="px-4 py-3 text-grey-600 dark:text-grey-400">
                    {caption.is_public ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-grey-600 dark:text-grey-400">
                    {caption.is_featured ? "Yes" : "No"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-grey-500 dark:text-grey-400">
                    {formatDate(caption.created_datetime_utc)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModalCaption(caption)}
                      className="rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-medium text-dsg-700 transition hover:border-dsg-400 hover:text-dsg-900 dark:border-dsg-700 dark:text-dsg-300 dark:hover:border-dsg-500 dark:hover:text-dsg-50"
                    >
                      More Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── More Info Modal ──────────────────────────────────────────────── */}
      {modalCaption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-dsg-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-dsg-900 dark:text-dsg-50">Caption Detail</h3>
              <button
                onClick={() => setModalCaption(null)}
                className="rounded-lg p-1.5 text-grey-400 transition hover:bg-grey-100 hover:text-dsg-900 dark:hover:bg-dsg-800 dark:hover:text-dsg-50"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            {modalCaption.images?.url && (
              <div className="mb-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-grey-400 dark:text-grey-500">
                  Image
                </p>
                <img
                  src={modalCaption.images.url}
                  alt="Caption image"
                  className="max-h-72 w-full rounded-lg object-contain bg-grey-50 dark:bg-dsg-950"
                />
              </div>
            )}

            {/* Caption fields */}
            <dl className="space-y-1.5 text-sm">
              {[
                { label: "id", value: modalCaption.id },
                { label: "content", value: modalCaption.content },
                { label: "humor_flavor_id", value: modalCaption.humor_flavor_id != null ? `${modalCaption.humor_flavor_id}${modalCaption.humor_flavors ? ` — ${modalCaption.humor_flavors.slug}` : ""}` : null },
                { label: "image_id", value: modalCaption.image_id },
                { label: "is_public", value: String(modalCaption.is_public) },
                { label: "is_featured", value: String(modalCaption.is_featured) },
                { label: "like_count", value: String(modalCaption.like_count) },
                { label: "caption_request_id", value: modalCaption.caption_request_id != null ? String(modalCaption.caption_request_id) : null },
                { label: "llm_prompt_chain_id", value: modalCaption.llm_prompt_chain_id != null ? String(modalCaption.llm_prompt_chain_id) : null },
                { label: "profile_id", value: modalCaption.profile_id },
                { label: "created_by_user_id", value: modalCaption.created_by_user_id },
                { label: "modified_by_user_id", value: modalCaption.modified_by_user_id },
                { label: "created_datetime_utc", value: formatDate(modalCaption.created_datetime_utc) },
                { label: "modified_datetime_utc", value: formatDate(modalCaption.modified_datetime_utc) },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-52 flex-shrink-0 font-mono text-xs text-grey-400 dark:text-grey-500 pt-0.5">
                    {label}
                  </dt>
                  <dd className="flex-1 break-all text-dsg-800 dark:text-dsg-200">
                    {value ?? <span className="italic text-grey-400 dark:text-grey-600">—</span>}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Image metadata */}
            {modalCaption.images && (
              <>
                <div className="my-4 border-t border-grey-100 dark:border-dsg-800" />
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-grey-400 dark:text-grey-500">
                  Image Details
                </p>
                <dl className="space-y-1.5 text-sm">
                  {[
                    { label: "images.id", value: modalCaption.images.id },
                    { label: "images.url", value: modalCaption.images.url },
                    { label: "images.is_public", value: modalCaption.images.is_public != null ? String(modalCaption.images.is_public) : null },
                    { label: "images.is_common_use", value: modalCaption.images.is_common_use != null ? String(modalCaption.images.is_common_use) : null },
                    { label: "images.additional_context", value: modalCaption.images.additional_context },
                    { label: "images.image_description", value: modalCaption.images.image_description },
                    { label: "images.celebrity_recognition", value: modalCaption.images.celebrity_recognition },
                    { label: "images.created_datetime_utc", value: formatDate(modalCaption.images.created_datetime_utc) },
                    { label: "images.modified_datetime_utc", value: formatDate(modalCaption.images.modified_datetime_utc) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2">
                      <dt className="w-52 flex-shrink-0 font-mono text-xs text-grey-400 dark:text-grey-500 pt-0.5">
                        {label}
                      </dt>
                      <dd className="flex-1 break-all text-dsg-800 dark:text-dsg-200">
                        {value ?? <span className="italic text-grey-400 dark:text-grey-600">—</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalCaption(null)}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-dsg-700 transition hover:border-grey-400 dark:border-dsg-700 dark:text-dsg-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
