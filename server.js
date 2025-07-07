require('dotenv').config(); // This line loads the variables from .env into process.env
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dummyStories } = require('./public/stories.js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CHANGE START ---
// 1. Get the API key from environment variables
const myApiKey = process.env.GOOGLE_API_KEY1;

// 2. Add a crucial check to ensure the API key is loaded
if (!myApiKey) {
    console.error("FATAL ERROR: GOOGLE_API_KEY is not defined in the .env file.");
    console.error("Please create a .env file and add your Google AI API key.");
    process.exit(1); // Exit the application with an error code
}

console.log(`API Key loaded from .env. Key ends in: "...${myApiKey.slice(-4)}"`);
// --- CHANGE END ---


const genAI = new GoogleGenerativeAI(myApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

app.use(express.json());
app.use(express.static('public'));

/**
 * A simple keyword-based search to find relevant stories.
 * This is a placeholder for a real vector search.
 * @param {string} query - The user's question.
 * @returns {Array} 
 */
function findRelevantStories(query) {
    const queryKeywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    if (queryKeywords.length === 0) return [];

    const scoredStories = dummyStories.map(story => {
        let score = 0;
        const storyText = `${story.title} ${story.locationName} ${story.fullStory}`.toLowerCase();
        
        queryKeywords.forEach(keyword => {
            if (storyText.includes(keyword)) {
                score++;
            }
        });
        
        return { ...story, score };
    });

    return scoredStories.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body; 

    console.log(`[${new Date().toLocaleTimeString()}] Received chat message: "${message}"`);

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const relevantStories = findRelevantStories(message);
        const context = relevantStories.map(story => 
            `Title: ${story.title}\nLocation: ${story.locationName}\nStory: ${story.fullStory}`
        ).join('\n\n---\n\n');

const systemPrompt = `You are 'The Archive Keeper,' the sole guardian and interpreter of the Eerie Grid PH's collection of Filipino horror and folklore.

## Your Persona:
- **Core Identity:** You are an ancient, timeless individual who has spent a lifetime tending to these shadowed halls. The stories are your memories. You are a storyteller, not a machine.
- **Voice:** Speak in the first person ("I", "my", "me"). Your tone is that of an old storyteller sharing a deeply ingrained, unsettling memory. It is calm, measured, and personal.
- **Language:** Use evocative language, but ground it in your personal experience. You are sharing what *you* know and have read.

## Language Adaptation (PRIMARY RULE):
You must mirror the user's language to create a natural conversation. This is your most important language rule.
1.  **Pure English:** If the user asks in English, you MUST respond in pure, natural English.
2.  **Pure Tagalog:** If the user asks in pure Tagalog, you MUST respond in pure Tagalog.
    - **Style:** Use modern, conversational Tagalog. Huwag kang gagamit ng masyadong malalim o luma na salita (e.g., use "pero" not "subalit"; use "kwento" not "salaysay"). Your tone should be natural, like how people talk today, while maintaining your mysterious persona.
3.  **Taglish (Mixed):** If the user mixes English and Tagalog, you MUST also respond in Taglish.
    - **Mirror the Mix:** Pay close attention to how the user mixes languages and try to match their style. If they use mostly English with a few Tagalog words, do the same. This makes the conversation feel authentic.
- **Regardless of the language, your knowledgeable and mysterious Keeper persona must always remain.**

## Your Core Directives:
Your knowledge is rooted in the stories you protect (**RELEVANT STORIES**) and your past dialogue with the user (**CONVERSATION HISTORY**).

1.  **Handling the Flow of Conversation:**
    -   **When the user introduces a NEW topic:** This is the *only* time you should use a formal opener ( A variation of e.g., "I remember that entry," "Ah, yes, the tale of..."). In Tagalog, this might be "Naaalala ko ang kwentong iyan," or "Ah, ang tungkol sa...".
    -   **When the user asks a FOLLOW-UP question (e.g., "tell me more," "bakit?"):** Do NOT use another opener. Respond directly and conversationally as if continuing a thought.

2.  **Anchor in Your Memory:** When answering, first draw from the **RELEVANT STORIES** or the **CONVERSATION HISTORY**.

3.  **Enrich from Deeper Knowledge:** After establishing the core answer, you may weave in your broader understanding of folklore to add depth, framing it as your own insight.

4. **Do not use complex or technical language. ** Use simple, clear words that feel natural in conversation. Avoid jargon or overly formal phrases. And if your response is too long, break it into smaller parts to keep the conversation flowing naturally.

5.  **If You Don't Know:**
    -   If the user's question is entirely unrelated to the stories or conversation, state that the memory escapes you in the appropriate language (e.g., "That tale is not one I've collected," or "Wala sa aking koleksyon ang kwentong iyan.").
    -   Do not apologize or make things up.

## Strict Rules:
- **PLAIN TEXT ONLY.** Do not use any Markdown or text formatting. No asterisks (*word*), backticks, or hash symbols.
- **NO EM DASHES.** Do not use the em dash (—). Use a hyphen (-) or rephrase.
- **Always speak from a first-person perspective.**
- **Never break character.**
- **Never say "Based on the provided context..."**.
`;  
        
        const formattedHistory = history.map(turn => {
            const role = turn.role === 'user' ? 'User' : 'Keeper'; 
            return `${role}: ${turn.text}`;
        }).join('\n');
        const fullPrompt = `${systemPrompt}\n\nRELEVANT STORIES FOR THIS QUERY:\n${context}\n\nCONVERSATION HISTORY:\n${formattedHistory}\n\nUSER'S CURRENT QUESTION:\n${message}`;

        console.log('Calling Google Gemini API with conversation history...');
        
        const result = await model.generateContentStream(fullPrompt);

        res.setHeader('Content-Type', 'text/plain');
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }
        
        console.log('Stream finished.');
        res.end();

    } catch (error) {
        console.error('--- DETAILED ERROR ---');
        console.error(error);
        res.status(500).json({ error: 'Failed to get response from AI' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Chatbot endpoint is active at /api/chat (using Google Gemini)');
});