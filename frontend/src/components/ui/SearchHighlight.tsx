import { Fragment } from "react";
import { splitByQuery } from "@/lib/highlight";

export interface SearchHighlightProps {
  text: string;
  query: string;
}

export function SearchHighlight({ text, query }: SearchHighlightProps) {
  return (
    <>
      {splitByQuery(text, query).map((part, i) =>
        part.match ? <mark key={i}>{part.text}</mark> : <Fragment key={i}>{part.text}</Fragment>,
      )}
    </>
  );
}
