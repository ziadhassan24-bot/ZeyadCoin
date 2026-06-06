// test-rate-limit.js — Spam /api/tasks to trigger the rate limiter.
// Run this with: node test-rate-limit.js

const API_URL = "http://localhost:3001/api/tasks";

async function spamTasks() {
  console.log("🚀 Starting rate limit test: sending 25 requests to /api/tasks\n");
  
  for (let i = 1; i <= 25; i++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "JavaScript" }),
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        console.log(`❌ Request ${i}: Rate limited (429)`);
        console.log(`   Message: ${data.message}`);
      } else if (res.ok) {
        console.log(`✅ Request ${i}: Success (${res.status})`);
      } else {
        console.log(`⚠️  Request ${i}: Error (${res.status})`);
        console.log(`   Message: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.log(`💥 Request ${i}: Network error`);
      console.log(`   ${err.message}`);
    }
    
    // Small delay to avoid overwhelming the server or event loop
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log("\n✅ Test complete. First 20 should succeed, 21-25 should be rate-limited (429).");
}

spamTasks();
