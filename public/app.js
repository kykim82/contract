const roles = {
  client: {
    label: "발주자",
    name: "권혜진",
  },
  developer: {
    label: "개발자",
    name: "김경영",
  },
};

const params = new URLSearchParams(location.search);
const activeRole = params.get("role");
const signingToken = params.get("token") || "";
const pads = new Map();

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function setupPad(role) {
  const canvas = document.querySelector(`[data-pad="${role}"]`);
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111";

  const state = {
    canvas,
    context,
    drawing: false,
    dirty: false,
  };

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.drawing = true;
    state.dirty = true;
    const point = getPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.drawing) return;
    event.preventDefault();
    const point = getPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
  });

  function stopDrawing(event) {
    if (!state.drawing) return;
    state.drawing = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  pads.set(role, state);
}

function clearPad(role) {
  const pad = pads.get(role);
  if (!pad) return;
  pad.context.clearRect(0, 0, pad.canvas.width, pad.canvas.height);
  pad.dirty = false;
}

function setSignature(role, signature) {
  const canvas = document.querySelector(`[data-pad="${role}"]`);
  const image = document.querySelector(`[data-saved-signature="${role}"]`);
  const meta = document.querySelector(`[data-signed-meta="${role}"]`);
  if (!canvas || !image || !meta) return;

  if (!signature?.signatureData) {
    canvas.hidden = false;
    image.hidden = true;
    image.removeAttribute("src");
    meta.textContent = "아직 서명되지 않았습니다.";
    return;
  }

  canvas.hidden = true;
  image.hidden = false;
  image.src = signature.signatureData;
  const signedAt = signature.signedAt ? new Date(signature.signedAt).toLocaleString("ko-KR") : "";
  meta.textContent = `${signature.signerName || roles[role].name} 서명 완료${signedAt ? ` · ${signedAt}` : ""}`;
}

function setActiveRole() {
  if (!roles[activeRole]) return;
  document.querySelectorAll("[data-signature-card]").forEach((card) => {
    const role = card.dataset.signatureCard;
    card.classList.toggle("is-active", role === activeRole);
    card.querySelectorAll("canvas, button").forEach((element) => {
      element.disabled = role !== activeRole;
    });
  });
}

async function loadSignatures() {
  const response = await fetch("/api/signatures").catch(() => null);
  if (!response?.ok) {
    const saved = JSON.parse(localStorage.getItem("contract_signatures") || "{}");
    Object.keys(roles).forEach((role) => setSignature(role, saved[role]));
    return;
  }

  const data = await response.json();
  Object.keys(roles).forEach((role) => setSignature(role, data.signatures?.[role]));
}

async function saveSignature(role) {
  const pad = pads.get(role);
  if (!pad || !pad.dirty) {
    alert("서명을 먼저 입력해주세요.");
    return;
  }

  const signatureData = pad.canvas.toDataURL("image/png");
  const payload = {
    role,
    signerName: roles[role].name,
    signatureData,
    token: signingToken,
  };

  const response = await fetch("/api/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!response?.ok) {
    const saved = JSON.parse(localStorage.getItem("contract_signatures") || "{}");
    saved[role] = {
      role,
      signerName: roles[role].name,
      signatureData,
      signedAt: new Date().toISOString(),
    };
    localStorage.setItem("contract_signatures", JSON.stringify(saved));
    setSignature(role, saved[role]);
    alert("서명이 이 브라우저에 임시 저장되었습니다. 서버 저장을 사용하려면 D1 연결이 필요합니다.");
    return;
  }

  const data = await response.json();
  setSignature(role, data.signature);
  alert("서명이 저장되었습니다.");
}

document.querySelectorAll("[data-pad]").forEach((canvas) => setupPad(canvas.dataset.pad));
document.querySelectorAll("[data-clear]").forEach((button) => {
  button.addEventListener("click", () => clearPad(button.dataset.clear));
});
document.querySelectorAll("[data-save]").forEach((button) => {
  button.addEventListener("click", () => saveSignature(button.dataset.save));
});
document.getElementById("refreshButton").addEventListener("click", loadSignatures);
document.getElementById("printButton").addEventListener("click", () => window.print());

setActiveRole();
loadSignatures();
