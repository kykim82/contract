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
const modal = {
  root: document.getElementById("signatureModal"),
  title: document.getElementById("signatureModalTitle"),
  canvas: document.getElementById("modalSignaturePad"),
  role: null,
  drawing: false,
  dirty: false,
};
modal.context = modal.canvas.getContext("2d");
modal.context.lineWidth = 5;
modal.context.lineCap = "round";
modal.context.lineJoin = "round";
modal.context.strokeStyle = "#111";

function hasRoleLock() {
  return Boolean(roles[activeRole]);
}

function canEditRole(role) {
  return !hasRoleLock() || activeRole === role;
}

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function setupPreviewPad(role) {
  const canvas = document.querySelector(`[data-pad="${role}"]`);
  if (!canvas) return;

  const context = canvas.getContext("2d");
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111";

  pads.set(role, {
    canvas,
    context,
    dirty: false,
  });

  canvas.addEventListener("click", () => openSignatureModal(role));
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    openSignatureModal(role);
  });
}

function clearCanvasContext(context, canvas) {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function clearCanvas(role) {
  const pad = pads.get(role);
  if (!pad) return;
  clearCanvasContext(pad.context, pad.canvas);
  pad.dirty = false;
}

function clearPad(role) {
  if (!canEditRole(role)) {
    alert(`${roles[role].label} 서명 링크에서만 수정할 수 있습니다.`);
    return;
  }

  clearCanvas(role);
  const meta = document.querySelector(`[data-signed-meta="${role}"]`);
  if (meta) meta.textContent = "서명을 다시 입력해주세요.";
}

function drawImageToCanvas(context, canvas, image) {
  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = image.width / image.height;
  let width = canvas.width;
  let height = canvas.height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    height = width / imageRatio;
    y = (canvas.height - height) / 2;
  } else {
    width = height * imageRatio;
    x = (canvas.width - width) / 2;
  }

  context.drawImage(image, x, y, width, height);
}

function drawSignature(role, signatureData) {
  const pad = pads.get(role);
  if (!pad) return;

  clearCanvas(role);
  if (!signatureData) return;

  const image = new Image();
  image.onload = () => {
    drawImageToCanvas(pad.context, pad.canvas, image);
    pad.dirty = false;
  };
  image.src = signatureData;
}

function setSignature(role, signature) {
  const meta = document.querySelector(`[data-signed-meta="${role}"]`);
  if (!meta) return;

  if (!signature?.signatureData) {
    drawSignature(role, "");
    meta.textContent = "아직 서명되지 않았습니다.";
    return;
  }

  drawSignature(role, signature.signatureData);
  const signedAt = signature.signedAt ? new Date(signature.signedAt).toLocaleString("ko-KR") : "";
  meta.textContent = `${signature.signerName || roles[role].name} 서명 완료${signedAt ? ` · ${signedAt}` : ""}`;
}

function setActiveRole() {
  document.querySelectorAll("[data-signature-card]").forEach((card) => {
    const role = card.dataset.signatureCard;
    const isActive = hasRoleLock() && role === activeRole;
    const isLocked = hasRoleLock() && role !== activeRole;

    card.classList.toggle("is-active", isActive);
    card.classList.toggle("is-locked", isLocked);
    card.querySelectorAll("button").forEach((button) => {
      button.disabled = isLocked;
    });

    const canvas = card.querySelector("canvas");
    if (canvas) {
      canvas.setAttribute("aria-disabled", isLocked ? "true" : "false");
      canvas.tabIndex = isLocked ? -1 : 0;
    }
  });
}

function openSignatureModal(role) {
  if (!canEditRole(role)) {
    alert(`${roles[role].label} 서명 링크에서만 수정할 수 있습니다.`);
    return;
  }

  const pad = pads.get(role);
  if (!pad) return;

  modal.role = role;
  modal.dirty = false;
  modal.title.textContent = `${roles[role].label} 서명하기`;
  clearCanvasContext(modal.context, modal.canvas);
  modal.context.drawImage(pad.canvas, 0, 0, modal.canvas.width, modal.canvas.height);
  modal.root.hidden = false;
  document.body.classList.add("signature-modal-open");
}

function closeSignatureModal() {
  modal.root.hidden = true;
  modal.role = null;
  modal.drawing = false;
  modal.dirty = false;
  document.body.classList.remove("signature-modal-open");
}

function clearModalPad() {
  clearCanvasContext(modal.context, modal.canvas);
  modal.dirty = true;
}

function confirmModalSignature() {
  if (!modal.role) return;
  const pad = pads.get(modal.role);
  if (!pad) return;

  clearCanvasContext(pad.context, pad.canvas);
  pad.context.drawImage(modal.canvas, 0, 0, pad.canvas.width, pad.canvas.height);
  pad.dirty = true;

  const meta = document.querySelector(`[data-signed-meta="${modal.role}"]`);
  if (meta) meta.textContent = "서명 입력 완료. 저장 버튼을 눌러주세요.";
  closeSignatureModal();
}

function setupModalPad() {
  modal.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    modal.canvas.setPointerCapture(event.pointerId);
    modal.drawing = true;
    modal.dirty = true;
    const point = getPoint(event, modal.canvas);
    modal.context.beginPath();
    modal.context.moveTo(point.x, point.y);
  });

  modal.canvas.addEventListener("pointermove", (event) => {
    if (!modal.drawing) return;
    event.preventDefault();
    const point = getPoint(event, modal.canvas);
    modal.context.lineTo(point.x, point.y);
    modal.context.stroke();
  });

  function stopDrawing(event) {
    if (!modal.drawing) return;
    modal.drawing = false;
    try {
      modal.canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may already have released this pointer.
    }
  }

  modal.canvas.addEventListener("pointerup", stopDrawing);
  modal.canvas.addEventListener("pointercancel", stopDrawing);
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
  if (!canEditRole(role)) {
    alert(`${roles[role].label} 서명 링크에서만 저장할 수 있습니다.`);
    return;
  }

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

document.querySelectorAll("[data-pad]").forEach((canvas) => setupPreviewPad(canvas.dataset.pad));
document.querySelectorAll("[data-clear]").forEach((button) => {
  button.addEventListener("click", () => clearPad(button.dataset.clear));
});
document.querySelectorAll("[data-save]").forEach((button) => {
  button.addEventListener("click", () => saveSignature(button.dataset.save));
});
document.querySelector("[data-modal-close]").addEventListener("click", closeSignatureModal);
document.querySelector("[data-modal-clear]").addEventListener("click", clearModalPad);
document.querySelector("[data-modal-confirm]").addEventListener("click", confirmModalSignature);
modal.root.addEventListener("click", (event) => {
  if (event.target === modal.root) closeSignatureModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.root.hidden) closeSignatureModal();
});
document.getElementById("refreshButton").addEventListener("click", loadSignatures);
document.getElementById("printButton").addEventListener("click", () => window.print());

setupModalPad();
setActiveRole();
loadSignatures();
