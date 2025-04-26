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
npx tsc
```

To start the program run:
```bash
node searchProduct.js
```