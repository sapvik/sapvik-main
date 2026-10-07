export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    // Honeypot check
    if (data.website_url_hp) {
      return new Response(JSON.stringify({ ok: true, lead_id: "SUB-BOT-DISCARD" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const { name, phone, email, business, website, service, details, utm, audit } = data;

    if (!name || !phone || !email || !email.includes('@')) {
      return new Response(JSON.stringify({ ok: false, message: "Missing required contact details." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const leadId = `SAPVIK-${Date.now()}`;

    // If Brevo API key is configured in Cloudflare environment
    const brevoKey = context.env.BREVO_API_KEY;
    if (brevoKey) {
      // 1. Create or update contact in Brevo
      try {
        await fetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers: {
            "api-key": brevoKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            attributes: {
              FIRSTNAME: name,
              SMS: phone,
              COMPANY: business || "",
              WEBSITE: website || "",
              SERVICE: service || "all",
              MESSAGE: details || ""
            },
            updateEnabled: true
          })
        });
      } catch (brevoErr) {
        console.error("Brevo contact sync error:", brevoErr);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      lead_id: leadId,
      message: "Audit request received successfully."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, message: "Invalid request payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
