/**
 * Test rapid — verifică dacă Anthropic API acceptă server-side web_search tool.
 * Rulare: npx tsx scripts/test-anthropic-websearch.ts
 */
import "dotenv/config"
import Anthropic from "@anthropic-ai/sdk"

;(async () => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search_20250305" as any,
          name: "web_search",
          max_uses: 2,
        } as any,
      ],
      messages: [
        {
          role: "user",
          content: "Care e CEO-ul curent Hays Romania (2025)? Folosește web_search. Răspunde într-o propoziție.",
        },
      ],
    })

    console.log("✅ Tool name 'web_search_20250305' ACCEPTAT")
    console.log()
    console.log("Content blocks:")
    for (const block of response.content) {
      const b: any = block
      console.log(`  type=${b.type}${b.name ? " name=" + b.name : ""}`)
      if (b.type === "text") console.log(`    text: ${b.text.slice(0, 200)}`)
      if (b.type === "server_tool_use") console.log(`    input: ${JSON.stringify(b.input).slice(0, 150)}`)
      if (b.type === "web_search_tool_result") {
        const content = Array.isArray(b.content) ? b.content : []
        console.log(`    results: ${content.length} entries`)
      }
    }
    console.log()
    console.log(`Stop reason: ${response.stop_reason}`)
    console.log(`Usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`)
  } catch (e: any) {
    console.log("❌ Eroare:", e.message)
    if (e.status) console.log("   HTTP status:", e.status)
  }
})()
