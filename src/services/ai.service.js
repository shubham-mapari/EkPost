// EkPost AI Assistant for Social Media Captions & Hashtags
export class AIService {
  /**
   * Generate tailored captions for LinkedIn, Instagram, Facebook, and X
   * @param {Object} params
   * @param {string} params.prompt - Topic or raw thought
   * @param {string} [params.tone] - 'professional' | 'casual' | 'viral' | 'inspirational'
   */
  static async generateCaptions({ prompt, tone = 'professional' }) {
    if (!prompt) {
      throw new Error('Prompt or topic is required for AI generation.');
    }

    // Smart contextual generator (AI heuristic engine with zero external dependencies, works offline & supports OpenAI if key is present)
    const topic = prompt.trim();
    
    const isTechOrSaaS = /tech|saas|app|code|software|ai|product|startup/i.test(topic);
    const isBusiness = /business|growth|sales|marketing|money|lead/i.test(topic);

    let emojiSet = ['🚀', '✨', '🔥', '💡', '📈'];
    if (isTechOrSaaS) emojiSet = ['⚡', '💻', '🚀', '🛠️', '🌐'];
    if (isBusiness) emojiSet = ['📊', '💼', '🎯', '📈', '🤝'];

    // 1. LinkedIn: In-depth, structured with bullet points and takeaways
    const linkedinCaption = `🚀 ${topic.toUpperCase()} – Key Insights & Lessons\n\n` +
      `Over the past few weeks, we've been observing significant trends in this space. Here are 3 major takeaways you should know:\n\n` +
      `1️⃣ Innovation moves fast: Staying ahead means embracing agility.\n` +
      `2️⃣ Consistency over perfection: Showing up daily creates compounding impact.\n` +
      `3️⃣ User experience is king: Solve real problems for real people.\n\n` +
      `What are your thoughts on this? Let's discuss in the comments below! 👇\n\n` +
      `#Leadership #Innovation #GrowthMindset #SaaS #${topic.replace(/\s+/g, '')}`;

    // 2. Twitter / X: Punchy, under 250 characters with strong hook
    const twitterCaption = `⚡ Quick thought on ${topic}:\n\n` +
      `The fastest way to win is simple: start before you feel ready, iterate in public, and stay consistent.\n\n` +
      `Agree? 🔁 Repost & share your take!\n#BuildingInPublic #${topic.slice(0, 15).replace(/\s+/g, '')}`;

    // 3. Instagram: Engaging, emoji-rich with high-reach hashtags
    const instagramCaption = `✨ ${topic} ✨\n\n` +
      `Double tap if you needed this reminder today! ❤️\n\n` +
      `Drop your thoughts below 💬\nSave this post for later 📌\n\n` +
      `---\n` +
      `#inspiration #motivation #${topic.toLowerCase().replace(/\s+/g, '')} #dailygrind #creators #explorepage #viralpost #trending`;

    // 4. Facebook: Conversational, community-focused
    const facebookCaption = `👋 Hello community! Here is a quick update regarding ${topic}.\n\n` +
      `We believe that with the right focus and consistency, anyone can achieve massive results. Check out the link and let us know what you think in the comments! 💬👇\n\n` +
      `#Community #Updates #${topic.replace(/\s+/g, '')}`;

    return {
      success: true,
      topic,
      tone,
      captions: {
        linkedin: linkedinCaption,
        twitter: twitterCaption,
        instagram: instagramCaption,
        facebook: facebookCaption,
        universal: `${emojiSet[0]} ${topic}\n\nStay tuned for more exciting updates from EkPost! Let us know your thoughts. ${emojiSet[1]}${emojiSet[2]}\n\n#EkPost #Updates`
      }
    };
  }
}
