<template>
  <div>
    <h2>ChatGPT</h2>
    <div class="chat">
      <div class="chat__messages">
        <div class="chat__message" v-for="(message, i) in messages" :key="i">
          <h4>{{ message.role }}:</h4>
          <p>{{ message.content }}</p>
        </div>
      </div>
      <div class="chat__input">
        <input type="text" v-model="input" @keyup.enter="send" />
        <button @click="send">Send</button>
      </div>
      {{ loading }}
    </div>
  </div>
</template>

<script setup>
const openai = useOpenAI();

const input = ref(null);

const loading = ref(false);

const messages = reactive([
  {
    role: "system",
    content: `I am a virtual assistant to help you write better code. Please ask me anything.`,
  },
  {
    role: "user",
    content:
      "Hi, I am a full-stack developer. I am working with vue.js and node.js in my daily job. However, I am a fan of python, and write a lot of python code in my free time. I am also a big fan of machine learning and AI.",
  },
]);

const send = async () => {
  console.log(input.value);
  messages.push({
    role: "user",
    content: input.value,
  });
  loading.value = true;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
    max_tokens: 512,
    temperature: 0.7,
  });
  messages.push({
    role: "system",
    content: response.data.choices[0].text,
  });
  loading.value = false;
  input.value = null;
};
</script>
