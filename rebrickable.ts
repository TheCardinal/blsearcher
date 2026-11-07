import axios from "axios";
import csv from "csv-parser";
import { Readable } from "stream";
import zlib from "zlib";

const apiUrl = "https://rebrickable.com/api/v3/lego";
const elementsUrl = "https://cdn.rebrickable.com/media/downloads/elements.csv.gz";

export interface BricklinkItem {
  itemId: string;
  color: string;
}

interface RebrickableElement {
  partNum: string;
  colorId: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiGet(apiKey: string, url: string): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `key ${apiKey}` },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const wait = Number(error.response.headers["retry-after"]) || 5;
        await sleep(wait * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Rebrickable rate limit exceeded for ${url}`);
}

async function getAllPages(apiKey: string, firstUrl: string): Promise<any[]> {
  const results: any[] = [];
  let url: string | null = firstUrl;
  while (url) {
    const data = await apiGet(apiKey, url);
    results.push(...data.results);
    url = data.next;
  }
  return results;
}

async function loadElements(): Promise<Map<string, RebrickableElement>> {
  const response = await axios.get(elementsUrl, { responseType: "arraybuffer" });
  const text = zlib.gunzipSync(Buffer.from(response.data)).toString("utf-8");
  return new Promise((resolve, reject) => {
    const elements = new Map<string, RebrickableElement>();
    Readable.from([text])
      .pipe(csv())
      .on("data", (row: Record<string, string>) => {
        elements.set(row.element_id, {
          partNum: row.part_num,
          colorId: row.color_id,
        });
      })
      .on("end", () => resolve(elements))
      .on("error", reject);
  });
}

async function loadColorMap(apiKey: string): Promise<Map<string, string>> {
  const colors = await getAllPages(apiKey, `${apiUrl}/colors/?page_size=1000`);
  const map = new Map<string, string>();
  for (const color of colors) {
    const blId = color.external_ids?.BrickLink?.ext_ids?.[0];
    if (blId !== undefined) {
      map.set(String(color.id), String(blId));
    }
  }
  return map;
}

async function loadPartMap(
  apiKey: string,
  partNums: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const chunkSize = 100;
  for (let i = 0; i < partNums.length; i += chunkSize) {
    const chunk = partNums.slice(i, i + chunkSize);
    const url =
      `${apiUrl}/parts/?page_size=${chunkSize}&inc_part_details=1` +
      `&part_nums=${encodeURIComponent(chunk.join(","))}`;
    for (const part of await getAllPages(apiKey, url)) {
      const blId = part.external_ids?.BrickLink?.[0];
      if (blId) {
        map.set(part.part_num, String(blId));
      }
    }
  }
  return map;
}

/**
 * Builds a resolver translating LEGO element IDs (e.g. 6371584) into
 * BrickLink item IDs and color IDs, using Rebrickable instead of BrickLink.
 */
export async function createRebrickableResolver(
  apiKey: string,
  elementIds: string[]
): Promise<(elementId: string) => BricklinkItem | undefined> {
  console.log("Loading Rebrickable element, color and part data...");
  const [elements, colorMap] = await Promise.all([
    loadElements(),
    loadColorMap(apiKey),
  ]);

  const partNums = new Set<string>();
  for (const id of elementIds) {
    const element = elements.get(id);
    if (element) {
      partNums.add(element.partNum);
    }
  }
  const partMap = await loadPartMap(apiKey, [...partNums]);

  return (elementId: string) => {
    const element = elements.get(elementId);
    if (!element) {
      return undefined;
    }
    return {
      // Rebrickable part numbers match BrickLink unless an explicit mapping exists
      itemId: partMap.get(element.partNum) ?? element.partNum,
      color: colorMap.get(element.colorId) ?? "",
    };
  };
}
