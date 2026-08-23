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
  }
] as const;

export default castData;
