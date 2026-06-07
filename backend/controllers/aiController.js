const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// Fallback rule-based matching when ANTHROPIC_API_KEY is not set
const getFallbackResponse = (userMsg, products) => {
  const m = userMsg.toLowerCase();

  const AI_RESPONSES = {
    greet: [
      "👋 Hi! I'm your Amazon shopping assistant! Ask me about products, deals, or gift ideas.",
      "Hello! Looking for something special today? I can help with product recommendations and deals!"
    ],
    deals: [
      "🔥 Today's hottest deals include electronics up to 40% off, home appliances with huge discounts, and fashion clearance sales! Check the 'Today's Deals' section for live offers."
    ],
    electronics: [
      "📱 Our Electronics section has amazing deals right now! Apple AirPods Pro (40% off), Sony WH-1000XM5 headphones, Samsung 4K TVs, and MacBook Air M3. What are you looking for specifically?"
    ],
    books: [
      "📚 Bestselling books include 'Atomic Habits' by James Clear, 'The Psychology of Money', and 'Fourth Wing'. All available with Prime FREE delivery!"
    ],
    gift: [
      "🎁 Great gift ideas under ₹5,000: Hydro Flask water bottle (₹2,936), LANEIGE lip mask (₹1,176), Anker USB-C cables (₹923), or LEGO sets (₹4,199). Need more specific recommendations?"
    ],
    headphones: [
      "🎧 For headphones I recommend: Sony WH-1000XM5 (₹23,352) for best noise cancellation, or Apple AirPods Pro 2nd Gen (₹15,876) for Apple users. Both have Prime FREE delivery!"
    ],
    price: [
      "💰 You can filter products by price range using the filters on the left sidebar. Prices range from under ₹1,00,00 to premium products above ₹1,00,000."
    ],
    delivery: [
      "🚚 Prime members get FREE delivery on millions of items, often within 1-2 days. Non-Prime orders above ₹499 also get free shipping!"
    ],
    return: [
      "↩️ Amazon has a 10-day return policy for most items. Electronics have a 7-day replacement guarantee. Just visit 'Returns & Orders' in your account."
    ],
    rating: [
      "⭐ Our top-rated products include CeraVe Moisturizing Cream (4.8★), Apple AirPods Pro (4.8★), MacBook Air M3 (4.8★), and Hydro Flask (4.8★)."
    ],
    prime: [
      "⭐ Amazon Prime gives you FREE fast delivery, Prime Video streaming, Prime Music, and early access to Lightning Deals — for just ₹1,499/month!"
    ],
    kitchen: [
      "🍳 Top kitchen picks: Instant Pot Duo 7-in-1 (₹6,716), Ninja Air Fryer (₹6,719), and Cuisinart Food Processor (₹12,596). All best sellers!"
    ],
    sports: [
      "💪 Sports & fitness top picks: Bowflex Adjustable Dumbbells (₹29,316), Hydro Flask Water Bottle (₹2,936). Stay fit at home!"
    ],
    beauty: [
      "💄 Beauty bestsellers: CeraVe Moisturizing Cream (₹1,257) and LANEIGE Lip Sleeping Mask (₹1,176) — both dermatologist recommended!"
    ],
    compare: [
      "🔍 To compare products: I'd suggest checking the ratings, reviews, and feature list. For headphones: Sony XM5 has better noise cancellation, AirPods Pro has better Apple integration."
    ],
    stock: [
      "📦 Most products are in stock. You can see real-time stock availability on each product page. Items showing 'In Stock' ship within 24 hours."
    ],
    default: [
      "I'm here to help! Try asking about specific products, today's deals, gift ideas, or delivery information. 😊",
      "I can help you find the best products! Ask me about electronics, books, fashion, kitchen items, or deals. What are you looking for?"
    ],
  };

  // Match keyword intent
  let intent = 'default';
  if (/hello|hi|hey|namaste/.test(m))                  intent = 'greet';
  else if (/deal|offer|sale|discount|today/.test(m))    intent = 'deals';
  else if (/electr|phone|laptop|tv|camera|tablet/.test(m)) intent = 'electronics';
  else if (/book|read|novel|author/.test(m))            intent = 'books';
  else if (/gift|present|birthday|anniversary/.test(m)) intent = 'gift';
  else if (/headphone|earphone|airpod|earbud/.test(m))  intent = 'headphones';
  else if (/price|cost|budget|cheap|afford/.test(m))    intent = 'price';
  else if (/deliver|shipping|ship|dispatch/.test(m))    intent = 'delivery';
  else if (/return|refund|replace/.test(m))             intent = 'return';
  else if (/rating|rate|review|star|best/.test(m))      intent = 'rating';
  else if (/prime|membership|subscribe/.test(m))        intent = 'prime';
  else if (/kitchen|cook|food|air fry|instant pot/.test(m)) intent = 'kitchen';
  else if (/sport|gym|fitness|exercise|workout/.test(m)) intent = 'sports';
  else if (/beauty|skincare|makeup|cosmetic/.test(m))   intent = 'beauty';
  else if (/compare|versus|vs|difference|better/.test(m)) intent = 'compare';
  else if (/stock|availab|inventory/.test(m))           intent = 'stock';
  else {
    // Try to match product names from catalog
    const match = products.find(p => (p.name || '').toLowerCase().includes(m));
    if (match) {
      return `📦 **${match.name}**\n💰 ₹${Number(match.price).toLocaleString('en-IN')}${match.originalPrice ? ` (was ₹${Number(match.originalPrice).toLocaleString('en-IN')})` : ''}\n⭐ ${match.rating}/5 (${Number(match.numReviews || 0).toLocaleString()} reviews)\n${match.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}\n\nWould you like to add it to cart?`;
    }
  }

  const list = AI_RESPONSES[intent];
  return list[Math.floor(Math.random() * list.length)];
};

// @desc    Get AI Chat response (Claude API / Local fallback)
// @route   POST /api/ai/chat
// @access  Public
const getChatResponse = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400);
    throw new Error('Please provide message history in the body.');
  }

  // Fetch product catalog from database for system instructions context
  const products = await Product.find({}).select('name category price rating brand stock originalPrice numReviews');
  const catalogText = products.map(p => 
    `- ${p.name} (Category: ${p.category}, Price: ₹${p.price}, Rating: ${p.rating}★, Brand: ${p.brand || 'N/A'}, Stock: ${p.stock})`
  ).join('\n');

  const systemPrompt = `You are a helpful, extremely polite, and friendly Amazon India shopping assistant.
Here is the current real-time store catalog of products in our database:
${catalogText}

Use this store catalog to answer queries, recommend items, and compare options for users.
Helpful store details:
- Free delivery on orders above ₹499.
- Amazon Prime membership costs ₹1,499/year or ₹1,499/month (depends on plan) and gives free fast delivery on all items, Prime Video, Prime Music, etc.
- Return/replacement policy: 10-day replacement on most products. 7-day replacement on electronics.
- Secure transactions, 100% authentic items.

Instructions for response:
- Be concise and friendly.
- Format your response nicely using Markdown (bolding, lists, etc.).
- Try to recommend specific products from the catalog that match the user request. Mention their pricing.
- If they ask for something not in the catalog, explain politely that we don't carry that brand/item, and suggest the closest alternative from our catalog.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your_anthropic_api_key_here' || apiKey.startsWith('sk_test_YOUR_')) {
    // Return simulated response with configuration instructions
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const answer = getFallbackResponse(lastUserMsg, products);
    return res.json({
      success: true,
      message: `✨ [DEMO MODE - To enable real Claude responses, configure ANTHROPIC_API_KEY in backend/.env]\n\n${answer}`,
      demoMode: true
    });
  }

  try {
    // Call Anthropic Claude Messages API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Anthropic HTTP Error ${response.status}`);
    }

    const reply = data.content?.[0]?.text || "I'm sorry, I couldn't formulate a response.";
    res.json({
      success: true,
      message: reply
    });

  } catch (err) {
    console.error('Claude API call failed:', err.message);
    // Graceful fallback to local mock on network or API failures
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const answer = getFallbackResponse(lastUserMsg, products);
    res.json({
      success: true,
      message: `⚠️ (API Error: ${err.message}. Showing simulated response)\n\n${answer}`,
      demoMode: true
    });
  }
});

module.exports = { getChatResponse };
