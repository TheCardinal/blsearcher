import axios from "axios";
import csv from "csv-parser";
import fs from "fs";

const baseUrl =
  "https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=";
const filePath = "parts_list.csv";
const outputFilePath = "output.xml"; // Define the output file path
const writeStream = fs.createWriteStream(outputFilePath, { flags: "w" }); // Create a write stream

const readCsvFile = (filePath: string): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const lines: string[][] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        lines.push(Object.values(row));
      })
      .on("end", () => {
        resolve(lines);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

class Product {
  itemType: string = "P";
  itemId: string = "";
  color: string = "";
  minqty: string = "";
  condition: string = "X";
  notify: string = "N";

  constructor(itemId: string, color: string, quantity: string = "1") {
    this.itemId = itemId;
    this.color = color;
    this.minqty = quantity;
  }

  public toString(): string {
    return `<ITEM>
      <ITEMTYPE>${this.itemType}</ITEMTYPE>
      <ITEMID>${this.itemId}</ITEMID>
      <COLOR>${this.color}</COLOR>
      <MAXPRICE>-1.0000</MAXPRICE>
      <MINQTY>${this.minqty}</MINQTY>
      <CONDITION>${this.condition}</CONDITION>
      <NOTIFY>${this.notify}</NOTIFY>
    </ITEM>`.replace(/[ \t]+/g, "");
  }
}

let consoleLogCount = 0; // Initialize a counter for console logs

async function searchProduct(partNumber: string): Promise<Product> {
  if (consoleLogCount == 24) {
    process.stdout.write("\n"); // Log without a line break
    consoleLogCount = 0; // Reset the counter
  }
  process.stdout.write("."); // Log without a line break

  const url = `${baseUrl}${partNumber}`;
  const product = new Product(partNumber, "", "");
  try {
    const response = await axios.get(url, {
      headers: {
        Referer: "https://www.bricklink.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const data: any = response.data;
    const firstItem = data.result.typeList[0].items[0];
    product.itemId = firstItem.strItemNo;

    // Regex to extract colorNumber
    const pcc = firstItem.strPCC;
    const regex = /\((\d+)\)$/;
    const match = pcc.match(regex);

    if (match) {
      product.color = match[1];
    }
  } catch (error) {
    console.error(`Error making request for part ${partNumber}:`, error);
  }
  return product;
}

readCsvFile(filePath)
  .then(async (lines: string[][]) => {
    // [TEST CODE] let x = 0;
    console.log(
      `CSV file read successfully. Processing ${lines.length} products...`
    );
    writeStream.write('<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n'); // Start the XML root element

    const productPromises = lines.map(async (line) => {
      // [TEST CODE] if (x > 10) return; // Stop processing after 10 items
      // [TEST CODE] x++;

      const product = await searchProduct(line[1]);
      product.minqty = line[0];
      writeStream.write(product.toString() + "\n"); // Write each product to the file
    });

    await Promise.all(productPromises); // Wait for all promises to resolve
    writeStream.end("</INVENTORY>\n"); // End the XML root element
  })
  .catch((error) => {
    console.error("Error reading CSV file:", error);
  });
