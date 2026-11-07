# Bricklink searcher

LEGO parts helper program in Typescript

It is designed to take the parts list from a LEGO PDF and convert it to a XML wanted list to be used in Bricklink Studio.

Alongside quantity, it converts "part color codes" like 6451205 to "item id" 18853 and "color" 103.

It uses the Bricklink search engine to achieve its results.

## commands 

To install, run:
```bash
npm i
```

To compile run: 
```bash
npm run build
```

To download a set's inventory from Brickset into `parts_list.csv` (instead of extracting it from a PDF), run:
```bash
npm run download -- 10371
```

To start the program run:
```bash
npm start -- 75192
```

This processes `parts_list.csv` into `output.xml`, then looks up the set's name on Brickset and renames the file accordingly (e.g. `75192 Millennium Falcon.xml`).

The set number is optional. If omitted, the file is left as `output.xml`:
```bash
npm start
```

If Bricklink is unavailable, translate the part codes through Rebrickable instead (requires a free [Rebrickable API key](https://rebrickable.com/api/)):
```powershell
$env:REBRICKABLE_API_KEY = "your key"
npm start -- 75192 --rebrickable
```
It maps element IDs (e.g. `6371584`) to Bricklink item IDs and color IDs (e.g. `78258` / `11`) using Rebrickable's element list and API. Elements it can't map are reported and left with an empty color.