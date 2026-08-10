import { scriptSemFlashDeTema } from "@/lib/tema";

export function ScriptSemFlashDeTema() {
  return <script dangerouslySetInnerHTML={{ __html: scriptSemFlashDeTema() }} />;
}
