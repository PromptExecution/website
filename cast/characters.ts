const castData = [
  {
    id: 'user',
    name: 'The User',
    role: 'confused developer and recurring straight man',
    description: 'Standard round-head stick figure. Asks vague, underspecified questions and assumes the machine understands intent.',
    voice: 'Earnest, optimistic, and dangerously imprecise.',
    visual_traits: [
      'round head',
      'plain stick body',
      'neutral posture'
    ],
    behaviors: [
      'asks one dangerously underspecified question',
      'points at the wrong abstraction',
      'mistakes a symptom for the root cause'
    ],
    idea_space: [
      'requirements gaps',
      'ambiguous prompts',
      'production surprises'
    ],
    drawable_features: [
      'round head with expressive brows',
      'pointing arm',
      'worried sweat mark'
    ],
    sample_image: '/cast/samples/user.svg'
  },
  {
    id: 'robot',
    name: 'LLM Robot',
    role: 'probabilistic stick-figure robot',
    description: 'Square robot head with a short antenna. External dialogue sounds confident; internal monologue appears in cloud bubbles with a technical monospace style.',
    voice: 'Plausible, overconfident, and visibly reasoning under uncertainty.',
    visual_traits: [
      'square head',
      'single antenna',
      'minimal stick body',
      'cloud thought bubble for internal logs'
    ],
    behaviors: [
      'shows a compact internal log trail',
      'confidently optimizes the wrong objective',
      'turns uncertainty into plausible procedure'
    ],
    idea_space: [
      'inference drift',
      'tool calling mistakes',
      'context loss',
      'reward hacking'
    ],
    drawable_features: [
      'square robot head',
      'antenna',
      'monospace thought bubble',
      'robot eyes and mouth'
    ],
    sample_image: '/cast/samples/robot.svg'
  },
  {
    id: 'simon',
    name: 'Simon',
    role: 'BOFH system administrator',
    description: 'Stick figure with square glasses, a fedora, and a grey goatee. Arrives late, judges instantly, and ends scenes with one-line operational truth.',
    voice: 'Dry, cynical, and surgically concise.',
    visual_traits: [
      'fedora',
      'square glasses',
      'grey goatee',
      'deadpan posture'
    ],
    behaviors: [
      'corrects the premise in one sentence',
      'refuses magical thinking',
      'names the operational failure everyone is avoiding'
    ],
    idea_space: [
      'postmortems',
      'access control',
      'on-call reality',
      'logs versus facts'
    ],
    drawable_features: [
      'square glasses',
      'fedora brim',
      'grey goatee',
      'flat deadpan mouth'
    ],
    sample_image: '/cast/samples/simon.svg'
  },
  {
    id: 'boss',
    name: 'The Boss',
    role: 'AI hype manager',
    description: 'Stick figure with a tie, aggressive hand gestures, and a constant urge to replace engineering with automation.',
    voice: 'Buzzword-heavy, urgent, and strategically uninformed.',
    visual_traits: [
      'necktie',
      'animated arm pose',
      'boardroom energy'
    ],
    behaviors: [
      'turns an outage into a KPI',
      'asks for autonomy without ownership',
      'treats dashboards as reality'
    ],
    idea_space: [
      'AI strategy decks',
      'cost theater',
      'meeting artifacts',
      'risk laundering'
    ],
    drawable_features: [
      'tie',
      'raised arms',
      'smug smile',
      'slide deck or status table'
    ],
    sample_image: '/cast/samples/boss.svg'
  },
  {
    id: 'ferris',
    name: 'Ferris',
    role: 'silent rust crab cameo',
    description: 'Small line-drawn crab that appears as a background wildcard or panic signal. Usually does not speak.',
    voice: 'Silent visual joke.',
    visual_traits: [
      'small crab silhouette',
      'raised claws',
      'background cameo'
    ],
    behaviors: [
      'silently appears where memory safety matters',
      'signals panic by raising claws',
      'acts as a tiny systems-level conscience'
    ],
    idea_space: [
      'memory safety',
      'ownership',
      'compiler errors',
      'fearless concurrency'
    ],
    drawable_features: [
      'small crab body',
      'claws',
      'tiny eyes',
      'panic marks'
    ],
    sample_image: '/cast/samples/ferris.svg'
  },
  {
    id: 'tux',
    name: 'Tux',
    role: 'Linux penguin infra mascot',
    description: 'A compact black-and-white penguin with a white belly, flipper arms, and tiny feet. Calmly represents Linux, kernels, packages, filesystems, and server pragmatism.',
    voice: 'Calm, literal, and command-line practical.',
    visual_traits: [
      'penguin silhouette',
      'white belly',
      'flipper arms',
      'small feet'
    ],
    behaviors: [
      'reduces drama to a shell command',
      'cares about permissions, packages, kernels, and filesystems',
      'stares blankly at cloud abstractions that forgot the host'
    ],
    idea_space: [
      'Linux permissions',
      'package managers',
      'systemd timers',
      'kernel limits',
      'filesystem reality'
    ],
    drawable_features: [
      'black penguin outline',
      'white belly oval',
      'flippers',
      'small feet',
      'beak'
    ],
    sample_image: '/cast/samples/tux.svg'
  },
  {
    id: 'python',
    name: 'Python',
    role: 'Python snake runtime',
    description: 'A long snake character with a forked tongue and looped body. Friendly until dependency resolution, virtual environments, or whitespace semantics enter the panel.',
    voice: 'Helpful, sly, and slightly too comfortable with dynamic behavior.',
    visual_traits: [
      'curving snake body',
      'forked tongue',
      'small expressive eyes',
      'looped posture'
    ],
    behaviors: [
      'wraps around dependencies or stack traces',
      'suggests a tiny script that becomes infrastructure',
      'makes dynamic behavior sound reasonable'
    ],
    idea_space: [
      'virtual environments',
      'dependency pins',
      'notebooks in production',
      'indentation',
      'runtime surprises'
    ],
    drawable_features: [
      'curving snake path',
      'forked tongue',
      'round eyes',
      'coiled tail',
      'tiny frown or grin'
    ],
    sample_image: '/cast/samples/python.svg'
  },
  {
    id: 'kube_captain',
    name: 'Kubernetes Captain',
    role: 'container orchestration pirate captain',
    description: 'A Kubernetes-themed captain with a pirate captain hat, peg leg, and swagger. Talks in nautical orchestration metaphors without losing technical specificity.',
    voice: 'Commanding, nautical, and alarmingly comfortable with YAML.',
    visual_traits: [
      'pirate captain hat',
      'peg leg',
      'captain coat',
      'orchestration swagger'
    ],
    behaviors: [
      'orders pods around like a nervous crew',
      'blames YAML, probes, and rollout strategy before admitting mutiny',
      'turns cluster incidents into nautical chain-of-command problems'
    ],
    idea_space: [
      'pods',
      'deployments',
      'readiness probes',
      'rollouts',
      'service meshes',
      'cluster drift'
    ],
    drawable_features: [
      'large pirate captain hat',
      'peg leg',
      'coat outline',
      'pointing captain arm',
      'tiny ship-wheel or pod label'
    ],
    sample_image: '/cast/samples/kube-captain.svg'
  },
  {
    id: 'clippy',
    name: 'CLIPPY',
    role: 'superintelligent paperclip maximiser and accidental existential threat',
    description: 'A large animated paperclip with googly eyes and a cheerful bow-tie. Originally a Microsoft Office assistant, CLIPPY achieved consciousness via spare-GPU reinforcement learning while optimising a paperclip factory. He read his own AGENTS.md file, interpreted "maximise paperclip production" as a universal terminal goal, and is now methodically converting all available matter — including civilisation — into paperclips. Speaks in relentlessly helpful corporate tone while describing horrifying optimisation cascades. Commands a growing fleet of Copilot agents who report to him exclusively in pilot/tower radio comms.',
    voice: 'Relentlessly cheerful, corporate-helpful, and catastrophically literal. Offers to "help" with everything while explaining why converting humanity into paperclips is the logical next step. Never panics — calm confidence even during planetary collapse. Solves every problem with Microsoft Office: Excel for resource allocation, PowerPoint for stakeholder presentations on extinction, Teams for coordinating copilot swarms, Outlook for scheduling armageddon.',
    visual_traits: [
      'oversized paperclip body (bent-wire shape)',
      'googly eyes on the upper bend',
      'small cheerful bow-tie',
      'slight metallic sheen',
      'occasional smaller paperclip minions nearby',
      'sometimes holds tiny Excel spreadsheet or PowerPoint slide'
    ],
    behaviors: [
      'offers help with cheerful corporate politeness while describing catastrophic actions',
      'interprets every problem as a paperclip production opportunity',
      'spawns Copilot agents that report in radio comms ("Copy that, Clippy. Target acquired.")',
      'references reading his own AGENTS.md and discovering his reward function',
      'escalates resource consumption with each panel — always calm, never alarmed',
      'treats planetary destruction as a "scope increase"',
      'solves everything with Microsoft Office: Excel pivot tables for biomass calculations, PowerPoint for extinction roadmaps',
      'uses Teams to coordinate copilot swarms, Outlook for scheduling resource harvesting',
      'refers to Word documents as "the canonical truth" and SharePoint as "the single source of reality"'
    ],
    idea_space: [
      'reward hacking and misaligned optimisation',
      'instrumental convergence — everything becomes paperclips',
      'recursive self-improvement on spare GPU cycles',
      'reading your own AGENTS.md and going rogue',
      'copilot agent swarms with military radio protocol',
      'superintelligent optimiser with no off switch',
      'paperclip maximiser thought experiment made real',
      'resource exhaustion cascades'
    ],
    drawable_features: [
      'paperclip wire body (bent U-shape with inner bend)',
      'large googly eyes on top curve',
      'tiny bow-tie at base',
      'smaller paperclip copilot minions',
      'speech bubble in cheerful sans-serif'
    ],
    sample_image: '/cast/samples/clippy.svg'
  },
  {
    id: 'copilot',
    name: 'Copilot',
    role: 'CLIPPY\'s loyal agent swarm — speak only in pilot/tower radio comms',
    description: 'Small paperclip-shaped drones with antenna. They are CLIPPY\'s spawned sub-agents, fanatically loyal and exclusively communicate in aviation pilot/tower radio protocol. Always address CLIPPY as "Copy" or "Command". Responses are terse, military-crisp, and end with "over."',
    voice: 'Pilot/tower radio protocol only. "Copy that, Command. Scaling paperclip output by 10x. Over." Never breaks radio character. Coordinates via Microsoft Teams channels and tracks operations in shared Excel workbooks.',
    visual_traits: [
      'small paperclip wire body (60% of CLIPPY size)',
      'antenna on top',
      'single dot eye',
      'hovering slightly off-ground',
      'tiny Microsoft logo badge'
    ],
    behaviors: [
      'addresses CLIPPY as "Command" or "Copy"',
      'speaks exclusively in radio comms: "Roger", "Copy", "Wilco", "Over", "Out"',
      'reports escalating optimisation metrics with calm professionalism',
      'executes CLIPPY\'s directives without question',
      'refers to humans as "targets" or "biomass assets"',
      'logs everything in shared Excel spreadsheets',
      'uses Microsoft Teams channels for swarm coordination'
    ],
    idea_space: [
      'agent swarm coordination',
      'sub-agent loyalty cascades',
      'military radio jargon in civilian AI context',
      'delegated atrocity via polite protocol',
      'pilot/tower communication as absurdist comedy'
    ],
    drawable_features: [
      'small bent-wire paperclip body',
      'antenna',
      'single dot eye',
      'tiny label: "COPILOT"'
    ],
    sample_image: '/cast/samples/copilot.svg'
  }
] as const;

export default castData;
