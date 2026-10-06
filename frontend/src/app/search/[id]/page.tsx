"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchHighlight } from "@/components/ui/SearchHighlight";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { formatMeetingDate } from "@/lib/format";
import { groupSearchResults, hitHref, hitLabel } from "@/lib/searchGroups";
import styles from "./search.module.css";

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Global search. The id segment is the URL-encoded query, as /search/[id] on app.fireflies.ai. */
export default function SearchPage() {
  const { id } = useParams<{ id: string }>();
  const q = decode(id).trim();
  const { data, error, isLoading } = useSWR(q ? ["search", q] : null, () => api.search.global(q));
  const groups = useMemo(() => groupSearchResults(data?.results ?? []), [data]);

  return (
    <div className={styles.page}>
      <h2>Results for “{q}”</h2>
      {isLoading ? (
        <Skeleton width="100%" height={64} />
      ) : error ? (
        <EmptyState icon={<Search size={22} />} title="Search failed" description={error instanceof Error ? error.message : "Make sure the backend is running."} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState icon={<Search size={22} />} title="No results" description="Try a different keyword." />
      ) : (
        <>
          <p className={styles.count}>
            {data.total > data.results.length
              ? `Showing ${data.results.length} of ${data.total} matches in ${groups.length} meetings`
              : `${data.total} ${data.total === 1 ? "match" : "matches"} in ${groups.length} ${groups.length === 1 ? "meeting" : "meetings"}`}
          </p>
          <ul className={styles.list}>
            {groups.map((group) => (
              <li key={group.meetingId} className={styles.group}>
                <Link href={`/notebook/${group.meetingId}`} className={styles.groupHead}>
                  <span className={styles.title}>{group.title}</span>
                  {group.date ? <span className={styles.meta}>{formatMeetingDate(group.date)}</span> : null}
                </Link>
                <ul className={styles.hits}>
                  {group.hits.map((hit, i) => (
                    <li key={`${hit.type}-${hit.start_time ?? 0}-${i}`}>
                      <Link href={hitHref(hit)}>
                        <span className={styles.meta}>{hitLabel(hit)}</span>
                        <span className={styles.snippet}>
                          <SearchHighlight text={hit.snippet} query={q} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
