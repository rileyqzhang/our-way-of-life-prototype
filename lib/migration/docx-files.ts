import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { codeFromFilename, normalizeParticipantCode, originalCodeFromFilename } from "@/lib/migration/participant-code";

export type DocxFileStatus = "valid" | "invalid" | "unreadable";

export type DiscoveredDocx = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  bytes: number;
  originalCode: string;
  normalizedCode: string;
  status: DocxFileStatus;
  detail: string;
};

const SKIP_DIRECTORIES = new Set(["extracted", "node_modules"]);

function codesFor(relativePath: string) {
  const filenameCode = originalCodeFromFilename(relativePath);
  if (filenameCode) return { originalCode: filenameCode, normalizedCode: normalizeParticipantCode(filenameCode) };
  const folders = path.dirname(relativePath).split(path.sep).reverse();
  for (const folder of folders) {
    const folderCode = originalCodeFromFilename(folder);
    if (folderCode && folderCode === normalizeParticipantCode(folderCode)) {
      return { originalCode: folderCode, normalizedCode: codeFromFilename(folder) };
    }
  }
  return { originalCode: "", normalizedCode: "" };
}

export function inspectDocxFile(absolutePath: string, relativePath = path.basename(absolutePath)): DiscoveredDocx {
  const filename = path.basename(absolutePath);
  const codes = codesFor(relativePath);
  const base = { absolutePath, relativePath, filename, ...codes };
  let bytes = 0;
  try {
    bytes = statSync(absolutePath).size;
  } catch {
    return { ...base, bytes: 0, status: "unreadable", detail: "The file could not be read. It may be a cloud placeholder." };
  }
  if (bytes === 0) return { ...base, bytes, status: "invalid", detail: "The file is empty." };
  const header = Buffer.alloc(4);
  let opened: number | undefined;
  try {
    opened = openSync(absolutePath, "r");
    readSync(opened, header, 0, 4, 0);
  } catch {
    return { ...base, bytes, status: "unreadable", detail: "The file could not be read. It may be a cloud placeholder." };
  } finally {
    if (opened !== undefined) closeSync(opened);
  }
  const zip = header[0] === 0x50 && header[1] === 0x4b && (header[2] === 3 || header[2] === 5 || header[2] === 7);
  if (!zip) {
    const sample = readFileSync(absolutePath).subarray(0, 800).toString("utf8");
    if (/drive\.google\.com|docs\.google\.com/i.test(sample)) {
      return { ...base, bytes, status: "invalid", detail: "Google Drive shortcut, not a Word document." };
    }
    return { ...base, bytes, status: "invalid", detail: "Not a DOCX zip archive." };
  }
  const contents = readFileSync(absolutePath);
  if (!contents.includes(Buffer.from("word/document.xml"))) {
    return { ...base, bytes, status: "invalid", detail: "ZIP archive has no word/document.xml." };
  }
  return { ...base, bytes, status: "valid", detail: "DOCX zip archive" };
}

export function discoverDocxFiles(root: string): DiscoveredDocx[] {
  const found: DiscoveredDocx[] = [];
  if (!existsSync(root)) return found;
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name.startsWith("~$")) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) walk(absolutePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".docx")) continue;
      found.push(inspectDocxFile(absolutePath, path.relative(root, absolutePath)));
    }
  };
  walk(root);
  return found.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}
