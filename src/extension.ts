import {
  ExtensionContext,
  ViewColumn,
  window,
  Uri,
  WebviewPanel,
} from "vscode";
import { join } from "path";
import { addCommand, addEditorCommand } from "./utils";
import { readFileSync } from "fs";

import { chatAboutFile, editFile } from "./utils/openai_Editor";

let openaiApiKey: string | undefined;

interface MessageI {
  role: "user" | "assistent";
  content: string;
}

const messages: MessageI[] = [];

export function activate(context: ExtensionContext) {
  openaiApiKey = context.globalState.get<string>("openaiApiKey");

  // addCommand("openai.chat.askAboutFile", chatAboutFile, context);
  addEditorCommand("openai.chat.askAboutFile", chatAboutFile, context);
  addEditorCommand("openai.edit.File", editFile, context);

  addCommand(
    "openai.webview",
    () => {
      const panel = window.createWebviewPanel("GPT", "GPT", ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });

      // Get the path to your index.html file
      const extensionPath = context.extensionPath;
      const indexPath = join(extensionPath, "index.html");
      // Set the HTML content of the panel to the contents of index.html
      panel.webview.html = readFileSync(indexPath).toString();
    },
    context
  );
}

export function deactivate(context: ExtensionContext) {
  context.globalState.update("openaiApiKey", openaiApiKey);
}
