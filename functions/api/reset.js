function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const CONTRACT_ID = "yeosu19-2026-06-22-v4";

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, message: "D1 binding DB is not configured" }, 500);
  }

  const body = await request.json().catch(() => ({}));
  if (body.role !== "developer") {
    return json({ ok: false, message: "Only developer link can reset signatures" }, 403);
  }

  if (env.SIGNING_TOKEN && body.token !== env.SIGNING_TOKEN) {
    return json({ ok: false, message: "Invalid signing token" }, 401);
  }

  await env.DB.prepare(`
    DELETE FROM contract_signatures
    WHERE contract_id = ?
       OR contract_id LIKE 'yeosu19-2026-06-22-%'
       OR contract_id = 'yeosu19-2026-06-19'
  `).bind(CONTRACT_ID).run();

  return json({ ok: true });
}
