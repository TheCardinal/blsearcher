import axios from "axios";
import csv from "csv-parser";
import fs from "fs";
import { Readable } from "stream";

const inventoryUrl = "https://brickset.com/export/inventory/";
const outputFilePath = "parts_list.csv";

const input = process.argv[2];
if (!input || !/^\d+(-\d+)?$/.test(input)) {
  console.error("Usage: npm run download -- <set number>   (e.g. 10371)");
  process.exit(1);
}
const setNumber = input.includes("-") ? input : `${input}-1`;

const parseInventory = (data: string): Promise<Map<string, number>> => {
  return new Promise((resolve, reject) => {
    const parts = new Map<string, number>();
    Readable.from([data])
      .pipe(csv())
      .on("data", (row: Record<string, string>) => {
        const element = row.ElementID?.trim();
        const qty = parseInt(row.Qty, 10);
        if (element && qty > 0) {
          parts.set(element, (parts.get(element) ?? 0) + qty);
        }
      })
      .on("end", () => resolve(parts))
      .on("error", reject);
  });
};

async function main() {
  const response = await axios.get<string>(`${inventoryUrl}${setNumber}`, {
    responseType: "text",
    maxRedirects: 5,
  });

  const parts = await parseInventory(response.data);
  if (parts.size === 0) {
    throw new Error(`No parts found in inventory for set ${setNumber}`);
  }

  const lines = ["amount,part"];
  parts.forEach((amount, part) => lines.push(`${amount},${part}`));
  fs.writeFileSync(outputFilePath, lines.join("\n") + "\n");

  console.log(
    `Saved ${parts.size} parts of set ${setNumber} to ${outputFilePath}`
  );
}

main().catch((error) => {
  console.error(`Failed to download inventory: ${error.message}`);
  process.exit(1);
});
