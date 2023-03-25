const app = Vue.createApp({
  data() {
    return {
      message: "Hello, Vue!",
    };
  },
  template: `<div>{{ message }}</div>`,
});

app.mount("#app");
