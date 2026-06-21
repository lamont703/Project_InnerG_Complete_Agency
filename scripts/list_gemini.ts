async function list() {
  const key = Deno.env.get("GEMINI_API_KEY");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  console.log(data.models.map(m => m.name));
}
list();
