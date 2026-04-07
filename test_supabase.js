const url = "https://odcyyibcxybcizkxomlc.supabase.co/rest/v1/audit_logs?select=*&order=created_at.desc.nullslast&limit=20";
const key = "sb_publishable_bEm8E_AewzCVnIZR7EJbBA_Rw2--xXN";

fetch(url, {
    headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
    }
}).then(async r => {
    const json = await r.json();
    console.log(r.status, json);
}).catch(console.error);
