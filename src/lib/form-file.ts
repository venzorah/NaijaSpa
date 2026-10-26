/** FormData files are Blob in some Node/Next runtimes, not always `File`. */
export function formImage(fd: FormData, key = "file"): Blob | null {
  const value = fd.get(key);
  if (!value || typeof value === "string") return null;
  const blob = value as Blob;
  if (typeof blob.arrayBuffer !== "function" || typeof blob.size !== "number") return null;
  if (!blob.size) return null;
  return blob;
}
