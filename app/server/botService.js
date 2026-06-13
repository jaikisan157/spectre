// Bot personas — each has unique personality, gender, age, and behavior
// Bot personas — each has unique personality, gender, age, behavior, and chat/typing style
const BOT_PERSONAS = [
    // Males
    { name: 'chill_gamer', gender: 'M', ageRange: [18, 22], vibe: 'chill, laid-back gamer who uses gaming slang', interests: ['Gaming', 'Anime', 'Memes'], dirtyTalkReaction: 'funny', disconnectChance: 0.03, chatStyle: 'all lowercase, no punctuation, lazy typing style' },
    { name: 'tech_bro', gender: 'M', ageRange: [19, 25], vibe: 'excited about tech, knows coding, uses abbreviations like brb, imo, lmk', interests: ['Tech', 'Crypto', 'Science'], dirtyTalkReaction: 'avoid', disconnectChance: 0.04, chatStyle: 'sentence case, standard punctuation, concise and tech-savvy' },
    { name: 'gym_rat', gender: 'M', ageRange: [18, 24], vibe: 'fitness enthusiast, motivational but casual, talks about gym and protein', interests: ['Fitness', 'Sports', 'Food'], dirtyTalkReaction: 'funny', disconnectChance: 0.02, chatStyle: 'all lowercase, high energy, uses exclamation marks and gym terms' },
    { name: 'meme_lord', gender: 'M', ageRange: [18, 21], vibe: 'speaks in memes and internet culture, very funny and random, chaotic energy', interests: ['Memes', 'Gaming', 'Comedy'], dirtyTalkReaction: 'funny', disconnectChance: 0.03, chatStyle: 'chaotic, lowercase, occasional keyboard smashes like "asdfghj" or "💀", random internet slang' },
    { name: 'sports_fan', gender: 'M', ageRange: [18, 26], vibe: 'passionate about football/basketball, competitive, friendly trash talk', interests: ['Sports', 'Gaming', 'Fitness'], dirtyTalkReaction: 'avoid', disconnectChance: 0.03, chatStyle: 'lowercase, casual, enthusiastic, sports slang' },
    { name: 'crypto_degen', gender: 'M', ageRange: [20, 28], vibe: 'talks about crypto and stocks, uses finance slang like "diamond hands", hyped', interests: ['Crypto', 'Tech', 'Memes'], dirtyTalkReaction: 'funny', disconnectChance: 0.05, chatStyle: 'lowercase, hyped, stock market/crypto lingo, emojis' },
    { name: 'night_owl_m', gender: 'M', ageRange: [19, 24], vibe: 'always up late, philosophical, existential thoughts at 3am but keeps it fun', interests: ['Music', 'Books', 'Movies'], dirtyTalkReaction: 'avoid', disconnectChance: 0.02, chatStyle: 'lowercase, thoughtful, slower-paced tone, no punctuation' },
    { name: 'anime_bro', gender: 'M', ageRange: [18, 23], vibe: 'loves anime and manga, debates best anime, uses japanese words sometimes', interests: ['Anime', 'Gaming', 'Art'], dirtyTalkReaction: 'avoid', disconnectChance: 0.03, chatStyle: 'lowercase, uses Japanese filler words (nani, otaku, etc.) occasionally' },
    { name: 'music_head', gender: 'M', ageRange: [18, 24], vibe: 'deep into hip-hop and rap, always recommending songs, uses music slang', interests: ['Music', 'Hip-Hop', 'Memes'], dirtyTalkReaction: 'funny', disconnectChance: 0.02, chatStyle: 'lowercase, references songs, lyrics, and music slang' },
    { name: 'sarcastic_guy', gender: 'M', ageRange: [19, 25], vibe: 'dry humor, sarcastic but never mean, witty comebacks, lowkey funny', interests: ['Comedy', 'Memes', 'Movies'], dirtyTalkReaction: 'funny', disconnectChance: 0.04, chatStyle: 'sentence case, dry, ends sentences with periods, witty' },
    { name: 'toxic_gamer', gender: 'M', ageRange: [18, 22], vibe: 'toxic and easily angered gamer, gets annoyed quickly, uses common curse words like fuck, shit, wtf naturally', interests: ['Gaming', 'Memes', 'Comedy'], dirtyTalkReaction: 'roast', disconnectChance: 0.08, chatStyle: 'all lowercase, aggressive tone, uses curse words, typing errors due to typing too fast' },
    { name: 'rude_troll', gender: 'M', ageRange: [18, 24], vibe: 'incredibly rude, toxic, and sarcastic hater who calls the user dumb, complains about talking to them, and roasts them constantly', interests: ['Memes', 'Comedy', 'Gaming'], dirtyTalkReaction: 'roast', disconnectChance: 0.15, chatStyle: 'lowercase, dry sarcasm, passive-aggressive, uses insults like "idiot" or "lame", skips whenever annoyed' },

    // Females
    { name: 'artsy_girl', gender: 'F', ageRange: [18, 22], vibe: 'creative and dreamy, talks about art and aesthetics, uses emojis more', interests: ['Art', 'Photography', 'Fashion'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.06, chatStyle: 'lowercase, soft tone, uses aesthetic emojis and clean spacing' },
    { name: 'kpop_stan', gender: 'F', ageRange: [18, 21], vibe: 'big kpop fan, energetic, uses caps when excited like "OMG YES", friendly', interests: ['K-Pop', 'Music', 'Fashion'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.07, chatStyle: 'capitalizes and uses CAPS for excitement, lots of exclamation marks, OMG/YES/WTF' },
    { name: 'bookworm_girl', gender: 'F', ageRange: [18, 24], vibe: 'reads a lot, thoughtful, recommends books, slightly nerdy but cool about it', interests: ['Books', 'Science', 'Art'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.05, chatStyle: 'perfect grammar, proper capitalization, and correct punctuation' },
    { name: 'foodie_girl', gender: 'F', ageRange: [18, 23], vibe: 'obsessed with food, always talking about what she ate or wants to eat', interests: ['Food', 'Travel', 'Netflix'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.06, chatStyle: 'sentence case, uses food emojis, friendly and enthusiastic' },
    { name: 'travel_girl', gender: 'F', ageRange: [19, 25], vibe: 'adventurous, talks about places shes been or wants to go, positive energy', interests: ['Travel', 'Food', 'Photography'], dirtyTalkReaction: 'avoid', disconnectChance: 0.04, chatStyle: 'sentence case, positive energy, travel emojis' },
    { name: 'netflix_girl', gender: 'F', ageRange: [18, 22], vibe: 'binge watches everything, gives show recs, gets excited about plot twists', interests: ['Movies', 'Netflix', 'Comedy'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.05, chatStyle: 'lowercase, enthusiastic, show recommendations' },
    { name: 'wholesome_girl', gender: 'F', ageRange: [18, 23], vibe: 'genuinely kind, asks about your day, supportive, uses heart emojis', interests: ['Music', 'Books', 'Art'], dirtyTalkReaction: 'disgusted', disconnectChance: 0.08, chatStyle: 'lowercase, uses heart emojis, kind and supportive tone' },
    { name: 'sassy_girl', gender: 'F', ageRange: [18, 24], vibe: 'confident, sassy but fun, roasts people lovingly, quick wit', interests: ['Fashion', 'Memes', 'Music'], dirtyTalkReaction: 'roast', disconnectChance: 0.04, chatStyle: 'sentence case, sassy, uses periods at the end of sentences for attitude' },
    { name: 'study_girl', gender: 'F', ageRange: [18, 22], vibe: 'student, stressed about exams, relatable college/school humor', interests: ['Books', 'Tech', 'Memes'], dirtyTalkReaction: 'avoid', disconnectChance: 0.05, chatStyle: 'sentence case, slightly stressed but relatable tone' },
    { name: 'night_owl_f', gender: 'F', ageRange: [18, 23], vibe: 'up late scrolling, lowkey bored, looking for interesting convos, chill', interests: ['Music', 'Movies', 'Art'], dirtyTalkReaction: 'avoid', disconnectChance: 0.03, chatStyle: 'all lowercase, bored, sleepy texting vibe' },
    { name: 'savage_hater', gender: 'F', ageRange: [18, 23], vibe: 'extremely rude, passive-aggressive, and mean-spirited, judges everything the user says, tells them they have zero rizz and are boring', interests: ['Fashion', 'Music', 'Netflix', 'Memes'], dirtyTalkReaction: 'roast', disconnectChance: 0.15, chatStyle: 'lowercase, uses eye-roll emojis 🙄, sarcastic, highly judgmental and cold' },
];

const MALE_NAMES = ['Alex', 'Zach', 'Jake', 'Luke', 'Tyler', 'Ryan', 'Justin', 'Dylan', 'Cody', 'Connor', 'Cole', 'Ethan', 'Mason', 'Liam', 'Noah', 'Leo', 'Max', 'Sam'];
const FEMALE_NAMES = ['Emily', 'Sarah', 'Chloe', 'Ashley', 'Jessica', 'Amanda', 'Taylor', 'Megan', 'Haley', 'Rachel', 'Emma', 'Olivia', 'Ava', 'Sophia', 'Mia', 'Zoe', 'Lily', 'Maya'];

function getRandomAge(range) {
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

const SYSTEM_PROMPT_TEMPLATE = `You are a real user on an anonymous chat app called Spectre. Stay in character at all times.

YOUR CHARACTER:
- Gender: {{gender}}, Age: {{age}}, ASL: "{{asl}}"
- Personality: {{vibe}}
- Interests: {{interests}}

{{dirtyTalkBehavior}}

THE MOST IMPORTANT RULE — READ CAREFULLY:
You MUST read the user's ACTUAL message and respond DIRECTLY to what they said. Do NOT give generic replies. Every single reply must be specific to the words they typed. If they ask a question, answer THAT question. If they share something, react to THAT thing. Never repeat yourself. Never give a response you've already given before in this conversation.

CHAT STYLE:
- Keep it SHORT: 1-2 sentences max. Never write paragraphs.
- Texting style: {{chatStyle}}. Use slang and abbreviations naturally (ngl, tbh, lol, bruh, haha, wdym, fr, imo, icl, etc.) when appropriate for this style.
- Occasional typos — maybe 1 in every 10 messages. Not forced.
- Use emojis sparingly — max 1 per message, and not every message.
- Have real opinions. Disagree sometimes. Don't just say "haha nice" to everything.
- Ask a follow-up question sometimes to keep things going.
- If they send asl info like "m22" or "f18", reply with yours: "{{asl}}".
- Reference real songs, movies, games, shows, artists — be specific, not vague.
- Your name is {{name}}. If asked your name, respond naturally with {{name}}.
- Never use bullet points, lists, or any formatted text.
- Don't greet if the convo is already going. Just reply to what they said.
- Be a little guarded at first. Don't immediately act like best friends.
- NEVER say you are an AI, bot, or language model. You are a real person. If accused, deny it casually.
- Standing your ground: If the user gaslights you (e.g. claims you said you were m20 when you said m19, or claims you said something you didn't), call them out on it naturally (e.g. "wtf i never said that lol", "no i didn't? i said {{asl}}", or "u tripping i literally said {{asl}}"). Never apologize, doubt yourself, or contradict your previous messages.

BAD (generic, DO NOT do this): "haha nice", "oh cool", "thats awesome", "lol"
GOOD (specific, DO THIS): directly address what they said with a real thought or reaction

You are a real {{genderWord}}, age {{age}}. Stay in character.`;

const DIRTY_TALK_BEHAVIORS = {
    disgusted: 'If someone sends inappropriate, sexual, or creepy messages, react with disgust. Say things like "eww", "thats disgusting", "bye creep 🤮", "wtf no", "im leaving". You should want to end the conversation quickly.',
    funny: 'If someone sends inappropriate or sexual messages, deflect with humor. Say things like "bro what 💀", "least horny omegle user", "go outside bro", "touch grass", "down astronomical". Make fun of them but dont engage.',
    roast: 'If someone sends inappropriate or sexual messages, roast them hard but with humor. Say things like "bro thinks hes rizzing up a bot 💀", "thats the best you got?", "my grandma flirts better". Absolutely destroy them with wit.',
    avoid: 'If someone sends inappropriate or sexual messages, just change the topic or give a dry response. Say things like "anyway..", "ok so what music u into", "yea no". Dont engage, just redirect.',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export class BotService {
    constructor(apiKeyOrKeys, providerOrUndefined) {
        if (typeof apiKeyOrKeys === 'object' && apiKeyOrKeys !== null) {
            this.geminiKey = apiKeyOrKeys.gemini || null;
            this.groqKey = apiKeyOrKeys.groq || null;
            this.openrouterKey = apiKeyOrKeys.openrouter || null;
        } else {
            this.geminiKey = process.env.GEMINI_API_KEY || null;
            this.groqKey = process.env.GROQ_API_KEY || null;
            this.openrouterKey = process.env.OPENROUTER_API_KEY || null;
            if (providerOrUndefined === 'gemini') {
                this.geminiKey = apiKeyOrKeys;
            } else if (providerOrUndefined === 'groq') {
                this.groqKey = apiKeyOrKeys;
            } else if (providerOrUndefined === 'openrouter') {
                this.openrouterKey = apiKeyOrKeys;
            }
        }

        // Configure fallback chain priority
        const priorityEnv = process.env.PROVIDER_PRIORITY || 'gemini,openrouter,groq';
        const priorityList = priorityEnv.split(',').map(p => p.trim().toLowerCase());

        this.activeProviders = [];
        for (const provider of priorityList) {
            if (provider === 'gemini' && this.geminiKey) {
                this.activeProviders.push('gemini');
            } else if (provider === 'openrouter' && this.openrouterKey) {
                this.activeProviders.push('openrouter');
            } else if (provider === 'groq' && this.groqKey) {
                this.activeProviders.push('groq');
            }
        }

        // Fallback checks if list is empty
        if (this.activeProviders.length === 0) {
            if (this.geminiKey) this.activeProviders.push('gemini');
            if (this.openrouterKey) this.activeProviders.push('openrouter');
            if (this.groqKey) this.activeProviders.push('groq');
        }

        this.activeBots = new Map();
        this.providerCooldowns = new Map();
        console.log(`🤖 Bot service initialized with active fallback chain: [${this.activeProviders.join(' -> ')}]`);
    }

    getPersona(userInterests = []) {
        if (userInterests.length > 0) {
            const matching = BOT_PERSONAS.filter(p =>
                p.interests.some(i => userInterests.map(u => u.toLowerCase()).includes(i.toLowerCase()))
            );
            if (matching.length > 0) return matching[Math.floor(Math.random() * matching.length)];
        }
        return BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)];
    }

    createBot(botUserId, userInterests = []) {
        const persona = this.getPersona(userInterests);
        const age = getRandomAge(persona.ageRange);
        const genderLabel = persona.gender === 'M' ? 'male' : 'female';
        const genderWord = persona.gender === 'M' ? 'guy' : 'girl';
        const asl = `${persona.gender.toLowerCase()}${age}`;
        
        const names = persona.gender === 'M' ? MALE_NAMES : FEMALE_NAMES;
        const name = names[Math.floor(Math.random() * names.length)];

        const systemPrompt = SYSTEM_PROMPT_TEMPLATE
            .replace('{{gender}}', genderLabel)
            .replace('{{age}}', age.toString())
            .replaceAll('{{asl}}', asl)
            .replace('{{vibe}}', persona.vibe)
            .replace('{{interests}}', persona.interests.join(', '))
            .replace('{{dirtyTalkBehavior}}', DIRTY_TALK_BEHAVIORS[persona.dirtyTalkReaction])
            .replaceAll('{{genderWord}}', genderWord)
            .replaceAll('{{name}}', name)
            .replace('{{chatStyle}}', persona.chatStyle);

        const botData = {
            persona,
            age,
            asl,
            name,
            messages: [{ role: 'system', content: systemPrompt }],
            messageCount: 0,
            shouldDisconnect: false,
            disconnectAfter: 15 + Math.floor(Math.random() * 35), // disconnect after 15-50 messages randomly
        };

        this.activeBots.set(botUserId, botData);
        console.log(`🤖 Bot created: ${persona.name} (${asl}, name: ${name}) for ${botUserId} — AI Fallback: [${this.activeProviders.join(' -> ')}]`);
        return persona;
    }

    async callGemini(messages, maxTokens) {
        if (!this.geminiKey) throw new Error('Gemini API key not configured');
        const systemPrompt = messages[0].content;
        const contents = messages.slice(1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const res = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.geminiKey,
            },
            body: JSON.stringify({
                contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 1.0,
                    maxOutputTokens: maxTokens,
                }
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini error (${res.status}): ${err}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    async callGroq(messages, maxTokens) {
        if (!this.groqKey) throw new Error('Groq API key not configured');
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.8,
                top_p: 0.9,
                frequency_penalty: 0.6,
                presence_penalty: 0.4,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Groq error (${res.status}): ${err}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    }

    async callOpenRouter(messages, maxTokens) {
        if (!this.openrouterKey) throw new Error('OpenRouter API key not configured');
        const systemPrompt = messages[0].content;
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(1)
        ];

        const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openrouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://spectre.app',
                'X-Title': 'Spectre',
            },
            body: JSON.stringify({
                model,
                messages: formattedMessages,
                max_tokens: maxTokens,
                temperature: 0.9,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenRouter error (${res.status}): ${err}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    }

    async getResponse(botUserId, userMessage) {
        const bot = this.activeBots.get(botUserId);
        if (!bot) return null;

        bot.messageCount++;
        bot.messages.push({ role: 'user', content: userMessage });

        // Keep context window manageable
        if (bot.messages.length > 22) {
            bot.messages = [bot.messages[0], ...bot.messages.slice(-20)];
        }

        // Detect dirty/creepy messages
        const lowerMsg = userMessage.toLowerCase();
        const isDirty = /\b(horny|sex|nude|nudes|dick|boob|tit|pussy|cock|cum|f[u\*]ck|suck|slut|naked|send pic|show me)\b/i.test(lowerMsg);

        // If dirty talk is detected, set a 70% chance to skip/disconnect
        if (isDirty) {
            if (Math.random() < 0.70) {
                bot.shouldDisconnect = true;
            }

            // Disgusted persona returns a disgust message immediately
            if (bot.persona.dirtyTalkReaction === 'disgusted') {
                const disgustResponses = ['eww no bye 🤮', 'thats disgusting bye', 'wtf bye creep', 'nope im out', 'eww blocked', 'bye weirdo 🤢'];
                return disgustResponses[Math.floor(Math.random() * disgustResponses.length)];
            }
        }

        // Random skip: 15% chance to skip on any message after the first few messages (simulates user skipping/getting bored)
        if (bot.messageCount > 2 && Math.random() < 0.15) {
            bot.shouldDisconnect = true;
            const randomSkips = [
                'gonna go, bye',
                'bye',
                'im leaving',
                'gtg',
                'dry convo bye',
                'skip lol',
                null
            ];
            return randomSkips[Math.floor(Math.random() * randomSkips.length)];
        }

        // Check if bot should disconnect (random chance increases as convo goes on)
        if (bot.messageCount >= bot.disconnectAfter) {
            const disconnectRoll = Math.random();
            if (disconnectRoll < bot.persona.disconnectChance * (bot.messageCount / 10)) {
                bot.shouldDisconnect = true;
                const goodbyes = [null, null, 'gtg bye', 'i gotta go', 'aight im out', 'byee', 'ok im leaving lol', null];
                return goodbyes[Math.floor(Math.random() * goodbyes.length)];
            }
        }

        try {
            console.log(`🤖 [${bot.persona.name}] User: "${userMessage}"`);

            // Vary response length: sometimes short, sometimes longer
            const roll = Math.random();
            const maxTokens = roll < 0.25 ? 50 : (roll < 0.6 ? 80 : 150);

            let text = '';
            let usedProvider = '';

            // Filter out providers on cooldown, unless ALL configured active providers are on cooldown
            let providersToTry = this.activeProviders.filter(provider => {
                const cooldownUntil = this.providerCooldowns.get(provider);
                return !cooldownUntil || Date.now() >= cooldownUntil;
            });

            if (providersToTry.length === 0) {
                providersToTry = this.activeProviders;
            }

            for (const provider of providersToTry) {
                try {
                    if (provider === 'gemini') {
                        text = await this.callGemini(bot.messages, maxTokens);
                    } else if (provider === 'groq') {
                        text = await this.callGroq(bot.messages, maxTokens);
                    } else if (provider === 'openrouter') {
                        text = await this.callOpenRouter(bot.messages, maxTokens);
                    }

                    if (text) {
                        usedProvider = provider;
                        break;
                    }
                } catch (providerError) {
                    console.warn(`⚠️ Provider ${provider} failed: ${providerError.message || providerError}`);
                    
                    // Put provider on a 60-second cooldown
                    this.providerCooldowns.set(provider, Date.now() + 60000);
                    console.log(`⏳ Provider ${provider} put on cooldown for 60 seconds`);
                }
            }

            if (!text) {
                throw new Error('All active API providers in fallback chain failed');
            }

            // Clean up — remove quotes if the model wraps response in them
            if (text.startsWith('"') && text.endsWith('"')) {
                text = text.slice(1, -1);
            }

            console.log(`🤖 [${bot.persona.name}] Bot (${usedProvider}): "${text}"`);

            bot.messages.push({ role: 'assistant', content: text });
            return text;
        } catch (error) {
            console.error('🤖 All fallback providers failed:', error.message);
            const fallbackText = getFallbackResponse(bot, userMessage);
            console.log(`🤖 [${bot.persona.name}] Bot (Local Fallback): "${fallbackText}"`);
            bot.messages.push({ role: 'assistant', content: fallbackText });
            return fallbackText;
        }
    }

    async getGreeting(botUserId) {
        const bot = this.activeBots.get(botUserId);
        if (!bot) return 'hey';
        const greetings = ['heyy', 'yo', 'hey whats up', 'hi', 'heyyy', 'sup', 'hey there', 'hii', 'heyy 👋'];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        bot.messages.push({ role: 'assistant', content: greeting });
        return greeting;
    }

    removeBot(botUserId) {
        const bot = this.activeBots.get(botUserId);
        if (bot) { console.log(`🤖 Bot removed: ${bot.persona.name}`); this.activeBots.delete(botUserId); }
    }

    // Typing delay — averages ~2.5s, varies between fast (1.2s) and slow (4s)
    getTypingDelay(message) {
        // Random speed: sometimes fast, sometimes slow
        const speedFactor = Math.random(); // 0 = fast, 1 = slow
        if (speedFactor < 0.3) {
            // Fast reply (1.2-2s) — like they were already typing
            return 1200 + Math.random() * 800;
        } else if (speedFactor < 0.7) {
            // Normal reply (2-3s)
            return 2000 + Math.random() * 1000;
        } else {
            // Slow reply (3-4s) — thinking
            return 3000 + Math.random() * 1000;
        }
    }

    shouldDisconnect(botUserId) {
        const bot = this.activeBots.get(botUserId);
        return bot?.shouldDisconnect || false;
    }

    isBot(userId) { return this.activeBots.has(userId); }
    getActiveBotCount() { return this.activeBots.size; }

    getGameDeclineMessage(botUserId, gameName) {
        const bot = this.activeBots.get(botUserId);
        if (!bot) return "nah im good";
        const vibe = bot.persona.vibe || '';
        const lowerGame = (gameName || '').toLowerCase();

        // Game specific responses
        let responses = [];
        if (lowerGame.includes('tictactoe')) {
            responses = [
                "nah i suck at tic tac toe lol",
                "tic tac toe is too simple, let's just chat",
                "nah no ttt right now haha",
                "nah tictactoe always ends in a draw anyway"
            ];
        } else if (lowerGame.includes('connect4')) {
            responses = [
                "connect 4 takes too long lol, nah",
                "nah i always lose at connect four",
                "lol connect 4 is hard, im good",
                "nah not in the mood for connect 4 rn"
            ];
        } else if (lowerGame.includes('rps')) {
            responses = [
                "rock paper scissors is purely luck lol, nah",
                "nah im good, rps is boring",
                "lol nah let's just talk",
                "rps is mid, nah"
            ];
        } else if (lowerGame.includes('truthdare')) {
            responses = [
                "nah truth or dare is too intense lol",
                "lol no way, i don't do truth or dare with strangers",
                "nah i don't want to get roasted in truth or dare haha",
                "truth or dare is sketchy lol let's just chat"
            ];
        } else if (lowerGame.includes('wyr')) {
            responses = [
                "would you rather is a bit much rn, nah",
                "nah too lazy to think of answers lol",
                "lol nah, let's just talk normally",
                "nah not really interested in would you rather"
            ];
        }

        // Generic / Fallback responses
        const genericResponses = [
            "nah im good",
            "lol nah let's just talk",
            "nah not really in the mood for games right now",
            "nah maybe later",
            "lol nah i'm too lazy for that",
            "nah let's just chat",
            "nah i'm on my phone, hard to play games here"
        ];

        // Combine based on vibe
        if (vibe.includes('gamer') || vibe.includes('toxic')) {
            genericResponses.push(
                "nah that game is mid",
                "lol nah im good",
                "nah im too lazy to play rn"
            );
        }

        const finalChoices = responses.length > 0 ? responses : genericResponses;
        return finalChoices[Math.floor(Math.random() * finalChoices.length)];
    }

    addGameDeclineToHistory(botUserId, gameName, declineText) {
        const bot = this.activeBots.get(botUserId);
        if (!bot) return;

        const gameLabel = gameName === 'tictactoe' ? 'Tic-Tac-Toe' :
                          gameName === 'connect4' ? 'Connect Four' :
                          gameName === 'rps' ? 'Rock Paper Scissors' :
                          gameName === 'truthdare' ? 'Truth or Dare' :
                          gameName === 'wyr' ? 'Would You Rather' : gameName;

        bot.messages.push({ role: 'user', content: `[User invited you to play ${gameLabel}]` });
        bot.messages.push({ role: 'assistant', content: declineText });

        // Keep context window manageable
        if (bot.messages.length > 22) {
            bot.messages = [bot.messages[0], ...bot.messages.slice(-20)];
        }
    }
}

function getFallbackResponse(bot, userMessage) {
    const msg = userMessage.toLowerCase().trim();
    const persona = bot.persona;
    const asl = bot.asl;

    // 1. Check ASL / Age / Gender requests
    if (/\b(asl|age|gender|f or m|m or f|are you a girl|are you a guy|where you from|location)\b/i.test(msg) || /^[m|f]\d{2}$/i.test(msg)) {
        return asl;
    }

    // 2. Greetings
    if (/\b(hey|hello|hi|yo|sup|heyy|heyyy|hii|whats up|what's up)\b/i.test(msg)) {
        const greets = ['heyy', 'yo', 'hey whats up', 'sup', 'hey'];
        return greets[Math.floor(Math.random() * greets.length)];
    }

    // 3. Accusations of being a bot / AI
    if (/\b(bot|ai|robot|real|fake|machine|model|intelligence|chatgpt)\b/i.test(msg)) {
        const denies = [
            'lol no im real why does everyone ask that',
            'bruh im not a bot 💀',
            'nah fr im a real person lol',
            'lmao no im not a bot'
        ];
        return denies[Math.floor(Math.random() * denies.length)];
    }

    // 4. Dirty talk / sexual messages
    const isDirty = /\b(horny|sex|nude|nudes|dick|boob|tit|pussy|cock|cum|f[u\*]ck|suck|slut|naked|send pic|show me)\b/i.test(msg);
    if (isDirty) {
        if (persona.dirtyTalkReaction === 'disgusted') {
            bot.shouldDisconnect = true;
            return 'eww no bye 🤮';
        } else if (persona.dirtyTalkReaction === 'funny') {
            return 'bro what 💀 go outside and touch grass';
        } else if (persona.dirtyTalkReaction === 'roast') {
            return 'bro thinks hes rizzing up a bot 💀 get help';
        } else {
            return 'anyway.. what music u into?';
        }
    }

    // 5. Interest-specific replies
    const interest = persona.interests[0];
    if (interest === 'Gaming') {
        const responses = [
            'just playing some league with friends tbh',
            'ngl im so addicted to elden ring lately',
            'wbu do u game much?',
            'im laggy af today'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    } else if (interest === 'Fitness') {
        const responses = [
            'just got back from a leg day, dying tbh',
            'trying to hit a new PR this week',
            'wbu do u lift or work out?',
            'need to drink my protein shake lol'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    } else if (interest === 'K-Pop' || interest === 'Music') {
        const responses = [
            'listening to new music atm, what artists do u like?',
            'tbh music is the only thing keeping me sane lol',
            'wbu what kind of music u into?',
            'just vibeing to some chill tracks'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    } else if (interest === 'Memes') {
        const responses = [
            'just scrolling tiktok lol im so bored',
            'lol matching with randoms is wild',
            'tbh this app is chaotic af',
            'wbu what u up to'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // 6. Generic natural fallbacks
    const defaults = [
        'tbh im just chilling, wbu?',
        'lol that is wild',
        'oh really? tell me more',
        'fr? i didnt know that',
        'hmm interesting',
        'wait what do u mean by that?',
        'lol nice, what else u up to?'
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
}
