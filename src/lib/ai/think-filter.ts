const OPEN = "<think>";
const CLOSE = "</think>";

/** Longitud del mayor sufijo de `text` que es prefijo (incompleto) de `tag`. */
function partialSuffix(text: string, tag: string): number {
  for (let n = Math.min(text.length, tag.length - 1); n > 0; n--) {
    if (text.endsWith(tag.slice(0, n))) return n;
  }
  return 0;
}

/**
 * Elimina del stream los bloques <think>…</think> que emiten algunos modelos de razonamiento
 * (por ejemplo DeepSeek-R1 o Qwen3 servidos con Ollama), incluso si las etiquetas llegan partidas
 * entre dos fragmentos.
 */
export class ThinkTagFilter {
  private buffer = "";
  private inThink = false;
  private trimLeading = false;

  push(chunk: string): string {
    this.buffer += chunk;
    let out = "";
    for (;;) {
      if (!this.inThink) {
        const open = this.buffer.indexOf(OPEN);
        if (open !== -1) {
          out += this.buffer.slice(0, open);
          this.buffer = this.buffer.slice(open + OPEN.length);
          this.inThink = true;
          continue;
        }
        const keep = partialSuffix(this.buffer, OPEN);
        out += this.buffer.slice(0, this.buffer.length - keep);
        this.buffer = this.buffer.slice(this.buffer.length - keep);
        break;
      }
      const close = this.buffer.indexOf(CLOSE);
      if (close !== -1) {
        this.buffer = this.buffer.slice(close + CLOSE.length);
        this.inThink = false;
        this.trimLeading = true;
        continue;
      }
      const keep = partialSuffix(this.buffer, CLOSE);
      this.buffer = this.buffer.slice(this.buffer.length - keep); // descarta el razonamiento
      break;
    }
    if (this.trimLeading && out) {
      out = out.replace(/^\s+/, "");
      if (out) this.trimLeading = false;
    }
    return out;
  }

  flush(): string {
    const rest = this.inThink ? "" : this.buffer;
    this.buffer = "";
    this.inThink = false;
    return rest;
  }
}
