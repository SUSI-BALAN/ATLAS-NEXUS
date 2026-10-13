import path from "node:path";

const reserved = /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const invalidCharacters = /[<>:"/\\|?*\u0000-\u001f]/;

export class FolderNameError extends Error {
  constructor(message: string) { super(message); this.name = "FolderNameError"; }
}

export function validateWindowsFolderName(value: string): string {
  if (value.length === 0) throw new FolderNameError("Enter a folder name.");
  if (value !== value.trim()) throw new FolderNameError("Folder names cannot begin or end with spaces.");
  if (value.endsWith(".") || value.endsWith(" ")) throw new FolderNameError("Folder names cannot end with a dot or space.");
  if (value === "." || value === ".." || value.includes("..")) throw new FolderNameError("Path traversal is not allowed.");
  if (invalidCharacters.test(value)) throw new FolderNameError("The folder name contains a character Windows does not allow.");
  if (reserved.test(value)) throw new FolderNameError("That name is reserved by Windows.");
  if (value.length > 120) throw new FolderNameError("Use a folder name with 120 characters or fewer.");
  return value;
}

export function resolveChildPath(parent: string, childName: string, maximumLength = 240): string {
  const validName = validateWindowsFolderName(childName);
  const resolvedParent = path.resolve(parent);
  if (resolvedParent.startsWith("\\\\") || resolvedParent.startsWith("\\\\?\\") || resolvedParent.startsWith("\\\\.\\")) {
    throw new FolderNameError("Network and device namespace paths are not supported yet.");
  }
  const destination = path.resolve(resolvedParent, validName);
  const prefix = resolvedParent.endsWith(path.sep) ? resolvedParent : `${resolvedParent}${path.sep}`;
  if (!destination.toLowerCase().startsWith(prefix.toLowerCase())) throw new FolderNameError("The destination must remain inside the selected parent folder.");
  if (destination.length > maximumLength) throw new FolderNameError(`The destination path exceeds the ${maximumLength}-character safety limit.`);
  return destination;
}
