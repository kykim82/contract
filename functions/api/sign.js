function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function allowedRole(role) {
  return role === "client" || role === "developer";
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, message: "D1 binding DB is not configured" }, 500);
  }

  const body = await request.json().catch(() => ({}));
  if (env.SIGNING_TOKEN && body.token !== env.SIGNING_TOKEN) {
    return json({ ok: false, message: "Invalid signing token" }, 401);
  }

  const role = String(body.role || "");
  const signerName = String(body.signerName || "").trim();
  const signatureData = String(body.signatureData || "");

  if (!allowedRole(role)) {
    return json({ ok: false, message: "Invalid role" }, 400);
  }

  if (!signerName || !signatureData.startsWith("data:image/png;base64,")) {
    return json({ ok: false, message: "Invalid signature" }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const signedAt = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO contract_signatures (contract_id, role, signer_name, signature_data, signed_at, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(contract_id, role) DO UPDATE SET
      signer_name = excluded.signer_name,
      signature_data = excluded.signature_data,
      signed_at = excluded.signed_at,
      ip = excluded.ip,
      user_agent = excluded.user_agent
  `).bind("yeosu19-2026-06-19", role, signerName, signatureData, signedAt, ip, userAgent).run();

  return json({
    ok: true,
    signature: {
      role,
      signerName,
      signatureData,
      signedAt,
      ip,
      userAgent,
    },
  });
}
