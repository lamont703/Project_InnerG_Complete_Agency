require("dotenv").config({ path: ".env.local" });
async function run() {
  const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent("1000 Northside Drive NW Atlanta Georgia 30318")}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
  const geoData = await geoRes.json();
  console.log(geoData);
}
run();
