(() => {
  const TX_OUTBOUND_EVENT = "SIGNATURE_INTENT";
  const MESSAGE_OUTBOUND_EVENT = "MESSAGE_SIGNATURE_INTENT";
  const DECISION_EVENT = "SIGNATURE_DECISION";
  const STATE_KEY = "__clearSignAIContentState";
  const INJECTED_FLAG = "__clearSignAIInjectFileLoaded";
  const DECISION_CHANNEL = "CLEAR_SIGN_AI_SIGNATURE_DECISION";

  if (window[STATE_KEY]?.initialized) return;

  window[STATE_KEY] = {
    initialized: true,
    queue: [],
  };

  function relayToExtension(eventType, payload) {
    window[STATE_KEY].queue.push(payload);

    window.dispatchEvent(
      new CustomEvent("clearsignai:signature-intent", {
        detail: payload,
      })
    );

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      const msg = { type: eventType, payload };
      Promise.resolve(chrome.runtime.sendMessage(msg)).catch((err) => {
        console.warn("[PaladinShield] relayToExtension — extension bridge:", err?.message || err);
      });
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || !data.type || !data.payload) return;
    if (data.type !== TX_OUTBOUND_EVENT && data.type !== MESSAGE_OUTBOUND_EVENT) return;
    relayToExtension(data.type, data.payload);
  });

  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== DECISION_CHANNEL || !message.payload) return;
      window.postMessage(
        {
          type: DECISION_EVENT,
          payload: message.payload,
        },
        "*"
      );
    });
  }

  if (window[INJECTED_FLAG]) return;
  window[INJECTED_FLAG] = true;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = chrome.runtime.getURL("scripts/inject.js");
  script.async = false;
  script.dataset.clearsign = "inject";
  const target = document.documentElement || document.head;
  if (target?.firstChild) {
    target.insertBefore(script, target.firstChild);
  } else {
    target.appendChild(script);
  }
  script.onload = () => script.remove();
})();
