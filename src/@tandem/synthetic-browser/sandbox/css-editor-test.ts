import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { generateRandomStyleSheet } from "@tandem/synthetic-browser/test/helpers";
import { FileEditorProvider, FileSystemProvider } from "@tandem/sandbox";
import { waitForPropertyChange, Application, LogLevel } from "@tandem/common";
import { createTestMasterApplication, createRandomFileName } from "@tandem/editor/test";
import { SyntheticCSSStyleSheet, SyntheticBrowser, parseCSS, evaluateCSS } from "@tandem/synthetic-browser";

export const cssEditorTestCases = [
  [`a { color: red; }`, `a{ color: blue; }`],
  [`.a { color: red; }`, `.a{ color: blue; }`],
  [`.a { color: red; }`, `.a{ }`],
  [`.a { color: red;  }`, `.a{ color: red; background: orange; }`],
  [`.a { color: red; background: orange; }`, `.a{ }`],
  [`.a { color: red; }`, `.a{ color: red; } .b { color: blue; }`],
  [`.a { color: red; }`, `.a{ color: red; } @media screen { .b { color: blue; }}`],
  [`.a { color: black; }`, `.a{ color: black; } @keyframes a { 0% { color: blue; }}`],
  [`.a{color:red}.b{color:blue}`, `.b { color: blue; } .a{ color: red; }`],
  [`@media screen {\n.b{color:red}}`, `@media screen { .c { color: red; }}`],

  [
    `@keyframes g { 0% { color: green; }}`,
    `@keyframes a { 0% { color: orange; } }`
  ],

  [
    `@keyframes e { 0% { color: blue } }`,
    `@keyframes e { 1% { color: blue } } `
  ],

  [
    `@keyframes a { 0% { color: red; } }`,
    `@keyframes b { 0% { color: red; } } @keyframes a { 0% { color: blue } }`,
  ],

  [
    `.a { color: red; } @media screen { .c { color: white }}`,
    `.b { color: blue; } .a { color: green; }`
  ],

  [
    `@media screen and (min-width: 480px) { .a { color: red; }} .h { } @media screen and (min-width: 500px) { .a { color: red; }}`,
    `.l { color: blue; }  @media screen and (min-width: 500px) { .a { color: blue; } }`
  ],

  [
    `.c { color: red; text-decoration: none; }`,
    `.c { text-decoration: none; color: blue; }`
  ],
];
describe(__filename + "#", () => {

  const cssLoaderPath = path.join(process.cwd(), "node_modules", "css-loader");
  const addStylePath  = path.join(process.cwd(), "node_modules", "style-loader", "addStyles.js");
  const cssBasePath   = path.join(cssLoaderPath, "lib", "css-base.js");

  let app: Application;

  before(async () => {
    app = createTestMasterApplication({
      // logLevel: LogLevel.ERROR | LogLevel.WARN,
      logLevel: LogLevel.NONE,
      sandboxOptions: {
        mockFiles: {
          [cssBasePath]: fs.readFileSync(cssBasePath, "utf8"),
          [addStylePath]: fs.readFileSync(addStylePath, "utf8")
        }
      }
    });
    await app.initialize();
  });

  const loadCSS = async (content: string) => {

    const { injector } = app;
    const fs = FileSystemProvider.getInstance(injector);

    const entryCSSFilePath = createRandomFileName("css");
    const entryJSFilePath  = createRandomFileName("js");

    await fs.writeFile(entryCSSFilePath, content);
    await fs.writeFile(entryJSFilePath, `
      require("${entryCSSFilePath}");
    `);

    const browser = new SyntheticBrowser(injector);
    await browser.open({
      url: entryJSFilePath,
      dependencyGraphStrategyOptions: {
        name: "webpack"
      }
    });

    return {
      styleSheet: browser.document.styleSheets[0],
      fileEditor: FileEditorProvider.getInstance(injector),
      reloadStylesheet: async () => {
        await waitForPropertyChange(browser.sandbox, "exports");
        return browser.document.styleSheets[0]
      }
    }
  }

  const fuzzyTests = Array.from({ length: 30 }).map((v) => [
    generateRandomStyleSheet(4, 2).cssText.replace(/[\s\r\n\t]+/g, " "),
    generateRandomStyleSheet(4, 2).cssText.replace(/[\s\r\n\t]+/g, " ")
  ]);

  [
    ...cssEditorTestCases,
    // css and other similar languages
    ...fuzzyTests,
  ].forEach(([oldSource, newSource]) => {
    it(`can apply a file edit from ${oldSource} to ${newSource}`, async () => {
      const a = await loadCSS(oldSource);
      const b = await loadCSS(newSource);
      const edit = a.styleSheet.createEdit().fromDiff(b.styleSheet);
      expect(edit.actions.length).not.to.equal(0);
      a.fileEditor.applyEditActions(...edit.actions);
      expect((await a.reloadStylesheet()).cssText).to.equal(b.styleSheet.cssText);
    });
  });


  xit("doesn't save the file if there's a syntax error in an edit");
});