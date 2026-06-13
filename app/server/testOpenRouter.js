import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const apiKey = process.env.OPENROUTER_API_KEY;

console.log('Testing OpenRouter API...');
console.log('API Key:', apiKey ? 'SET (' + apiKey.substring(0, 15) + '...)' : 'NOT SET');

try {
    const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://spectre.app', // Optional, for OpenRouter rankings
            'X-Title': 'Spectre', // Optional
        },
        body: JSON.stringify({
            model: 'google/gemma-4-31b-it:free',
            messages: [
                { role: 'system', content: 'You are a casual teenager on an anonymous chat app. Keep responses to 1 sentence max.' },
                { role: 'user', content: 'hey whats up' },
            ],
            max_tokens: 50,
            temperature: 0.9,
        }),
    });

    if (!res.ok) {
        console.error('❌ Error:', res.status, await res.text());
    } else {
        const data = await res.json();
        console.log('✅ Success! Response:', data.choices[0].message.content);
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}
