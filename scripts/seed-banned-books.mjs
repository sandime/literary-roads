#!/usr/bin/env node
/**
 * seed-banned-books.mjs
 *
 * Patches the `books` Firestore collection with banned/challenged status
 * from the ALA's most frequently challenged books list.
 *
 * Usage:
 *   node scripts/seed-banned-books.mjs            # dry run
 *   node scripts/seed-banned-books.mjs --patch     # execute patches
 *
 * Auth: reads refresh_token from ~/.config/configstore/firebase-tools.json
 *       Run `firebase login --reauth` if you get invalid_grant errors.
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ── Firebase CLI auth ─────────────────────────────────────────────────────────
const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
let refreshToken;
try {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  refreshToken = cfg.tokens?.refresh_token;
  if (!refreshToken) throw new Error('No refresh_token found.');
} catch (err) {
  console.error('[auth] Could not read Firebase CLI credentials:', err.message);
  console.error('       Run: firebase login --reauth');
  process.exit(1);
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const PROJECT_ID = 'the-literary-roads';
const BOOKS_URL  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/books`;

async function queryBooks(accessToken) {
  const allDocs = [];
  let pageToken = null;
  do {
    const url = pageToken
      ? `${BOOKS_URL}?pageToken=${pageToken}&pageSize=300`
      : `${BOOKS_URL}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Firestore list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const title = doc.fields?.title?.stringValue || '';
      const authors = (doc.fields?.authors?.arrayValue?.values || []).map(v => v.stringValue || '');
      const id = doc.name.split('/').pop();
      allDocs.push({ id, title, authors });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs;
}

async function patchBook(accessToken, docId, patch) {
  const fields = {};
  if (patch.banned !== undefined) fields.banned = { booleanValue: patch.banned };
  if (patch.bannedContext)        fields.bannedContext = { stringValue: patch.bannedContext };
  if (patch.bannedSource)         fields.bannedSource  = { stringValue: patch.bannedSource };

  const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `${BOOKS_URL}/${docId}?${updateMask}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Patch failed for ${docId}: ${res.status} ${await res.text()}`);
}

// ── ALA Most Challenged Books ─────────────────────────────────────────────────
// Source: American Library Association / PEN America
const BANNED_LIST = [
  { title: 'Gender Queer', author: 'Maia Kobabe', bannedContext: 'LGBTQ+ content; sexual content', bannedSource: 'American Library Association' },
  { title: 'All Boys Aren\'t Blue', author: 'George M. Johnson', bannedContext: 'LGBTQ+ content; sexual content', bannedSource: 'American Library Association' },
  { title: 'Out of Darkness', author: 'Ashley Hope Pérez', bannedContext: 'Sexual content; violence', bannedSource: 'American Library Association' },
  { title: 'The Bluest Eye', author: 'Toni Morrison', bannedContext: 'Sexual content; offensive language; racism', bannedSource: 'American Library Association' },
  { title: 'Lawn Boy', author: 'Jonathan Evison', bannedContext: 'LGBTQ+ content; sexual content', bannedSource: 'American Library Association' },
  { title: 'The Kite Runner', author: 'Khaled Hosseini', bannedContext: 'Sexual violence; offensive language', bannedSource: 'American Library Association' },
  { title: 'Speak', author: 'Laurie Halse Anderson', bannedContext: 'Rape and sexual content; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'The Hate U Give', author: 'Angie Thomas', bannedContext: 'Drug use; profanity; anti-police message', bannedSource: 'American Library Association' },
  { title: 'And Tango Makes Three', author: 'Justin Richardson', bannedContext: 'Same-sex families; homosexuality', bannedSource: 'American Library Association' },
  { title: 'Brave New World', author: 'Aldous Huxley', bannedContext: 'Insensitive; offensive language; sexually explicit', bannedSource: 'American Library Association' },
  { title: 'Of Mice and Men', author: 'John Steinbeck', bannedContext: 'Racial slurs; profanity; violence', bannedSource: 'American Library Association' },
  { title: 'Catcher in the Rye', author: 'J.D. Salinger', bannedContext: 'Profanity; sexual content; blasphemy', bannedSource: 'American Library Association' },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', bannedContext: 'Profanity; sexual content; blasphemy', bannedSource: 'American Library Association' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', bannedContext: 'Racial slurs; racial injustice', bannedSource: 'American Library Association' },
  { title: 'The Color Purple', author: 'Alice Walker', bannedContext: 'Sexual content; offensive language; unsuited to age group', bannedSource: 'American Library Association' },
  { title: 'Lord of the Flies', author: 'William Golding', bannedContext: 'Violence; offensive language; demoralizing', bannedSource: 'American Library Association' },
  { title: '1984', author: 'George Orwell', bannedContext: 'Pro-communist; political ideology; sexual content', bannedSource: 'American Library Association' },
  { title: 'Nineteen Eighty-Four', author: 'George Orwell', bannedContext: 'Pro-communist; political ideology; sexual content', bannedSource: 'American Library Association' },
  { title: 'Animal Farm', author: 'George Orwell', bannedContext: 'Pro-communist; political ideology', bannedSource: 'American Library Association' },
  { title: 'Beloved', author: 'Toni Morrison', bannedContext: 'Violence; sexual content; slavery depictions', bannedSource: 'American Library Association' },
  { title: 'American Gods', author: 'Neil Gaiman', bannedContext: 'Sexual content; offensive language', bannedSource: 'American Library Association' },
  { title: 'The Handmaid\'s Tale', author: 'Margaret Atwood', bannedContext: 'Violence; sexual content; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'Brave New World', author: 'Aldous Huxley', bannedContext: 'Insensitive; offensive language; sexually explicit', bannedSource: 'American Library Association' },
  { title: 'In the Night Kitchen', author: 'Maurice Sendak', bannedContext: 'Nudity; inappropriate for age group', bannedSource: 'American Library Association' },
  { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', bannedContext: 'Witchcraft; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'Harry Potter and the Chamber of Secrets', author: 'J.K. Rowling', bannedContext: 'Witchcraft; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'Harry Potter and the Goblet of Fire', author: 'J.K. Rowling', bannedContext: 'Witchcraft; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'I Know Why the Caged Bird Sings', author: 'Maya Angelou', bannedContext: 'Sexual content; offensive language; inappropriate for age', bannedSource: 'American Library Association' },
  { title: 'Lolita', author: 'Vladimir Nabokov', bannedContext: 'Sexual content involving a minor', bannedSource: 'American Library Association' },
  { title: 'The Adventures of Huckleberry Finn', author: 'Mark Twain', bannedContext: 'Racial slurs; racism', bannedSource: 'American Library Association' },
  { title: 'Huckleberry Finn', author: 'Mark Twain', bannedContext: 'Racial slurs; racism', bannedSource: 'American Library Association' },
  { title: 'Slaughterhouse-Five', author: 'Kurt Vonnegut', bannedContext: 'Offensive language; violence; anti-American; sexual content', bannedSource: 'American Library Association' },
  { title: 'The Grapes of Wrath', author: 'John Steinbeck', bannedContext: 'Offensive language; communist propaganda; blasphemy', bannedSource: 'American Library Association' },
  { title: 'Flowers for Algernon', author: 'Daniel Keyes', bannedContext: 'Sexually explicit; offensive language', bannedSource: 'American Library Association' },
  { title: 'Native Son', author: 'Richard Wright', bannedContext: 'Offensive language; violence; sexual content', bannedSource: 'American Library Association' },
  { title: 'A Wrinkle in Time', author: 'Madeleine L\'Engle', bannedContext: 'Occult; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'Ulysses', author: 'James Joyce', bannedContext: 'Sexually explicit; blasphemy', bannedSource: 'American Library Association' },
  { title: 'Lady Chatterley\'s Lover', author: 'D.H. Lawrence', bannedContext: 'Sexually explicit', bannedSource: 'American Library Association' },
  { title: 'Tropic of Cancer', author: 'Henry Miller', bannedContext: 'Sexually explicit; obscene', bannedSource: 'American Library Association' },
  { title: 'The Sun Also Rises', author: 'Ernest Hemingway', bannedContext: 'Offensive language; sexual content; anti-Semitism', bannedSource: 'American Library Association' },
  { title: 'Invisible Man', author: 'Ralph Ellison', bannedContext: 'Offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Their Eyes Were Watching God', author: 'Zora Neale Hurston', bannedContext: 'Offensive language; racial slurs', bannedSource: 'American Library Association' },
  { title: 'Go Tell It on the Mountain', author: 'James Baldwin', bannedContext: 'Offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Giovanni\'s Room', author: 'James Baldwin', bannedContext: 'LGBTQ+ content; sexual content', bannedSource: 'American Library Association' },
  { title: 'The Bell Jar', author: 'Sylvia Plath', bannedContext: 'Depictions of suicide; offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Catch-22', author: 'Joseph Heller', bannedContext: 'Offensive language; sexual content; anti-American', bannedSource: 'American Library Association' },
  { title: 'Sophie\'s Choice', author: 'William Styron', bannedContext: 'Offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'One Flew Over the Cuckoo\'s Nest', author: 'Ken Kesey', bannedContext: 'Offensive language; sexual content; racism', bannedSource: 'American Library Association' },
  { title: 'Fahrenheit 451', author: 'Ray Bradbury', bannedContext: 'Offensive language; inappropriate ideas', bannedSource: 'American Library Association' },
  { title: 'As I Lay Dying', author: 'William Faulkner', bannedContext: 'Offensive language; religious viewpoint', bannedSource: 'American Library Association' },
  { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', bannedContext: 'Satanism; occult', bannedSource: 'American Library Association' },
  { title: 'Watership Down', author: 'Richard Adams', bannedContext: 'Violence; profanity', bannedSource: 'American Library Association' },
  { title: 'Scary Stories to Tell in the Dark', author: 'Alvin Schwartz', bannedContext: 'Violence; occult; Satanism', bannedSource: 'American Library Association' },
  { title: 'More Scary Stories to Tell in the Dark', author: 'Alvin Schwartz', bannedContext: 'Violence; occult', bannedSource: 'American Library Association' },
  { title: 'The Chocolate War', author: 'Robert Cormier', bannedContext: 'Offensive language; violence; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'A Light in the Attic', author: 'Shel Silverstein', bannedContext: 'Inappropriate; offensive language', bannedSource: 'American Library Association' },
  { title: 'Bridge to Terabithia', author: 'Katherine Paterson', bannedContext: 'Violence; offensive language; occult', bannedSource: 'American Library Association' },
  { title: 'Julie of the Wolves', author: 'Jean Craighead George', bannedContext: 'Sexual content', bannedSource: 'American Library Association' },
  { title: 'The Giver', author: 'Lois Lowry', bannedContext: 'Violence; sexual content; euthanasia', bannedSource: 'American Library Association' },
  { title: 'Forever', author: 'Judy Blume', bannedContext: 'Sexually explicit; offensive language', bannedSource: 'American Library Association' },
  { title: 'Blubber', author: 'Judy Blume', bannedContext: 'Offensive language; bullying; unsuited to age group', bannedSource: 'American Library Association' },
  { title: 'Are You There, God? It\'s Me, Margaret', author: 'Judy Blume', bannedContext: 'Religious viewpoint; sexual content', bannedSource: 'American Library Association' },
  { title: 'Deenie', author: 'Judy Blume', bannedContext: 'Sexual content; masturbation', bannedSource: 'American Library Association' },
  { title: 'The House of the Spirits', author: 'Isabel Allende', bannedContext: 'Sexual content; violence', bannedSource: 'American Library Association' },
  { title: 'The Perks of Being a Wallflower', author: 'Stephen Chbosky', bannedContext: 'Sexual content; drug use; offensive language', bannedSource: 'American Library Association' },
  { title: 'Thirteen Reasons Why', author: 'Jay Asher', bannedContext: 'Suicide depiction; drug use; sexual content', bannedSource: 'American Library Association' },
  { title: 'The Absolutely True Diary of a Part-Time Indian', author: 'Sherman Alexie', bannedContext: 'Offensive language; sexual content; racism', bannedSource: 'American Library Association' },
  { title: 'Staying Fat for Sarah Byrnes', author: 'Chris Crutcher', bannedContext: 'Sexual content; offensive language; anti-Christian', bannedSource: 'American Library Association' },
  { title: 'Running Loose', author: 'Chris Crutcher', bannedContext: 'Offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Athletic Shorts', author: 'Chris Crutcher', bannedContext: 'Offensive language; LGBTQ+ content', bannedSource: 'American Library Association' },
  { title: 'The Witches', author: 'Roald Dahl', bannedContext: 'Occult; portrays witches negatively', bannedSource: 'American Library Association' },
  { title: 'James and the Giant Peach', author: 'Roald Dahl', bannedContext: 'Violence; offensive language; occult', bannedSource: 'American Library Association' },
  { title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', bannedContext: 'Racial content; offensive language', bannedSource: 'American Library Association' },
  { title: 'My Friend Flicka', author: 'Mary O\'Hara', bannedContext: 'Offensive language', bannedSource: 'American Library Association' },
  { title: 'The Outsiders', author: 'S.E. Hinton', bannedContext: 'Violence; offensive language; drug use', bannedSource: 'American Library Association' },
  { title: 'Go Ask Alice', author: 'Anonymous', bannedContext: 'Drug use; sexual content; offensive language', bannedSource: 'American Library Association' },
  { title: 'Killing Mr. Griffin', author: 'Lois Duncan', bannedContext: 'Violence; unsuited to age group', bannedSource: 'American Library Association' },
  { title: 'Fallen Angels', author: 'Walter Dean Myers', bannedContext: 'Offensive language; violence', bannedSource: 'American Library Association' },
  { title: 'Shiloh', author: 'Phyllis Reynolds Naylor', bannedContext: 'Killing of animals; violence', bannedSource: 'American Library Association' },
  { title: 'The Headless Cupid', author: 'Zilpha Keatley Snyder', bannedContext: 'Occult', bannedSource: 'American Library Association' },
  { title: 'A Day No Pigs Would Die', author: 'Robert Newton Peck', bannedContext: 'Violence; offensive language', bannedSource: 'American Library Association' },
  { title: 'Summer of My German Soldier', author: 'Bette Greene', bannedContext: 'Offensive language; racism', bannedSource: 'American Library Association' },
  { title: 'The Pigman', author: 'Paul Zindel', bannedContext: 'Offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Confessions of a Teenage Drama Queen', author: 'Dyan Sheldon', bannedContext: 'Drug use; offensive language', bannedSource: 'American Library Association' },
  { title: 'The Things They Carried', author: 'Tim O\'Brien', bannedContext: 'Violence; offensive language; sexual content', bannedSource: 'American Library Association' },
  { title: 'Song of Solomon', author: 'Toni Morrison', bannedContext: 'Offensive language; sexual content; violence', bannedSource: 'American Library Association' },
  { title: 'Blood and Chocolate', author: 'Annette Curtis Klause', bannedContext: 'Sexual content; violence', bannedSource: 'American Library Association' },
  { title: 'Captain Underpants', author: 'Dav Pilkey', bannedContext: 'Insensitive; unsuited to age; offensive language', bannedSource: 'American Library Association' },
  { title: 'Sex Education', author: 'Jenny Davis', bannedContext: 'Sexual content', bannedSource: 'American Library Association' },
  { title: 'Gossip Girl', author: 'Cecily von Ziegesar', bannedContext: 'Drug use; sexual content; offensive language', bannedSource: 'American Library Association' },
  { title: 'The Earth, My Butt, and Other Big Round Things', author: 'Carolyn Mackler', bannedContext: 'Sexual content; offensive language', bannedSource: 'American Library Association' },
  { title: 'Doing It', author: 'Melvin Burgess', bannedContext: 'Sexual content', bannedSource: 'American Library Association' },
  { title: 'The Anarchist Cookbook', author: 'William Powell', bannedContext: 'Dangerous information; offensive', bannedSource: 'American Library Association' },
  { title: 'America (The Book)', author: 'Jon Stewart', bannedContext: 'Nudity; offensive language', bannedSource: 'American Library Association' },
  { title: 'It\'s Perfectly Normal', author: 'Robie Harris', bannedContext: 'Sexual content; nudity; inappropriate for age', bannedSource: 'American Library Association' },
  { title: 'It\'s So Amazing!', author: 'Robie Harris', bannedContext: 'Sexual content; inappropriate for age', bannedSource: 'American Library Association' },
  { title: 'Daddy\'s Roommate', author: 'Michael Willhoite', bannedContext: 'LGBTQ+ content; homosexuality', bannedSource: 'American Library Association' },
  { title: 'Heather Has Two Mommies', author: 'Lesléa Newman', bannedContext: 'LGBTQ+ content; homosexuality', bannedSource: 'American Library Association' },
  { title: 'King and King', author: 'Linda de Haan', bannedContext: 'LGBTQ+ content; homosexuality', bannedSource: 'American Library Association' },
  { title: 'Uncle Bobby\'s Wedding', author: 'Sarah S. Brannen', bannedContext: 'LGBTQ+ content; homosexuality', bannedSource: 'American Library Association' },
  { title: 'And Tango Makes Three', author: 'Peter Parnell', bannedContext: 'LGBTQ+ content; same-sex families', bannedSource: 'American Library Association' },
  { title: 'Bel Canto', author: 'Ann Patchett', bannedContext: 'Sexual content; violence', bannedSource: 'American Library Association' },
  { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', bannedContext: 'Violence; sexual content', bannedSource: 'American Library Association' },
  { title: 'Infinite Jest', author: 'David Foster Wallace', bannedContext: 'Drug use; sexual content; offensive language', bannedSource: 'American Library Association' },
  { title: 'Rabbit, Run', author: 'John Updike', bannedContext: 'Sexually explicit; offensive language', bannedSource: 'American Library Association' },
  { title: 'American Psycho', author: 'Bret Easton Ellis', bannedContext: 'Violence; sexual content; offensive language', bannedSource: 'American Library Association' },
];

// ── Match logic ───────────────────────────────────────────────────────────────
function findMatch(entry, allBooks) {
  const titleLower  = entry.title.toLowerCase().trim();
  const authorLower = entry.author.toLowerCase().trim();

  const candidates = allBooks.filter(b =>
    (b.title || '').toLowerCase().trim() === titleLower
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Disambiguate by author
  return candidates.find(b =>
    (b.authors || []).some(a => a.toLowerCase().includes(authorLower))
  ) || candidates[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes('--patch');

(async () => {
  console.log(DRY_RUN ? '[seed-banned-books] DRY RUN — pass --patch to execute' : '[seed-banned-books] PATCH MODE');
  console.log();

  const accessToken = await getAccessToken();

  console.log('[1/3] Loading books collection from Firestore…');
  const allBooks = await queryBooks(accessToken);
  console.log(`      ${allBooks.length} books loaded`);
  console.log();

  console.log('[2/3] Matching entries from ALA list…');
  const toProcess = [];
  const notFound  = [];

  for (const entry of BANNED_LIST) {
    const match = findMatch(entry, allBooks);
    if (!match) {
      notFound.push(entry.title);
    } else {
      toProcess.push({
        docId: match.id,
        title: match.title,
        patch: {
          banned:        true,
          bannedContext: entry.bannedContext,
          bannedSource:  entry.bannedSource,
        },
      });
    }
  }

  console.log(`      ${toProcess.length} matched, ${notFound.length} not found in books collection`);
  if (notFound.length) {
    console.log('\n  Not in books collection (users haven\'t added these yet):');
    notFound.forEach(t => console.log(`    - ${t}`));
  }

  if (DRY_RUN) {
    console.log('\n[dry run] Would patch:');
    toProcess.forEach(p => {
      console.log(`  ${p.docId} — "${p.title}"`);
      console.log(`    bannedContext: ${p.patch.bannedContext}`);
      console.log(`    bannedSource:  ${p.patch.bannedSource}`);
    });
    console.log('\nRun with --patch to execute.');
    return;
  }

  console.log(`\n[3/3] Patching ${toProcess.length} books…`);
  let ok = 0, fail = 0;
  for (const { docId, title, patch } of toProcess) {
    try {
      await patchBook(accessToken, docId, patch);
      console.log(`  ✓ ${title} [${docId}]`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${title} [${docId}]: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone — ${ok} patched, ${fail} failed, ${notFound.length} not found.`);
})();
