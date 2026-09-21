import axios from "axios";
import fs from "fs";

const baseUrl = "https://brickset.com/sets/";
const outputFilePath = "output.xml";

async function getSetName(setNumber: string): Promise<string | undefined> {
  // Brickset URLs require a variant suffix, e.g. "75192-1"
  const query = setNumber.includes("-") ? setNumber : `${setNumber}-1`;
  const url = `${baseUrl}${query}/`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  const html: string = response.data;
  const match = html.match(/<h1>([\s\S]*?)<\/h1>/);
  return match?.[1].trim();
}

const setNumber = process.argv[2];
if (!setNumber) {
  console.error("Usage: node getSetName.js <setNumber>"); // e.g. 75192, without the -1 suffix
  process.exit(1);
}

getSetName(setNumber)
  .then((name) => {
    if (!name) {
      console.error(`No set found for "${setNumber}"`);
      process.exit(1);
    }
    console.log(name);

    // Strip characters that are not valid in Windows file names
    const safeName = name.replace(/[<>:"/\\|?*]/g, "");
    const newFilePath = `${safeName}.xml`;
    fs.renameSync(outputFilePath, newFilePath);
    console.log(`Renamed ${outputFilePath} to ${newFilePath}`);
  })
  .catch((error) => {
    console.error(`Error looking up set ${setNumber}:`, error);
    process.exit(1);
  });
