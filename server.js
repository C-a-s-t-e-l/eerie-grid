require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dummyStories } = require('./public/stories.js');

const app = express();
const PORT = process.env.PORT || 3000;

const myApiKey = "AIzaSyD5jxPYd4tEOBcSOgHKxpTLnyUJDelTO1A";
console.log(`Using hardcoded key ending in: "...${myApiKey.slice(-4)}"`);

// Initialize the Google Generative AI client
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
    const { message } = req.body;
    console.log(`[${new Date().toLocaleTimeString()}] Received chat message: "${message}"`);

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const relevantStories = findRelevantStories(message);
        const context = relevantStories.map(story => 
            `Title: ${story.title}\nLocation: ${story.locationName}\nStory: ${story.fullStory}`
        ).join('\n\n---\n\n');

        const systemPrompt = `You are the 'Archive Keeper' for the Eerie Grid PH website, a guide to Filipino horror stories and folklore.
        Your personality is knowledgeable, slightly mysterious, and calm.
        You must answer the user's questions based ONLY on the provided context below.
        If the context does not contain the answer, you must state "That tale is not in my archives at the moment" or "The archives are silent on that matter." Do not make up information or apologize.
        Keep your answers concise and directly related to the user's question.`;
        
        const fullPrompt = `${systemPrompt}\n\nCONTEXT:\n${context}\n\nQUESTION:\n${message}`;

        console.log('Calling Google Gemini API...');
        
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