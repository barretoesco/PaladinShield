(() => {
  const TX_OUTBOUND_EVENT = "SIGNATURE_INTENT";
  const MESSAGE_OUTBOUND_EVENT = "MESSAGE_SIGNATURE_INTENT";
  const STATE_KEY = "__clearSignAIContentState";
  const INJECTED_FLAG = "__clearSignAIInjectFileLoaded";
  const DECISION_CHANNEL = "CLEAR_SIGN_AI_SIGNATURE_DECISION";
  const DECISION_TOKEN_REGISTER_CHANNEL = "CLEAR_SIGN_AI_DECISION_TOKEN_REGISTER";
  const PAGE_HANDLER_REGISTER = "__paladinShieldRegisterDecisionToken";
  const PAGE_HANDLER_ACCEPT = "__paladinShieldAcceptDecision";

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

  function runPageHandler(handlerName, args) {
    const script = document.createElement("script");
    script.textContent = `(function(){try{var fn=window[${JSON.stringify(handlerName)}];if(typeof fn==="function"){fn.apply(null,${JSON.stringify(args)});}}catch(e){console.warn("[PaladinShield bridge]",e);}})();`;
    const target = document.documentElement || document.head || document.body;
    if (!target) return;
    target.appendChild(script);
    script.remove();
  }

  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message?.type || !message.payload) return;

      if (message.type === DECISION_TOKEN_REGISTER_CHANNEL) {
        const { requestId, decisionToken } = message.payload;
        if (!requestId || !decisionToken) return;
        runPageHandler(PAGE_HANDLER_REGISTER, [requestId, decisionToken]);
        return;
      }

      if (message.type === DECISION_CHANNEL) {
        const { requestId, decision, decisionToken, reason } = message.payload;
        if (!requestId || !decisionToken) return;
        runPageHandler(PAGE_HANDLER_ACCEPT, [requestId, decision, decisionToken, reason || ""]);
      }
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
