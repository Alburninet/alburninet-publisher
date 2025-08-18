import { marked } from "marked";
export function mdToHtml(md: string) { return marked.parse(md ?? ""); }
