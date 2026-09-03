export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];

  /**
   * Document metadata lifted out of the markdown front matter by `generate_structure.py`, so a
   * listing can show a real title and tags without fetching every file. All optional: a document
   * with no front matter still renders, it just falls back to its filename.
   */
  title?: string;
  summary?: string;
  /** ISO-ish date string exactly as the author wrote it in `updated:` / `date:`. */
  updated?: string;
  /** Author tags, or — when the author gave none — the folders the document lives in. */
  tags?: string[];
}

/** One entry of the tag index built from the whole tree. */
export interface TagSummary {
  /** The author's spelling, taken from the first document that used the tag. */
  label: string;
  /** Lower-cased, URL-safe form — what the `/tags` route matches on. */
  slug: string;
  count: number;
}
