import { Configuration, OpenAIApi } from "openai";

export default () => {
  const apiKey = "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";
  return new OpenAIApi(new Configuration({ apiKey }));
};
