// ============================================================
// Direct Print Driver Thermal ESC/POS (58mm / 80mm)
// Membangun buffer byte perintah ESC/POS untuk printer
// thermal, didukung koneksi Web Serial & fallback window.print.
// ============================================================

export type Align = "left" | "center" | "right";

export interface ReceiptLine {
  text: string;
  align?: Align;
  bold?: boolean;
  doubleWidth?: boolean;
  small?: boolean; // font B
  underline?: boolean;
}

const ESC = 0x1b;
const GS = 0x1d;

function cmd(...bytes: number[]): number[] {
  return bytes;
}

function textBytes(text: string): number[] {
  // Strip karakter non-latin yang tidak didukung printer thermal
  const cleaned = text
    .replace(/[^\x20-\x7E\u0080-\u00FF\u0100-\u017F]/g, "")
    .replace(/[•●]/g, "-")
    .replace(/[–—]/g, "-");
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(cleaned));
}

export function buildEscPosReceipt(lines: ReceiptLine[]): Uint8Array {
  const out: number[] = [];

  // INIT
  out.push(...cmd(ESC, 0x40));
  // MARGIN: feed 3 baris kosong di awal, 0x1B 0x4C n skip untuk 80mm
  out.push(...cmd(0x1b, 0x4c, 12));

  for (const line of lines) {
    if (line.text === "---") {
      out.push(...textBytes("--------------------------------"));
      out.push(0x0a);
      continue;
    }

    // Align
    const alignByte = line.align === "center" ? 0x01 : line.align === "right" ? 0x02 : 0x00;
    out.push(...cmd(ESC, 0x61, alignByte));

    // Font B (small)
    if (line.small) out.push(...cmd(ESC, 0x4d, 0x01));

    // Double width
    if (line.doubleWidth) out.push(...cmd(GS, 0x21, 0x10));
    if (line.bold) out.push(...cmd(ESC, 0x45, 0x01));
    if (line.underline) out.push(...cmd(ESC, 0x2d, 0x01));

    out.push(...textBytes(line.text));
    out.push(0x0a);

    // Reset atribut
    if (line.doubleWidth) out.push(...cmd(GS, 0x21, 0x00));
    if (line.bold) out.push(...cmd(ESC, 0x45, 0x00));
    if (line.underline) out.push(...cmd(ESC, 0x2d, 0x00));
    if (line.small) out.push(...cmd(ESC, 0x4d, 0x00));
  }

  // Feed + cut
  out.push(...cmd(ESC, 0x61, 0x00));
  out.push(...textBytes(""));
  out.push(0x0a, 0x0a, 0x0a, 0x0a);
  out.push(...cmd(GS, 0x56, 0x42, 0x00));

  return new Uint8Array(out);
}

export function formatReceiptLine(
  judul: string,
  kolom1: string,
  kolom2?: string,
  lebar = 32
): string {
  if (!kolom2) return judul.padEnd(lebar);
  const total = lebar;
  const sisa = total - kolom1.length;
  if (kolom2.length >= sisa) return `${kolom1} ${kolom2}`;
  return kolom1.padEnd(sisa, ".") + kolom2;
}

export async function printerWebSerialAda(): Promise<boolean> {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export async function printEscPos(data: Uint8Array): Promise<void> {
  // 1) Prioritas: Web Serial API (printer thermal USB)
  try {
    const nav = navigator as Navigator & {
      serial?: {
        requestPort: () => Promise<unknown>;
      };
    };
    if (nav.serial && typeof nav.serial.requestPort === "function") {
      const port = (await nav.serial.requestPort()) as {
        open: (opts: { baudRate: number }) => Promise<void>;
        writable?: WritableStream<Uint8Array>;
      };
      await port.open({ baudRate: 9600 });
      const writer = port.writable?.getWriter();
      if (writer) {
        await writer.write(data);
        writer.releaseLock();
      }
      return;
    }
  } catch {
    // user cancel / tidak ada port -> lanjut fallback print
  }

  // 2) Fallback: jendela cetak / driver printer default OS
  const html = buatReceiptHtml(data);
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function decodeEscposText(data: Uint8Array): string {
  // heuristik sederhana: skip byte perintah, ambil byte ASCII/Latin
  const teks: number[] = [];
  let i = 0;
  while (i < data.length) {
    const b = data[i];
    if (b === ESC || b === GS) {
      i += b === ESC ? 2 : 3;
      continue;
    }
    if (b === 0x0a) {
      i++;
      continue;
    }
    if (b >= 0x20 && b <= 0xff) teks.push(b);
    i++;
  }
  return new TextDecoder("latin1").decode(new Uint8Array(teks)).replace(/\s+/g, " ").replace(/(\s{6,})/g, " · ");
}

function buatReceiptHtml(data: Uint8Array): string {
  const safe = decodeEscposText(data);
  return `<!doctype html><html><head><title>Struk</title><style>
  body{font-family:'Courier New',monospace;font-size:12px;width:58mm;margin:0 auto;white-space:pre-wrap;word-break:break-all}
  </style></head><body onload="setTimeout(()=>{window.print();setTimeout(()=>window.close(),600)},300)"><div>${safe}</div></body></html>`;
}