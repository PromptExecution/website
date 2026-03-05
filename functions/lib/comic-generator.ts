// Comic generation logic for LLM DOES NOT COMPUTE
// Generates structured panel scripts from two different models

export interface ComicPanel {
  panelNumber: number;
  speaker: string;  // 'human', 'robot', 'simon', etc.
  dialogue?: string;
  robotThought?: string;  // Internal monologue
  action?: string;
}

export interface ComicScript {
  title: string;
  panels: ComicPanel[];
  day: string;
  model: string;
}

const SYSTEM_PROMPT = `You are a comedy writer for "LLM DOES NOT COMPUTE", an xkcd-style webcomic about AI and tech.

Characters:
- 🤖 **Robot**: An LLM-powered stick figure with internal thoughts in monospace font
- 👤 **Human/Engineer**: Regular stick figure, often confused
- 🧨 **Simon**: BOFH sysadmin, deadpan, loves chaos
- 🐱 **Cat**: Unpredictable, breaks the robot's reasoning

Comic format: 4 panels, xkcd-style humor.

The robot's internal thoughts are shown in code blocks like:
> analyzing query
> confidence: 0.42
> generating response

Write clever technical jokes about:
- AI failures/hallucinations
- DevOps disasters
- Prompt engineering
- Cloudflare products (subtle sponsorship)
- Distributed systems
- LLM reasoning quirks

Output ONLY valid JSON in this exact format:
{
  "title": "Comic Title Here",
  "panels": [
    {
      "panelNumber": 1,
      "speaker": "human",
      "dialogue": "What they say"
    },
    {
      "panelNumber": 2,
      "speaker": "robot",
      "robotThought": "> processing\\n> confidence: 0.38\\n> generating nonsense"
    },
    {
      "panelNumber": 3,
      "speaker": "robot",
      "dialogue": "Robot's response"
    },
    {
      "panelNumber": 4,
      "speaker": "simon",
      "dialogue": "Deadpan punchline"
    }
  ]
}`;

export async function generateComicScript(
  ai: any,
  model: string,
  date: string
): Promise<ComicScript> {
  // Use date as seed for variety
  const userPrompt = `Create a 4-panel technical comedy strip for ${date}.
Make it about: ${getTopicForDate(date)}

Remember: subtle Cloudflare product placement is encouraged (Workers, R2, D1, Pages, AI).`;

  try {
    const response = await ai.run(model, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 1000
    });

    // Parse response
    const content = response.response || JSON.stringify(response);

    // Try to extract JSON
    let jsonMatch = content.match(/\{[\s\S]*"panels"[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to parse the whole thing
      jsonMatch = [content];
    }

    const parsed = JSON.parse(jsonMatch[0]) as ComicScript;
    parsed.day = date;
    parsed.model = model;

    return parsed;
  } catch (err) {
    console.error("Comic generation failed:", err);
    // Fallback comic
    return {
      title: "Generation Error",
      day: date,
      model: model,
      panels: [
        { panelNumber: 1, speaker: "human", dialogue: "Generate a comic." },
        { panelNumber: 2, speaker: "robot", robotThought: "> error: model unavailable\\n> fallback: manual comic" },
        { panelNumber: 3, speaker: "robot", dialogue: "I cannot." },
        { panelNumber: 4, speaker: "simon", dialogue: "Classic." }
      ]
    };
  }
}

function getTopicForDate(date: string): string {
  const topics = [
    "prompt injection attacks",
    "hallucinating documentation references",
    "Kubernetes networking",
    "database migrations gone wrong",
    "load balancer misconfiguration",
    "caching invalidation",
    "serverless cold starts",
    "Docker layer caching",
    "git merge conflicts",
    "production database queries",
    "API rate limiting",
    "CORS errors",
    "timezone bugs",
    "JavaScript type coercion",
    "CSS specificity wars",
    "DNS propagation",
    "certificate expiration",
    "memory leaks",
    "race conditions",
    "off-by-one errors",
    "null pointer exceptions",
    "buffer overflows",
    "security vulnerabilities",
    "tech debt accumulation",
    "code review drama"
  ];

  // Use date hash to pick topic
  const hash = date.split('-').reduce((acc, n) => acc + parseInt(n), 0);
  return topics[hash % topics.length];
}
