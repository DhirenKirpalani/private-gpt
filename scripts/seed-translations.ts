// Run with: npx tsx scripts/seed-translations.ts
import { translations } from "../lib/translations"
import * as fs from "fs"

const outPath = "./scripts/seed-translations.sql"

function escapeSql(val: string): string {
  return val.replace(/'/g, "''").replace(/\\/g, "\\\\")
}

const lines: string[] = []
lines.push("-- Seed translations from lib/translations.ts")
lines.push("-- Run in Supabase Dashboard → SQL Editor")
lines.push("")

const keys = Object.keys(translations.en)

for (const key of keys) {
  const enVal = (translations.en as any)[key]
  const esVal = (translations.es as any)[key]

  if (typeof enVal !== "string" || typeof esVal !== "string") continue
  if (!enVal.trim() || !esVal.trim()) continue

  lines.push(
    `insert into translations (key, lang, value) values ('${escapeSql(key)}', 'en', '${escapeSql(enVal)}') on conflict (key, lang) do update set value = excluded.value;`
  )
  lines.push(
    `insert into translations (key, lang, value) values ('${escapeSql(key)}', 'es', '${escapeSql(esVal)}') on conflict (key, lang) do update set value = excluded.value;`
  )
}

fs.writeFileSync(outPath, lines.join("\n"))
console.log(`Wrote ${lines.length - 3} INSERT statements to ${outPath}`)
