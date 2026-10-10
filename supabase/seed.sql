-- Seed data for Builders.
--
-- Generated from app/lib/seed.ts — run `npm run db:seed` after editing that
-- file rather than editing this one.
--
-- Before running: sign up through the site with the email below, so the account
-- exists. Then run this whole file once, in the Supabase SQL editor or with
-- psql. Re-running it is safe; projects that already exist are left alone.

do $$
declare
  -- Who should own these projects. Change this to your own address.
  owner_email text := 'replace-with-your-email@example.com';
  owner       uuid;
  new_project bigint;
begin
  select id into owner from auth.users where lower(email) = lower(owner_email);

  if owner is null then
    raise exception
      'No account exists for email %. Sign up through the site first, then run this file.',
      owner_email;
  end if;

  -- Tap Tap Dzikr
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('tap-tap-dzikr', 'Tap Tap Dzikr', 'Trade mindless social-media tapping for mindful remembrance.', owner,
     'live', 'pet', 'Our thumbs are trained to tap and scroll without thinking, and social media is always within reach. The intention to remember often loses to that habit, especially when it means finding prayer beads or counting in your head while doing something else.', 'A daily remembrance counter made as simple as possible: open, tap, done. No account, no nagging notifications, and no numbers that make it feel competitive. Counts stay on the device so they can continue tomorrow.',
     'Anyone who wants to turn a tapping habit into something more calming.', 'Preparing dark mode and a layout that is comfortable to use with one hand.',
     '2026-08-11 09:00:00',
     '', 'https://dzikir-harian.netlify.app/', '',
     '', array['wellbeing', 'habits', 'mobile']::text[], '○○○',
     '2024-05-04 09:00:00', '2026-08-11 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'ui-ux-designer', 'Redesigning the counter interface for comfortable one-handed use, including dark mode.',
           'About 3 relaxed hours per week', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Counts now persist after the app is closed', 'Counts used to disappear as soon as a tab was closed, which was the most common complaint. They now remain on the device without needing an account.', '2026-08-11 09:00:00'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Used regularly by eleven people', 'Eleven people used it for more than a week in a row—enough to know the basic shape is right.', '2026-05-02 09:00:00'
    where new_project is not null;

  -- Wecard
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('wecard', 'Wecard', 'Question cards for conversations that go beyond small talk.', owner,
     'live', 'product', 'Conversations with people close to us often get stuck on the same questions: Have you eaten? How is work? When are you getting married? What we want to ask is usually deeper, but no one wants to start for fear it will feel awkward.', 'A collection of question cards organized by situation—friends, family, and partners. Open a card and let the question start the conversation, so no one has to feel awkward about going first.',
     'Friends, families, and partners who want deeper conversations without knowing how to begin.', 'Creating a deck of around 40 question cards for conversations with colleagues.',
     '2026-07-28 09:00:00',
     '', 'https://wecard-app.netlify.app/', 'https://flipcard.id/favicon.ico',
     '', array['conversation', 'relationships', 'cards']::text[], '▱',
     '2024-07-18 09:00:00', '2026-07-28 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'content-writer', 'Writing a new deck of around 40 questions for conversations with colleagues.',
           'About 2 hours per week', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Family deck is complete and ready for testing', 'Forty cards for family conversations are finished and being tried in several homes before refinement.', '2026-07-28 09:00:00'
    where new_project is not null;

  -- CariKontak
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('carikontak', 'CariKontak', 'Essential local numbers, ready when you really need them.', owner,
     'live', 'product', 'When something urgent happens—a leaking roof, a broken motorbike, an ambulance needed—time is spent looking for a number. Contacts for tradespeople, repair shops, and emergency services are usually scattered across old chats, notes, or someone else’s memory.', 'A place to store and find essential contacts by area, so numbers are there before they are needed. People can add to the data together, helping a neighborhood through a shared directory.',
     'Residents who want one place for their area’s essential phone numbers.', 'Organizing contacts by district before opening the directory to other areas.',
     '2026-06-19 09:00:00',
     '', 'https://carikontak.com/', '',
     '', array['community', 'directory', 'local']::text[], '⌖',
     '2024-09-02 09:00:00', '2026-06-19 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'The first district is fully listed', 'Numbers for tradespeople, repair shops, and emergency services in one district are complete. From here, it makes sense to add the next area.', '2026-06-19 09:00:00'
    where new_project is not null;

  -- Quick Invoice
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('invoice-cepat', 'Quick Invoice', 'Create invoices for your services or products without a complicated process.', owner,
     'live', 'commercial', 'Small business owners often invoice through chat because existing invoicing apps feel heavy: create an account, fill in a company profile, choose a plan. That is too many steps for one simple bill.', 'A short form that immediately creates a clean, shareable invoice. No account or subscription—just fill in what is needed and send it to the customer.',
     'Freelancers and small business owners who invoice a few times each month.', 'Testing printing on the thermal printers sellers use most often.',
     '2026-04-30 09:00:00',
     '', 'https://umkmproject-invoice.netlify.app/', '',
     '', array['small business', 'finance', 'tools']::text[], '≡',
     '2024-11-11 09:00:00', '2026-04-30 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'product-manager', 'Deciding the next feature based on the user feedback received so far.',
           '', 'member'
    where new_project is not null;

  -- Main Aman
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('main-aman', 'Main Aman', 'A learning space that helps children stay safer.', owner,
     'live', 'community', 'Children are told to be careful but are rarely shown what risky situations look like. Parents also often struggle to start conversations about body boundaries, strangers, or situations that feel unsafe.', 'Lightweight learning materials that parents and children can open together, with everyday situations and what a child should do. The language is simple enough for children to revisit on their own.',
     'Primary-school children with their parents or teachers.', 'Drafting the first safety materials for children aged 5–8.',
     '2026-08-18 09:00:00',
     '', 'https://mainaman.netlify.app/', '',
     '', array['children', 'education', 'safety']::text[], '✦',
     '2025-01-20 09:00:00', '2026-08-18 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'researcher', 'Testing the materials with one class and improving the parts that do not land yet.',
           '', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'First materials draft completed', 'Twenty core safety topics have been collected and organized. Next, they will be tested with several parents before being rewritten.', '2026-08-18 09:00:00'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Research begins', 'Exploring the most suitable approach for children aged 5–8: easy to understand and not frightening.', '2026-06-03 09:00:00'
    where new_project is not null;

  -- Swegrowth
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('swegrowth', 'Swegrowth', 'A community portal for Indonesian software engineers.', owner,
     'live', 'community', 'Valuable experiences from Indonesian engineers are scattered across social-media threads and chat groups that disappear within days. People just starting out struggle to find them again when they really need them.', 'One portal where stories, learning resources, and work experience are collected for people to revisit anytime. Its content comes from the community, not just one person.',
     'Indonesian software engineers, especially in their early years.', 'Building a portal that brings together community programs and learning resources.',
     '2026-08-05 09:00:00',
     '', 'https://swegrowth.id/', '',
     '', array['community', 'careers', 'learning']::text[], '↗',
     '2025-03-08 09:00:00', '2026-08-05 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'content-writer', 'Curating and editing community submissions each month.',
           '', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Portal structure agreed', 'Programs, resources, and activities are the three main sections. Resources have the most content, so that is being built first.', '2026-08-05 09:00:00'
    where new_project is not null;

  -- Warung Antre
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('warung-antre', 'Warung Antre', 'A digital queue for busy food stalls and small cafés at mealtimes.', owner,
     'idea', 'commercial', 'At lunchtime, small food stalls get busy and orders are kept in someone’s head. Customers wait without knowing their place, sellers struggle to remember, and later arrivals are sometimes served first. The confusion is small but happens every day.', 'A queue number system that works from one screen at the stall: customers scan a code and the seller advances the queue when an order is ready. No extra hardware, no training, and it keeps working on a weak signal.',
     'Food stalls, coffee shops, and small outlets that get busy at certain times.', '',
     null,
     '', '', '',
     '', array['small business', 'operations', 'ideas']::text[], '◔',
     '2025-06-14 09:00:00', '2025-06-14 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'researcher', 'Interview five food-stall owners to confirm that the problem is real.',
           '', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'ui-ux-designer', 'Design a seller flow that can be used while their hands are busy.',
           '', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'software-engineer', 'Prototype a queue that keeps working when the connection drops.',
           '', 'member'
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Interview five food-stall owners', 'Find out whether the queue is truly frustrating or only looks that way from the outside.', 'doing',
           owner, owner
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Seller-screen sketch', 'A single screen that remains readable while hands are busy.', 'todo',
           null, owner
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Write the brief', 'The problem, a solution outline, and who it is for.', 'done',
           owner, owner
    where new_project is not null;

  -- School Carpool
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('titip-jemput', 'School Carpool', 'A school pick-up coordination board for parents in one neighborhood.', owner,
     'building', 'community', 'Parents in one neighborhood often pick up from the same school at the same time, yet still travel separately. Coordination gets stuck in group chats: messages disappear, people who need a ride hesitate to ask, and people with spare seats do not know who needs them.', 'A simple board with weekly pick-up schedules: who leaves when, for which school, and how many seats are free. Parents can simply mark a need or make an offer without negotiating in a busy group chat.',
     'Parents in one neighborhood or housing complex with the same destination school.', 'Finding out how many parents are truly headed in the same direction.',
     '2026-08-14 09:00:00',
     '', '', '',
     '', array['family', 'community', 'ideas']::text[], '⌁',
     '2025-08-01 09:00:00', '2026-08-14 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'product-manager', 'Simplifying the flow so it remains as convenient as a group chat.',
           'About 2 hours per week', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'ui-ux-designer', 'Designing a weekly board that can be understood at a glance.',
           'Flexible; a fixed-scope contribution is welcome too', 'member'
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Count parents headed to the same school', 'Start with data from one neighborhood rather than the whole city.', 'todo',
           null, owner
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Start with one neighborhood', 'Rather than beginning with the whole city, collect data from one neighborhood. If not enough people are headed the same way there, the idea will not work.', '2026-08-14 09:00:00'
    where new_project is not null;
end
$$;
