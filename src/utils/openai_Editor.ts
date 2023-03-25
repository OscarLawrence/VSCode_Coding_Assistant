import {
  ExtensionContext,
  window,
  TextEditor,
  TextEdit,
  TextEditorEdit,
  commands,
  Range,
  WorkspaceEdit,
  workspace,
  Position,
} from "vscode";

import { OpenAIApi } from "openai";

interface MessageI {
  role: "user" | "assistant" | "system";
  content: string;
}

const getCommentSyntax = (language: string): string => {
  switch (language) {
    case "javascript":
    case "typescript":
      return "// ";
    case "python":
      return "# ";
    case "java":
    case "c":
    case "cpp":
      return "// ";
    case "html":
    case "xml":
      return "<!-- --> ";
    // add cases for other languages as needed
    default:
      return "";
  }
};

let maxLineLength = 80;

const formatContent = (content: string, commentSyntax: string) => {
  let newContent = "";
  const contentLines = content.split("\n");
  // check if any line is longer then maxLineLength
  for (let line of contentLines) {
    let tmp = line;
    if (tmp.includes("`python")) {
    }
    if (tmp.length > maxLineLength) {
      // split line
      let newLines = [];
      while (tmp.length > 0) {
        console.log(tmp.length);
        const newLine = tmp.substring(0, maxLineLength);
        tmp = tmp.replace(newLine, "");
        newLines.push(
          newLine.startsWith(commentSyntax) ? newLine : commentSyntax + newLine
        );
      }
      newContent += newLines.join("\n");
    } else {
      newContent += line;
    }
  }
  return newContent;
};

const loadMessagesFromFileComments = (
  fileContent: string,
  commentSyntax: string,
  chatMembers: string[] = ["user", "assistant"]
) => {
  const messages = [];
  let replaceText = "";
  // read messages from the fileContent.
  let currentMember = null;
  let currentText = "";
  for (let line of fileContent.split("\n")) {
    let found = false;
    if (!line.startsWith(commentSyntax)) continue;
    for (let member of chatMembers) {
      if (line.includes(member)) {
        if (currentMember) {
          messages.push({
            role: currentMember,
            content: formatContent(currentText, commentSyntax),
          });

          currentText = "";
        }
        currentMember = member;
        found = true;
        replaceText += line;
      }
    }
    if (!found && currentMember) {
      currentText += line.replace(commentSyntax, "");
      replaceText += line;
    }
  }

  if (currentMember) {
    messages.push({
      role: currentMember,
      content: currentText,
    });
    currentText = "";
  }

  console.log(replaceText, "loaded Replace");

  return { messages, replaceText };
};

const writeMessagesToFile = (
  messages: MessageI[],
  textEditor: TextEditor,
  commentSyntax: string,
  replaceText: string = ""
) => {
  let toInsert = "";
  for (let message of messages) {
    if (message.role === "system") {
      continue;
    }
    toInsert +=
      commentSyntax +
      message.role +
      ":\n" +
      commentSyntax +
      message.content +
      "\n";
  }

  console.log(replaceText, "replace");
  console.log(toInsert, "insert");

  const t = textEditor.document.getText();

  // console.log(t);
  const lines = t.split("\n");
  textEditor.edit((editBuilder) => {
    // editBuilder.delete(
    //   new Range(
    //     new Position(0, 0),
    //     new Position(lines.length, lines[lines.length - 1].length)
    //   )
    // );
    const contentLines = lines.length;
    const lastLineLength = lines[lines.length - 1].length;
    console.log(contentLines, lastLineLength);
    const range = new Range(
      new Position(0, 0),
      new Position(lines.length, lines[lines.length - 1].length)
    );
    editBuilder.replace(range, toInsert);
  });
  return toInsert;
};

export const chatAboutFile = async (
  openai: OpenAIApi,
  textEditor: TextEditor,
  edit: TextEditorEdit
) => {
  const fileContent = textEditor.document.getText();
  const path = textEditor.document.uri.path;
  const language = textEditor.document.languageId;
  const commentSyntax = getCommentSyntax(language);

  const currentData = loadMessagesFromFileComments(fileContent, commentSyntax);

  const messages = [
    {
      role: "system",
      content: `
      I have some questions regarding this ${language} file:
        <code>
          ${fileContent}
        </code>
    `,
    },
    ...currentData.messages,
  ];

  const input = await window.showInputBox({
    prompt: "What would you like to ask about the file?",
    value: "Please give a short summary of this file",
  });
  if (!input) return;

  messages.push({
    role: "user",
    content: formatContent(input, commentSyntax),
  });

  console.log(messages);

  writeMessagesToFile(
    messages,
    textEditor,
    commentSyntax,
    currentData.replaceText
  );

  try {
    console.info("loading...");
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    if (response.status === 200) {
      const { choices } = response.data;
      let message = choices[0].message;

      if (message) {
        message.content = formatContent(message.content, commentSyntax);
        messages.push(message);
      }
      console.log(messages);
      writeMessagesToFile(
        messages,
        textEditor,
        commentSyntax,
        currentData.replaceText
      );
    }
  } catch (error) {
    console.error(error);
  }
};

const getUserInput = async (prompt: string, value: string): Promise<string> => {
  let input = null;
  while (!input) {
    input = await window.showInputBox({
      prompt,
      value,
    });
  }
  return input;
};

export const editFile = async (
  openai: OpenAIApi,
  textEditor: TextEditor,
  edit: TextEditorEdit
) => {
  const fileContent = textEditor.document.getText();
  const selectedText = textEditor.document.getText(textEditor.selection);

  const instruction = await getUserInput(
    "Please enter your edit instructions",
    "Please clean up this code"
  );

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `${selectedText}\nPlease update the code above according to the following instructions:\n${instruction}}`,
    max_tokens: 512,
    temperature: 0,
  });

  if (response.status === 200) {
    console.log(response.data);
    const { choices } = response.data;
    const editObj = choices[0];
    console.log(editObj);
    const editText = editObj.text as string;
    textEditor.edit((editBuilder) => {
      editBuilder.replace(textEditor.selection, editText);
    });
  }
};

export const handleEditor = (editor: TextEditor | undefined) => {
  if (!editor) {
    editor = window.activeTextEditor;
  }

  if (editor) {
    // Get the contents of the current document
    let document = editor.document;
    let text = document.getText();

    console.log(text);

    // Send a request to the external API with the contents of the document
    // request.post(
    //   {
    //     url: "https://example.com/api",
    //     body: {
    //       text: text,
    //     },
    //     json: true,
    //   },
    //   (error, response, body) => {
    //     if (error) {
    //       vscode.window.showErrorMessage(
    //         "Error sending document: " + error.message
    //       );
    //     } else {
    //       vscode.window.showInformationMessage(
    //         "Document sent successfully!"
    //       );
    //     }
    //   }
    // );
  }
};
