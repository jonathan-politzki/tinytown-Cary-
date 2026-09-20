// What villagers say to each other: short exchanges written from what the
// world already knows about them — their day's events, their job, their
// traits, where they are sitting, what is on the TV. Deterministic per pair
// and per few minutes, so a bubble you read is the bubble you saw.
//
// This is the placeholder for a model, and shaped like one: `exchange(a, b)`
// is exactly what a planner would be asked to produce, and world.describe()
// is what it would be handed. No THREE, no DOM.
import { makeRng } from '../rng.js';

const GAMES = ['Packers', 'Bears', 'Cubs', 'Blackhawks', 'Sox'];

const GREET = [
  'Evening, {b}.', '{b}. Long day?', 'There he is.', 'Well look who it is.', 'Hey {b}.', 'Grab a stool, {b}.',
  'Didn’t think I’d see you tonight, {b}.', 'What’s the word, {b}?',
];
const SELF = {
  drive: ['Drove in from {street}. Highway was dead.', 'Just parked out front. Left the car running, practically.', 'Came straight from {street}, didn’t even change.'],
  meet: ['Ran into {other} at {place} earlier. Talked my ear off.', 'Saw {other} over at {place}. Says hi.', '{other} was at {place} this afternoon. Same as ever.'],
  work: ['Nine hours as a {job} and my feet know it.', 'Work was work. Nobody died.', 'Busy day at the {job} thing. Don’t ask.', 'Got off early. Don’t tell anyone.'],
  idle: ['Not much. Walked over.', 'Been out most of the day.', 'Quiet one. Needed to get out of the house.', 'Same as yesterday, honestly.'],
};
const ZONE = {
  bar: ['Another one when you get a second, {tender}.', 'Is that the {game} game? Turn it up.', 'They still do the wings here?', 'Popcorn’s fresh, at least.', 'Tab’s open, it’s fine.'],
  table: ['Split a basket of wings?', 'This table wobbles. Every time.', 'You see the {game} score?', 'Best seat in the house, right here.'],
  darts: ['Double sixteen. Watch this.', 'That machine counts wrong, I swear.', 'Loser buys. That’s the rule.', 'Bull. Called it.'],
  slots: ['This one owes me.', 'Twenty bucks and then I’m done.', 'Don’t tell my wife I’m back here.', 'It was hot an hour ago.'],
  golf: ['Trackball’s sticky again.', 'Par four. Left it short.', 'One more hole and I’m out.', 'You ever birdie this one? I haven’t.'],
  staff: ['What’ll it be?', 'Last call’s midnight, you’ve got time.', 'Running you a tab?', 'The {game} game’s on the big one.'],
};
const CLOSE = [
  'Yeah.', 'Same.', 'Cheers to that.', 'Tell me about it.', 'Here’s to it.', 'Mm.', 'Ha. Alright.', 'Fair.',
];
const TRAIT = {
  talkative: ['And another thing about that.', 'Which reminds me of a story.', 'I could go on.'],
  solitary: ['Mm.', 'Yeah.'],
  cheerful: ['Can’t complain, though.', 'Good night for it.'],
  stubborn: ['I still say I was right.', 'Not changing my mind on that.'],
  restless: ['Might head out after this one.', 'Thinking about the {game} bar down the road, actually.'],
  watchful: ['Notice the crowd tonight?', 'Quiet corner’s open.'],
  curious: ['So what’s your deal, really?', 'How’d you end up in Cary?'],
  generous: ['This one’s on me.', 'Put theirs on mine.'],
  brisk: ['Anyway.', 'Right, next thing.'],
  punctual: ['Right on time, as usual.'],
  'early-rising': ['I’m up at five, so this is my late night.'],
  easygoing: ['No rush on anything.', 'Whatever’s on tap.'],
};
const REGULAR = ['Same stool since ’09.', 'Ask anyone, I’m here more than the taps are.', 'I’ve seen four bartenders come and go.', 'Used to be a jukebox where that machine is.'];
const TENDER = ['What’ll it be?', 'Usual, {b}?', 'Kitchen’s open till ten.', 'Don’t start with the {game} thing tonight.'];

const first = (name) => String(name || '').split(' ')[0];

function fill(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '');
}

/** The facts a line can draw on for one villager. */
function context(agent, world, places, partner) {
  const recent = world.events.filter((e) => e.agentId === agent.id || e.withId === agent.id).slice(-8);
  const drive = [...recent].reverse().find((e) => e.kind === 'drive');
  const meet = [...recent].reverse().find((e) => e.kind === 'meet' && e.placeId !== agent.placeId);
  const home = places.get(agent.homeId);
  const here = places.get(agent.placeId);
  const tender = world.agents.find((o) => o.role === 'bartender' && o.workId === agent.placeId);
  return {
    a: first(agent.name), b: first(partner?.name), job: agent.occupation, street: home?.street || 'home',
    other: meet ? first(meet.agentId === agent.id ? meet.withName : meet.agentName) : '', place: meet?.placeName || '',
    drove: Boolean(drive), met: Boolean(meet), worked: /at work/.test(agent.activity || '') || (agent.workId != null && world.minutes > 17 * 60),
    tender: tender ? first(tender.name) : 'chief', here: here?.name || '', game: '',
  };
}

/**
 * A short exchange between two villagers at the same place: [{who, text}].
 * `zone` is where they are (bar, table, darts, slots, golf, staff) if known.
 */
export function exchange(world, places, a, b, { zone = null, bucketMin = 6 } = {}) {
  if (!a || !b) return [];
  const bucket = Math.floor(world.minutes / bucketMin);
  const rng = makeRng(`talk:${a.id}|${b.id}|${world.day}|${bucket}`);
  const game = GAMES[bucket % GAMES.length];
  const ca = { ...context(a, world, places, b), game }, cb = { ...context(b, world, places, a), game };
  const lines = [];
  const used = new Set();
  // Pick without repeating within one exchange: nobody says "Usual?" twice.
  const say = (who, pool, ctx) => {
    let t = null;
    for (let tries = 0; tries < 4 && (t === null || used.has(t)); tries++) t = rng.pick(pool);
    if (!t || used.has(t)) t = pool.find((p) => !used.has(p)) || t;
    if (!t) return;
    used.add(t);
    lines.push({ who: who.id, name: who.name, text: fill(t, ctx) });
  };
  // Opening.
  if (a.role === 'bartender') say(a, TENDER, ca);
  else say(a, GREET, ca);
  // What the other has been up to. Someone with lines of their own uses them
  // more often than not; that is what makes them them. A line can be aimed
  // at one person ({text, to}) and is only said to them.
  const ownLines = (who, partner) => (who.lines || [])
    .filter((l) => typeof l === 'string' || !l.to || l.to === partner?.name)
    .map((l) => (typeof l === 'string' ? l : l.text));
  const own = (who, partner) => { const pool = ownLines(who, partner); return pool.length && rng.chance(0.65) ? pool : null; };
  const bPool = own(b, a) || (b.role === 'regular' ? REGULAR : cb.drove && rng.chance(0.5) ? SELF.drive : cb.met && rng.chance(0.6) ? SELF.meet : cb.worked ? SELF.work : SELF.idle);
  say(b, bPool, cb);
  // Something about where they are, or a trait showing, or a line of their own.
  const z = zone && ZONE[zone] ? ZONE[zone] : ZONE.bar;
  const traitPool = a.traits?.map((t) => TRAIT[t]).filter(Boolean).flat() || [];
  say(a, own(a, b) || (traitPool.length && rng.chance(0.45) ? traitPool : z), ca);
  // Close.
  const closePool = b.role === 'bartender' ? (own(b, a) || ZONE.staff) : b.traits?.includes('talkative') && rng.chance(0.5) ? TRAIT.talkative : CLOSE;
  say(b, closePool, cb);
  return lines;
}

/** One line for a villager on their own: what they are doing, in their words. */
export function lineFor(world, places, agent, { zone = null } = {}) {
  if (!agent) return '';
  const bucket = Math.floor(world.minutes / 6);
  const rng = makeRng(`line:${agent.id}|${world.day}|${bucket}`);
  const game = GAMES[bucket % GAMES.length];
  const ctx = { ...context(agent, world, places, null), game };
  const general = (agent.lines || []).filter((l) => typeof l === 'string').concat();
  if (general.length && rng.chance(0.6)) return fill(rng.pick(general), { ...ctx, b: 'you' });
  if (agent.role === 'bartender') return fill(rng.pick(ZONE.staff), ctx);
  if (agent.role === 'regular') return fill(rng.pick(REGULAR), ctx);
  const pool = zone && ZONE[zone] ? ZONE[zone] : ctx.drove ? SELF.drive : ctx.worked ? SELF.work : SELF.idle;
  return fill(rng.pick(pool), ctx);
}

/** Who someone is, in a line: "Noel, 61, retired lineman. talkative, stubborn." */
export function who(agent) {
  if (!agent) return '';
  const role = agent.role === 'bartender' ? 'bartender here' : agent.role === 'regular' ? 'a regular' : agent.occupation;
  return `${agent.name}, ${agent.age}, ${role}. ${(agent.traits || []).join(', ')}.`;
}

/** The persona sentence, if the cast gave them one. */
export function persona(agent) {
  return agent?.persona || '';
}

export { GAMES };
