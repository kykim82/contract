function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const CONTRACT_ID = "yeosu19-2026-06-22-v2";

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ ok: false, message: "D1 binding DB is not configured" }, 500);
  }

  const { results } = await env.DB.prepare(`
    SELECT role, signer_name, signature_data, signed_at, ip, user_agent
    FROM contract_signatures
    WHERE contract_id = ?
  `).bind(CONTRACT_ID).all();

  const signatures = {};
  for (const row of results || []) {
    signatures[row.role] = {
      role: row.role,
      signerName: row.signer_name,
      signatureData: row.signature_data,
      signedAt: row.signed_at,
      ip: row.ip,
      userAgent: row.user_agent,
    };
  }

  return json({ ok: true, signatures });
}
