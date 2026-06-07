/* ── ai-assistant.js — Rule-based AI Shopping Assistant ── */
let aiOpen = false;
let chatHistory = [];

const AI_RESPONSES = {
  greet:        ["👋 Hi! I'm your Amazon shopping assistant! Ask me about products, deals, or gift ideas.", "Hello! Looking for something special today? I can help with product recommendations and deals!"],
  deals:        ["🔥 Today's hottest deals include electronics up to 40% off, home appliances with huge discounts, and fashion clearance sales! Check the 'Today's Deals' section for live offers."],
  electronics:  ["📱 Our Electronics section has amazing deals right now! Apple AirPods Pro (40% off), Sony WH-1000XM5 headphones, Samsung 4K TVs, and MacBook Air M3. What are you looking for specifically?"],
  books:        ["📚 Bestselling books include 'Atomic Habits' by James Clear, 'The Psychology of Money', and 'Fourth Wing'. All available with Prime FREE delivery!"],
  gift:         ["🎁 Great gift ideas under ₹5,000: Hydro Flask water bottle (₹2,936), LANEIGE lip mask (₹1,176), Anker USB-C cables (₹923), or LEGO sets (₹4,199). Need more specific recommendations?"],
  headphones:   ["🎧 For headphones I recommend: Sony WH-1000XM5 (₹23,352) for best noise cancellation, or Apple AirPods Pro 2nd Gen (₹15,876) for Apple users. Both have Prime FREE delivery!"],
  price:        ["💰 You can filter products by price range using the filters on the left sidebar. Prices range from under ₹1,000 to premium products above ₹1,00,000."],
  delivery:     ["🚚 Prime members get FREE delivery on millions of items, often within 1-2 days. Non-Prime orders above ₹499 also get free shipping!"],
  return:       ["↩️ Amazon has a 10-day return policy for most items. Electronics have a 7-day replacement guarantee. Just visit 'Returns & Orders' in your account."],
  rating:       ["⭐ Our top-rated products include CeraVe Moisturizing Cream (4.8★), Apple AirPods Pro (4.8★), MacBook Air M3 (4.8★), and Hydro Flask (4.8★)."],
  prime:        ["⭐ Amazon Prime gives you FREE fast delivery, Prime Video streaming, Prime Music, and early access to Lightning Deals — for just ₹1,499/month!"],
  kitchen:      ["🍳 Top kitchen picks: Instant Pot Duo 7-in-1 (₹6,716), Ninja Air Fryer (₹6,719), and Cuisinart Food Processor (₹12,596). All best sellers!"],
  sports:       ["💪 Sports & fitness top picks: Bowflex Adjustable Dumbbells (₹29,316), Hydro Flask Water Bottle (₹2,936). Stay fit at home!"],
  beauty:       ["💄 Beauty bestsellers: CeraVe Moisturizing Cream (₹1,257) and LANEIGE Lip Sleeping Mask (₹1,176) — both dermatologist recommended!"],
  compare:      ["🔍 To compare products: I'd suggest checking the ratings, reviews, and feature list. For headphones: Sony XM5 has better noise cancellation, AirPods Pro has better Apple integration."],
  stock:        ["📦 Most products are in stock. You can see real-time stock availability on each product page. Items showing 'In Stock' ship within 24 hours."],
  default:      ["I'm here to help! Try asking about specific products, today's deals, gift ideas, or delivery information. 😊", "I can help you find the best products! Ask me about electronics, books, fashion, kitchen items, or deals. What are you looking for?"],
};

function matchIntent(msg) {
  const m = msg.toLowerCase();
  if (/hello|hi|hey|namaste/.test(m))              return 'greet';
  if (/deal|offer|sale|discount|today/.test(m))    return 'deals';
  if (/electr|phone|laptop|tv|camera|tablet/.test(m)) return 'electronics';
  if (/book|read|novel|author/.test(m))            return 'books';
  if (/gift|present|birthday|anniversary/.test(m)) return 'gift';
  if (/headphone|earphone|airpod|earbud/.test(m))  return 'headphones';
  if (/price|cost|budget|cheap|afford/.test(m))    return 'price';
  if (/deliver|shipping|ship|dispatch/.test(m))    return 'delivery';
  if (/return|refund|replace/.test(m))             return 'return';
  if (/rating|rate|review|star|best/.test(m))      return 'rating';
  if (/prime|membership|subscribe/.test(m))        return 'prime';
  if (/kitchen|cook|food|air fry|instant pot/.test(m)) return 'kitchen';
  if (/sport|gym|fitness|exercise|workout/.test(m)) return 'sports';
  if (/beauty|skincare|makeup|cosmetic/.test(m))   return 'beauty';
  if (/compare|versus|vs|difference|better/.test(m)) return 'compare';
  if (/stock|availab|inventory/.test(m))           return 'stock';

  // Try to match product names from loaded products
  if (window.allProducts) {
    const match = allProducts.find(p => (p.name || '').toLowerCase().includes(m));
    if (match) return `__product__${match._id || match.id}`;
  }
  return 'default';
}

function getAIResponse(msg) {
  const intent = matchIntent(msg);
  if (intent.startsWith('__product__')) {
    const id = intent.replace('__product__', '');
    const p  = allProducts.find(x => (x._id || x.id) == id);
    if (p) return `📦 **${p.name}**\n💰 ₹${Number(p.price).toLocaleString('en-IN')}${p.originalPrice ? ` (was ₹${Number(p.originalPrice).toLocaleString('en-IN')})` : ''}\n⭐ ${p.rating}/5 (${Number(p.numReviews || 0).toLocaleString()} reviews)\n${p.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}\n\nWould you like to add it to cart?`;
  }
  const responses = AI_RESPONSES[intent] || AI_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

function toggleAI() {
  aiOpen = !aiOpen;
  const chat = document.getElementById('aiChat');
  if (chat) chat.classList.toggle('open', aiOpen);
}

function formatMarkdown(text) {
  // Safe HTML escaping
  let div = document.createElement('div');
  div.textContent = text;
  let html = div.innerHTML;

  // Convert basic markdown formatting
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^\s*-\s+(.*?)$/gm, '• $1<br>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function addAIMessage(text, type = 'bot') {
  const msgs = document.getElementById('aiMessages');
  if (!msgs) return;
  const el = document.createElement('div');
  el.className = `ai-msg ${type}`;
  el.innerHTML = formatMarkdown(text);
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendAI() {
  const input = document.getElementById('aiInput');
  const btn   = document.getElementById('aiSendBtn');
  const q = input?.value?.trim();
  if (!q) return;
  input.value = '';
  if (btn) btn.disabled = true;

  addAIMessage(q, 'user');
  chatHistory.push({ role: 'user', content: q });

  const thinking = document.createElement('div');
  thinking.className = 'ai-msg thinking';
  thinking.textContent = '✨ Thinking...';
  document.getElementById('aiMessages')?.appendChild(thinking);
  document.getElementById('aiMessages').scrollTop = document.getElementById('aiMessages').scrollHeight;

  try {
    const res = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: chatHistory })
    });
    
    thinking.remove();
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    addAIMessage(data.message, 'bot');
    chatHistory.push({ role: 'assistant', content: data.message });
  } catch (err) {
    thinking.remove();
    console.error('Chat error:', err);
    addAIMessage("Sorry, I encountered an error. Please try again.", 'bot');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function quickAsk(q) {
  const input = document.getElementById('aiInput');
  if (input) input.value = q;
  sendAI();
}

window.toggleAI = toggleAI;
window.sendAI   = sendAI;
window.quickAsk = quickAsk;
