/**
 * The projects Builders opens with.
 *
 * This is the source of truth for two things: `supabase/seed.sql`, and the
 * read-only fallback `app/lib/data.ts` serves when no database is attached.
 * Keep the two in step — run `npm run db:seed` after editing here.
 */
export type SeedUser = {
  id: string;
  username: string;
  name: string;
  profession: string;
  headline: string;
  bio: string;
  skills: string[];
  yearsExperience: number | null;
  fields: string[];
  availability: "open_to_work" | "open_to_collaboration" | "open_to_both" | "not_open";
  website: string;
  publicEmail: string;
  github: string;
  linkedin: string;
  x: string;
  resume: string;
  /** Trail kinds kept off the public profile. Empty means everything shows. */
  activityHidden: string[];
};

export type SeedEvent = {
  id: number;
  actorId: string;
  projectSlug: string;
  kind: string;
  payload: Record<string, string>;
  createdAt: string;
};

export type SeedSeat = {
  role: string;
  /** Specific label when role is `other`. */
  roleTitle?: string;
  brief: string;
  /** Roughly how much time it takes, in the owner's words. May be empty. */
  commitment: string;
  status: "open" | "pending" | "filled";
  /** Only a filled seat may be admin — see seats_admin_needs_holder. */
  access: "member" | "admin";
  userId: string | null;
  pitch: string;
};

export type SeedTask = {
  title: string;
  detail: string;
  status: "todo" | "doing" | "done";
  /** A seed user id, or null for a task nobody has picked up. */
  assigneeId: string | null;
};

/** One entry in a project's journey, written by whoever runs it. */
export type SeedUpdate = {
  title: string;
  body: string;
  createdAt: string;
};

export type SeedProject = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  ownerId: string;
  stage: string;
  /** Why it exists — see app/lib/project-types.ts. Empty means unstated. */
  projectType: string;
  problem: string;
  solution: string;
  audience: string;
  docUrl: string;
  liveUrl: string;
  logoUrl: string;
  repoUrl: string;
  tags: string[];
  glyph: string;
  /** What the project is working on right now. Empty means nobody has said. */
  now: string;
  /** When that line was last written. Empty when `now` is. */
  nowUpdatedAt: string;
  createdAt: string;
  seats: SeedSeat[];
  tasks: SeedTask[];
  updates: SeedUpdate[];
};

export const seedUsers: SeedUser[] = [
  {
    id: "seed-zikrul",
    username: "zikrulihsan",
    name: "Zikrul Ihsan",
    profession: "Product Builder",
    headline: "Building small things people can use",
    bio: "I work on projects one at a time in my spare time. Ahsan means doing something as well as possible—that is what I am trying to do here, however small the work may be.",
    skills: ["Product Strategy", "Next.js", "Prototyping"],
    yearsExperience: 6,
    fields: ["Civic Tech", "Productivity"],
    availability: "open_to_both",
    website: "https://ahsanproject-id.netlify.app",
    publicEmail: "",
    github: "https://github.com/zikrulihsan",
    linkedin: "",
    x: "",
    resume: "",
    activityHidden: [],
  },
];

/**
 * A few trail entries, so the profile has something to show when no database is
 * attached. On a real deployment the triggers write these; nothing here is
 * inserted by `supabase/seed.sql`, because a seeded trail would be history that
 * never happened.
 */
export const seedEvents: SeedEvent[] = [
  {
    id: 4,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "task_done",
    payload: { slug: "warung-antre", title: "Warung Antre", task_title: "Write the brief" },
    createdAt: "2025-06-16 10:00:00",
  },
  {
    id: 3,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "task_taken",
    payload: {
      slug: "warung-antre",
      title: "Warung Antre",
      task_title: "Interview five food-stall owners",
    },
    createdAt: "2025-06-15 09:00:00",
  },
  {
    id: 2,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "seat_opened",
    payload: { slug: "warung-antre", title: "Warung Antre", role: "researcher" },
    createdAt: "2025-06-14 09:30:00",
  },
  {
    id: 1,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "project_created",
    payload: { slug: "warung-antre", title: "Warung Antre" },
    createdAt: "2025-06-14 09:00:00",
  },
];

export const seedProjects: SeedProject[] = [
  {
    id: 1,
    slug: "tap-tap-dzikr",
    title: "Tap Tap Dzikr",
    tagline: "Trade mindless social-media tapping for mindful remembrance.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "pet",
    problem:
      "Our thumbs are trained to tap and scroll without thinking, and social media is always within reach. The intention to remember often loses to that habit, especially when it means finding prayer beads or counting in your head while doing something else.",
    solution:
      "A daily remembrance counter made as simple as possible: open, tap, done. No account, no nagging notifications, and no numbers that make it feel competitive. Counts stay on the device so they can continue tomorrow.",
    audience: "Anyone who wants to turn a tapping habit into something more calming.",
    docUrl: "",
    liveUrl: "https://dzikir-harian.netlify.app/",
    logoUrl: "",
    repoUrl: "",
    tags: ["wellbeing", "habits", "mobile"],
    glyph: "○○○",
    createdAt: "2024-05-04 09:00:00",
    now: "Preparing dark mode and a layout that is comfortable to use with one hand.",
    nowUpdatedAt: "2026-08-11 09:00:00",
    seats: [
      {
        role: "ui-ux-designer",
        brief: "Redesigning the counter interface for comfortable one-handed use, including dark mode.",
        commitment: "About 3 relaxed hours per week",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Counts now persist after the app is closed",
        body: "Counts used to disappear as soon as a tab was closed, which was the most common complaint. They now remain on the device without needing an account.",
        createdAt: "2026-08-11 09:00:00",
      },
      {
        title: "Used regularly by eleven people",
        body: "Eleven people used it for more than a week in a row—enough to know the basic shape is right.",
        createdAt: "2026-05-02 09:00:00",
      },
    ],
  },
  {
    id: 2,
    slug: "wecard",
    title: "Wecard",
    tagline: "Question cards for conversations that go beyond small talk.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "product",
    problem:
      "Conversations with people close to us often get stuck on the same questions: Have you eaten? How is work? When are you getting married? What we want to ask is usually deeper, but no one wants to start for fear it will feel awkward.",
    solution:
      "A collection of question cards organized by situation—friends, family, and partners. Open a card and let the question start the conversation, so no one has to feel awkward about going first.",
    audience: "Friends, families, and partners who want deeper conversations without knowing how to begin.",
    docUrl: "",
    liveUrl: "https://wecard-app.netlify.app/",
    logoUrl: "https://flipcard.id/favicon.ico",
    repoUrl: "",
    tags: ["conversation", "relationships", "cards"],
    glyph: "▱",
    createdAt: "2024-07-18 09:00:00",
    now: "Creating a deck of around 40 question cards for conversations with colleagues.",
    nowUpdatedAt: "2026-07-28 09:00:00",
    seats: [
      {
        role: "content-writer",
        brief: "Writing a new deck of around 40 questions for conversations with colleagues.",
        commitment: "About 2 hours per week",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Family deck is complete and ready for testing",
        body: "Forty cards for family conversations are finished and being tried in several homes before refinement.",
        createdAt: "2026-07-28 09:00:00",
      },
    ],
  },
  {
    id: 3,
    slug: "carikontak",
    title: "CariKontak",
    tagline: "Essential local numbers, ready when you really need them.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "product",
    problem:
      "When something urgent happens—a leaking roof, a broken motorbike, an ambulance needed—time is spent looking for a number. Contacts for tradespeople, repair shops, and emergency services are usually scattered across old chats, notes, or someone else’s memory.",
    solution:
      "A place to store and find essential contacts by area, so numbers are there before they are needed. People can add to the data together, helping a neighborhood through a shared directory.",
    audience: "Residents who want one place for their area’s essential phone numbers.",
    docUrl: "",
    liveUrl: "https://carikontak.com/",
    logoUrl: "",
    repoUrl: "",
    tags: ["community", "directory", "local"],
    glyph: "⌖",
    createdAt: "2024-09-02 09:00:00",
    now: "Organizing contacts by district before opening the directory to other areas.",
    nowUpdatedAt: "2026-06-19 09:00:00",
    seats: [],
    tasks: [],
    updates: [
      {
        title: "The first district is fully listed",
        body: "Numbers for tradespeople, repair shops, and emergency services in one district are complete. From here, it makes sense to add the next area.",
        createdAt: "2026-06-19 09:00:00",
      },
    ],
  },
  {
    id: 4,
    slug: "invoice-cepat",
    title: "Quick Invoice",
    tagline: "Create invoices for your services or products without a complicated process.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "commercial",
    problem:
      "Small business owners often invoice through chat because existing invoicing apps feel heavy: create an account, fill in a company profile, choose a plan. That is too many steps for one simple bill.",
    solution:
      "A short form that immediately creates a clean, shareable invoice. No account or subscription—just fill in what is needed and send it to the customer.",
    audience: "Freelancers and small business owners who invoice a few times each month.",
    docUrl: "",
    liveUrl: "https://umkmproject-invoice.netlify.app/",
    logoUrl: "",
    repoUrl: "",
    tags: ["small business", "finance", "tools"],
    glyph: "≡",
    createdAt: "2024-11-11 09:00:00",
    now: "Testing printing on the thermal printers sellers use most often.",
    nowUpdatedAt: "2026-04-30 09:00:00",
    seats: [
      {
        role: "product-manager",
        brief: "Deciding the next feature based on the user feedback received so far.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [],
  },
  {
    id: 5,
    slug: "main-aman",
    title: "Main Aman",
    tagline: "A learning space that helps children stay safer.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "community",
    problem:
      "Children are told to be careful but are rarely shown what risky situations look like. Parents also often struggle to start conversations about body boundaries, strangers, or situations that feel unsafe.",
    solution:
      "Lightweight learning materials that parents and children can open together, with everyday situations and what a child should do. The language is simple enough for children to revisit on their own.",
    audience: "Primary-school children with their parents or teachers.",
    docUrl: "",
    liveUrl: "https://mainaman.netlify.app/",
    logoUrl: "",
    repoUrl: "",
    tags: ["children", "education", "safety"],
    glyph: "✦",
    createdAt: "2025-01-20 09:00:00",
    now: "Drafting the first safety materials for children aged 5–8.",
    nowUpdatedAt: "2026-08-18 09:00:00",
    seats: [
      {
        role: "researcher",
        brief: "Testing the materials with one class and improving the parts that do not land yet.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "First materials draft completed",
        body: "Twenty core safety topics have been collected and organized. Next, they will be tested with several parents before being rewritten.",
        createdAt: "2026-08-18 09:00:00",
      },
      {
        title: "Research begins",
        body: "Exploring the most suitable approach for children aged 5–8: easy to understand and not frightening.",
        createdAt: "2026-06-03 09:00:00",
      },
    ],
  },
  {
    id: 6,
    slug: "swegrowth",
    title: "Swegrowth",
    tagline: "A community portal for Indonesian software engineers.",
    ownerId: "seed-zikrul",
    stage: "live",
    projectType: "community",
    problem:
      "Valuable experiences from Indonesian engineers are scattered across social-media threads and chat groups that disappear within days. People just starting out struggle to find them again when they really need them.",
    solution:
      "One portal where stories, learning resources, and work experience are collected for people to revisit anytime. Its content comes from the community, not just one person.",
    audience: "Indonesian software engineers, especially in their early years.",
    docUrl: "",
    liveUrl: "https://swegrowth.id/",
    logoUrl: "",
    repoUrl: "",
    tags: ["community", "careers", "learning"],
    glyph: "↗",
    createdAt: "2025-03-08 09:00:00",
    now: "Building a portal that brings together community programs and learning resources.",
    nowUpdatedAt: "2026-08-05 09:00:00",
    seats: [
      {
        role: "content-writer",
        brief: "Curating and editing community submissions each month.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Portal structure agreed",
        body: "Programs, resources, and activities are the three main sections. Resources have the most content, so that is being built first.",
        createdAt: "2026-08-05 09:00:00",
      },
    ],
  },
  {
    id: 7,
    slug: "warung-antre",
    title: "Warung Antre",
    tagline: "A digital queue for busy food stalls and small cafés at mealtimes.",
    ownerId: "seed-zikrul",
    stage: "idea",
    projectType: "commercial",
    problem:
      "At lunchtime, small food stalls get busy and orders are kept in someone’s head. Customers wait without knowing their place, sellers struggle to remember, and later arrivals are sometimes served first. The confusion is small but happens every day.",
    solution:
      "A queue number system that works from one screen at the stall: customers scan a code and the seller advances the queue when an order is ready. No extra hardware, no training, and it keeps working on a weak signal.",
    audience: "Food stalls, coffee shops, and small outlets that get busy at certain times.",
    docUrl: "",
    liveUrl: "",
    logoUrl: "",
    repoUrl: "",
    tags: ["small business", "operations", "ideas"],
    glyph: "◔",
    createdAt: "2025-06-14 09:00:00",
    now: "",
    nowUpdatedAt: "",
    seats: [
      {
        role: "researcher",
        brief: "Interview five food-stall owners to confirm that the problem is real.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "ui-ux-designer",
        brief: "Design a seller flow that can be used while their hands are busy.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "software-engineer",
        brief: "Prototype a queue that keeps working when the connection drops.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [
      {
        title: "Interview five food-stall owners",
        detail: "Find out whether the queue is truly frustrating or only looks that way from the outside.",
        status: "doing",
        assigneeId: "seed-zikrul",
      },
      {
        title: "Seller-screen sketch",
        detail: "A single screen that remains readable while hands are busy.",
        status: "todo",
        assigneeId: null,
      },
      {
        title: "Write the brief",
        detail: "The problem, a solution outline, and who it is for.",
        status: "done",
        assigneeId: "seed-zikrul",
      },
    ],
    updates: [],
  },
  {
    id: 8,
    slug: "titip-jemput",
    title: "School Carpool",
    tagline: "A school pick-up coordination board for parents in one neighborhood.",
    ownerId: "seed-zikrul",
    stage: "building",
    projectType: "community",
    problem:
      "Parents in one neighborhood often pick up from the same school at the same time, yet still travel separately. Coordination gets stuck in group chats: messages disappear, people who need a ride hesitate to ask, and people with spare seats do not know who needs them.",
    solution:
      "A simple board with weekly pick-up schedules: who leaves when, for which school, and how many seats are free. Parents can simply mark a need or make an offer without negotiating in a busy group chat.",
    audience: "Parents in one neighborhood or housing complex with the same destination school.",
    docUrl: "",
    liveUrl: "",
    logoUrl: "",
    repoUrl: "",
    tags: ["family", "community", "ideas"],
    glyph: "⌁",
    createdAt: "2025-08-01 09:00:00",
    now: "Finding out how many parents are truly headed in the same direction.",
    nowUpdatedAt: "2026-08-14 09:00:00",
    seats: [
      {
        role: "product-manager",
        brief: "Simplifying the flow so it remains as convenient as a group chat.",
        commitment: "About 2 hours per week",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "ui-ux-designer",
        brief: "Designing a weekly board that can be understood at a glance.",
        commitment: "Flexible; a fixed-scope contribution is welcome too",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [
      {
        title: "Count parents headed to the same school",
        detail: "Start with data from one neighborhood rather than the whole city.",
        status: "todo",
        assigneeId: null,
      },
    ],
    updates: [
      {
        title: "Start with one neighborhood",
        body: "Rather than beginning with the whole city, collect data from one neighborhood. If not enough people are headed the same way there, the idea will not work.",
        createdAt: "2026-08-14 09:00:00",
      },
    ],
  },
];
