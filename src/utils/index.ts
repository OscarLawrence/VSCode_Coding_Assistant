import { Configuration, OpenAIApi } from "openai";
import {
  window,
  ExtensionContext,
  TextEditor,
  TextEditorEdit,
  commands,
} from "vscode";

let openai: null | OpenAIApi = null;

const setApiKey = async (context: ExtensionContext) => {
  const apiKey = await window.showInputBox({
    placeHolder: "Enter your OpenAI API key",
    prompt: "Please enter your OpenAI API key",
    password: true,
  });

  if (apiKey) {
    context.globalState.update("openaiApiKey", apiKey);
    window.showInformationMessage("OpenAI API key saved!");
  }
};

const checkApiKey = (context: ExtensionContext) => {
  const apiKey = context.globalState.get<string>("openaiApiKey");
  if (!apiKey) {
    setApiKey(context);
  }
  if (!openai) {
    openai = new OpenAIApi(new Configuration({ apiKey }));
  }
  return openai;
};

export const addCommand = (
  name: string,
  func: (openai: OpenAIApi, ...args: any[]) => void,
  context: ExtensionContext
) => {
  const f = (...args: any[]) => {
    const openai = checkApiKey(context);
    const textEditor = window.activeTextEditor;
    const edit = textEditor?.edit;
    func(openai, textEditor, edit, ...args);
  };
  return context.subscriptions.push(commands.registerCommand(name, f));
};

export const addEditorCommand = async (
  name: string,
  func: (
    openai: OpenAIApi,
    textEditor: TextEditor,
    edit: TextEditorEdit,
    ...args: any[]
  ) => void,
  context: ExtensionContext
) => {
  const f = (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => {
    const openai = checkApiKey(context);

    func(openai, textEditor, edit, ...args);
  };
  return context.subscriptions.push(
    commands.registerTextEditorCommand(name, f)
  );
};
