// Named villagers with fixed roles, per site. The generated population is
// the town; the cast are the people you would recognise in it. Applied at
// world creation, so a seed still gives the same town.
//
// Roles the planner knows (world.js planDay):
//   bartender  works `at` every day from opening to close and lives upstairs
//   regular    is at `at` from late morning to close, every day
//   friend     an ordinary villager with a pinned name, job and local, who is
//              out at `at` most evenings
//
// `persona` is the sentence a card and world.describe() show; `lines` are
// things only they would say, mixed into their exchanges (src/agents/talk.js);
// a line given as {text, to: 'Name'} is only ever said to that person.
const GOAT = 1396245221;

const CAST = {
  cary: [
    { name: 'Jonathan Politzki', role: 'bartender', at: GOAT, age: 33, traits: ['easygoing', 'watchful'],
      persona: 'Runs the bar and lives upstairs. Undefeated at one-on-one, and will mention it.',
      lines: [{ text: 'Still up one on you, {b}.', to: 'Brandon Mazek' }, { text: 'Rematch is whenever you want it, {b}. Same result.', to: 'Brandon Mazek' },
        { text: 'Your brother tell you the score, {b}?', to: 'Matthew Mazek' }, 'Kitchen’s open till ten.', 'Usual, {b}?', 'Tab’s open, it’s fine.'] },
    { name: 'Noel', role: 'regular', at: GOAT, age: 61, traits: ['talkative', 'stubborn'], occupation: 'retired lineman', seat: 'bar',
      persona: 'Retired lineman. Same stool since 2009. Has an opinion on every bartender the place has had.' },
    { name: 'Blake Palliser', role: 'friend', at: GOAT, age: 30, traits: ['cheerful', 'punctual'], occupation: 'dentist at Palliser Dentistry',
      persona: 'Dentist at Palliser Dentistry. Just got his license and is still a little amazed by it.',
      lines: ['Floss. I’m serious.', 'Passed the boards. I’m allowed to say it as many times as I want.', 'First real patient Tuesday. Don’t tell me anything.', 'That popcorn is a molar’s worst enemy.'] },
    { name: 'Justin Lieber', role: 'friend', at: GOAT, age: 31, traits: ['talkative', 'cheerful'], occupation: 'salesperson',
      persona: 'Sales. Can close anyone on anything, including another round.',
      lines: ['Quarter closes Friday. I’m at 104 percent, not that anyone asked.', 'Let me tell you what you actually need.', 'I could sell that dartboard to the Bullshooter guy.', 'One more. I’ll expense it. Kidding.'] },
    { name: 'Brandon Mazek', role: 'friend', at: GOAT, age: 30, traits: ['restless', 'stubborn'], occupation: 'mechanic',
      persona: 'Works on cars. Polish. Basketball guy who just moved to Lakeview East in Chicago, and just lost a one-on-one to Jonathan Politzki.',
      lines: ['Lost a one-v-one to Jonathan last week. He fouled me twice. Rematch’s coming.', 'Lakeview East. Rent is a crime. Court down the street though.', 'Your car’s making that noise because you ignore it.', 'I had him at ten-eight. Then he started calling fouls.'] },
    { name: 'Matthew Mazek', role: 'friend', at: GOAT, age: 33, traits: ['brisk', 'stubborn'], occupation: 'contractor',
      persona: 'Brandon’s older brother. Polish. Not here to make friends, and doesn’t.',
      lines: ['That’s the worst throw I’ve seen all week, and I watched Brandon.', 'Don’t sit there.', 'You’re still talking.', 'My brother lost to a bartender. Explains a lot.', 'Wrong. Next.'] },
    { name: 'Pierce', role: 'friend', at: GOAT, age: 32, traits: ['watchful', 'early-rising'], occupation: 'hunting guide',
      persona: 'Always hunting. If he isn’t in the bar he’s in a tree stand somewhere north of here.',
      lines: ['Opening day’s in nine days. Not that I’m counting.', 'Saw a ten-pointer off Route 31 this morning. Didn’t have the tag.', 'Up at four tomorrow. This is my last one.', 'You want venison? I’ve got a freezer.'] },
    { name: 'Daniel Kriva', role: 'friend', at: GOAT, age: 31, traits: ['curious', 'punctual'], occupation: 'engineer',
      persona: 'Engineer. Has measured the bar rail and thinks it is not level.',
      lines: ['That rail’s off by about a degree. Left side.', 'Whatever the dart machine does, it isn’t counting.', 'Give me a minute, I’m working out the tab in my head.', 'The duct’s undersized for this room, if anyone cares.'] },
    { name: 'Ryan Jean', role: 'friend', at: GOAT, age: 31, traits: ['easygoing', 'curious'], occupation: 'works in tech',
      persona: 'One of the crowd. Usually the first to suggest one more.',
      lines: ['One more and then we’ll see.', 'Who’s got the darts? I’ll play winner.', 'I said I’d leave at nine. It’s nine.', 'Put the game on the big one.'] },
    { name: 'Eric Stiegman', role: 'friend', at: GOAT, age: 31, traits: ['watchful', 'brisk'], occupation: 'works downtown',
      persona: 'One of the crowd. Says less and notices more.',
      lines: ['Noted.', 'You said that last week too.', 'I’ll drive. I’m the only one who can.', 'Darts. Loser buys. Let’s go.'] },
    { name: 'Michael Madzarac', role: 'friend', at: GOAT, age: 31, traits: ['talkative', 'generous'], occupation: 'logistics at C.H. Robinson',
      persona: 'Very Serbian, and will tell you so. Moves freight for C.H. Robinson by day.',
      lines: ['You have never had real ćevapi. I’m telling you this as a friend.', 'Three trucks stuck in Joliet. Not my problem after five.', 'My grandmother would have this whole bar fed by now.', 'Serbia beats anyone in basketball on a good night. Anyone.', 'Rakija. That’s the answer. Whatever the question was.'] },
    { name: 'Ryker Boehm', role: 'friend', at: GOAT, age: 29, traits: ['restless', 'cheerful'], occupation: 'wannabe cowboy',
      persona: 'Wannabe cowboy. Hat, boots, no horse. LFLA: loves Ella Langley, and has the playlist to prove it.',
      lines: ['Put on some Ella Langley. Any of it.', 'Ella Fella for life. Say what you want.', 'Boots aren’t for show. They’re for standing here in.', 'I’m telling you, a ranch. Wyoming. Give me two years.', 'This jukebox owes me a country song.'] },
    { name: 'Tommy', role: 'friend', at: GOAT, age: 31, traits: ['talkative', 'cheerful'], occupation: 'between trips',
      persona: 'Talks about Greece all the time. Has been once, maybe twice, and never really came back.',
      lines: ['In Greece this would be a taverna and it would be better.', 'Santorini in October. That’s the move. I keep telling you.', 'You haven’t lived until you’ve had octopus on a dock in Naxos.', 'I’m going back next summer. This time I mean it.', 'Greek beer. Mythos. Ask Jonathan if he can get it.'] },
  ],
};

export function castFor(siteName) {
  return (CAST[siteName] || []).map((c) => ({ ...c, traits: c.traits?.slice(), lines: c.lines?.slice() }));
}

export { CAST };
