import { readJson } from "https://deno.land/std@0.167.0/fs/mod.ts"

const content = await Deno.readTextFile("public/Texas_API_Barber_Schools.json")
const data = JSON.parse(content)

console.log("TOTAL ITEMS IN TEXAS API:", data.length)
console.log("FIRST ITEM KEYS:", Object.keys(data[0]))
console.log("FIRST ITEM SAMPLE:")
console.log(JSON.stringify(data[0], null, 2))

// Check if any item in the dataset has a field starting with "email" or containing "@"
let hasEmailKey = false
let hasEmailValue = false
for (const item of data) {
  for (const [k, v] of Object.entries(item)) {
    if (k.toLowerCase().includes("email")) hasEmailKey = true
    if (typeof v === "string" && v.includes("@")) hasEmailValue = true
  }
}
console.log("HAS ANY EMAIL KEY:", hasEmailKey)
console.log("HAS ANY EMAIL VALUE:", hasEmailValue)
