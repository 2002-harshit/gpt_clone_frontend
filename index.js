"use strict";
// require("dotenv").config();
const input_field = document.querySelector("#input-field");
const main_content = document.querySelector(".main_content");
const upper_main = document.querySelector(".upper_main");
const lower_main = document.querySelector(".lower_main");
let eventSource;
const backend = `https://hungry-tank-top-toad.cyclic.app`;
const assistant_context = {};
let isFirst = 1;

Array.from(document.querySelector(".examples").children).forEach(element => {
  element.addEventListener("click", () => {
    input_field.value = element.textContent;
  });
});

function renderUSER() {
  if (isFirst) {
    // console.log("yes");
    upper_main.innerHTML = "";
    isFirst = 0;
  }

  let userHTML = `<div class="user">
  <div><i class="ic2 fa fa-regular fa-user fa-xl"></i></div>
  <div class="user_content">${input_field.value}</div>
</div>`;

  upper_main.insertAdjacentHTML("beforeend", userHTML);
  if (isOverflowing()) {
    lower_main.classList.add("show-shadow");
  }
}

function renderGPT() {
  let gptHTML = `<div class="assistant">
      <div class="comp_image_holder"><i class="ic2 fa fa-light fa-computer fa-xl"></i></div>
      <div class="GPT_content"></div>
    </div>`;
  upper_main.insertAdjacentHTML("beforeend", gptHTML);
}

function renderStopButton() {
  if (lower_main.children.length === 1) {
    let stopButtonHTML = `
      <div class="stop_gen_holder">
        <button class="stop_generation">🛑 Stop generating</button>
      </div>
    `;
    lower_main.insertAdjacentHTML("afterbegin", stopButtonHTML);
  }
}

async function getData(userInput) {
  try {
    //*handling streams

    await fetch(`${backend || `http://localhost:8000`}/user_input`, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ role: "user", content: userInput }),
    });

    eventSource = new EventSource(`${backend || `http://localhost:8000`}/sse`);
    assistant_context.role = "assistant";
    assistant_context.content = "";
    //* rendering an empty box
    renderGPT();

    const GPT_content_divs = Array.from(
      document.querySelectorAll(".GPT_content")
    ); //* for grabbing the last div
    // assistant_context.push({ role: "assistant", content: "" });

    eventSource.onmessage = event => {
      renderStopButton();

      if (event.data !== `[DONE]`) {
        const data = JSON.parse(event.data).choices[0].delta.content;
        if (data) {
          assistant_context.content += data;

          GPT_content_divs.at(-1).innerText += data;

          if (isOverflowing()) {
            lower_main.classList.add("show-shadow");
          }
        }
      }
    };

    eventSource.addEventListener("done", async event => {
      console.log("Stream completed");
      eventSource.close();
      document.querySelector(".stop_gen_holder").remove();
      await fetch(`${backend || `http://localhost:8000`}/update_context`, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify(assistant_context),
      });
    });
  } catch (e) {
    throw e;
  }
}

async function endStream() {
  document.querySelector(".stop_generation").addEventListener("click", () => {
    eventSource.close();
    document.querySelector(".stop_gen_holder").remove();
    console.log("Stream ended by user");
  });
}
//*handling stop response button using mutation obeserver
const observer = new MutationObserver((mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      const stop_res_button = document.querySelector(".stop_generation");
      if (stop_res_button) endStream();
    }
  }
});

observer.observe(lower_main, { childList: true, subtree: true });

//* handling user input
input_field.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    document.querySelector(".submit_query").click();
  }
});

document.querySelector(".submit_query").addEventListener("click", async () => {
  if (input_field.value != "") {
    try {
      console.log("Query sent");
      renderUSER();
      await getData(input_field.value);
      input_field.value = "";
    } catch (e) {
      console.error(`💣💣 ${e}`);
    }
  }
});

document.querySelector(".new_chat").addEventListener("click", async () => {
  if (isFirst === 0) {
    upper_main.innerHTML = `<h1>
    "Talk to an AI: Explore the Possibilities with Our Chat GPT Clone!"
    </h1>
    <div class="examples">
    <div>Explain quantum computing in simple terms</div>
    <div>Got any creative ideas for a 10 year old's birthday?</div>
    <div>How do I make an HTTP request in Javascript?</div>
    <div>Tell something about chat gpt 4</div>
    <div>What's the weather in London?</div>
    </div>`;
    // console.log("inside it");
    isFirst = 1;
    await fetch(`${backend || `http://localhost:8000`}/chat_reset`, {
      method: "POST",
    });
    // const { msg } = await res.json();

    // console.log(msg);
  }
});

//*for shadow effect when overflowing
function isOverflowing() {
  return upper_main.scrollHeight > upper_main.clientHeight;
}
