-- The Daily: real content, Days 1-49 (Weeks 1-7). Days 1-30 first, then Days
-- 31-49 appended in a second block at the bottom (same ON CONFLICT contract).
-- Source of truth: Notion "The Daily, Week N Copy" pages. Each entry carries:
--   title             = the day's title (no "Day N:" prefix; eyebrow shows week/day)
--   body_text         = "The read" (the app entry text)
--   reflection_prompt = "Sit with it" (the day's optional reflection question)
-- "The listen" is John's audio, recorded separately; audio_url stays null until
-- the recordings exist. Fixed UUIDs (…0000000000NN = day N) so check-ins/events
-- reference entries deterministically. Strings are dollar-quoted ($md$…$md$) so
-- apostrophes need no escaping.
--
-- Re-runnable: ON CONFLICT DO UPDATE refreshes every field, so re-seeding
-- overwrites the old week-1 placeholders and clears the throwaway day-3 audio.
-- Day-of-week (the `day` column) cycles 1-7; sort_index is the absolute day.

insert into public.entries (id, week, day, title, body_text, audio_url, sort_index, reflection_prompt)
values
  ('e1000001-0001-0001-0001-000000000001', 1, 1,
   $md$Before the World Grabs You$md$,
   $md$You are home. You can probably already feel the pull of everything you left, the inbox, the list, the noise. Before any of it gets its hands on you, stop for two minutes.

Something happened to you this weekend. It was real. God met you and said something true about who you are. The plan against you right now is simple: make you forget it by Thursday.

So do not trust your memory. Write down the one thing. What God let you know about who you really are. Maybe that came as a name, maybe as something He said to you, maybe just a knowing. Whatever form it took, get it down. Even the part that feels too good to say out loud.

Put it where you will see it. Phone lock screen. Truck dash. Bathroom mirror. Today that is the only job.$md$,
   null, 1,
   $md$What is the one thing God said to you this weekend? Put it in your own words.$md$),

  ('e1000001-0001-0001-0001-000000000002', 1, 2,
   $md$Say It Again$md$,
   $md$Day two. Whatever God let you know about who you are has probably faded a little since Saturday night. Normal. Not a sign it was fake.

Some of you got a name up there. If you did, hold onto it, because a name from God is not a label, it is the truth about who He made you to be. Some of you did not get one, and that is not a miss. He gives a man his name when it will mean the most, and He is never late. Either way, go back to what He showed you and say it again, out loud if you can.

Here is the test, and be honest. Do you believe it today? Not do you understand it. Do you believe it, sitting in your actual life, with everything you know about yourself.

You do not have to fake a yes. Most men cannot say a clean yes on day two. Just notice where the doubt is. We are going to deal with it. For now, say the name one more time and let it sit.$md$,
   null, 2,
   $md$Say the name out loud. Did you believe it today, yes or not yet? No wrong answer.$md$),

  ('e1000001-0001-0001-0001-000000000003', 1, 3,
   $md$The Drop-Off$md$,
   $md$Let's call it what it is. Right about now the high starts coming down. You feel a little flat. The weekend feels a little far away. A voice starts up: maybe that was just an emotional thing, maybe nothing really changed.

Hear me. The drop-off is not proof it was fake. It is gravity. Every man who has met God on a mountain has had to walk back down it.

What changed this weekend was not your mood. It was what is true about you. That is still true this morning, flat feeling and all.

So when the doubt talks today, you do not have to argue with it. Just do not believe it. Just keep coming back here. That is the fight right now, and showing up is winning it.$md$,
   null, 3,
   $md$Nothing fancy: how flat or steady do you feel today? Just name it.$md$),

  ('e1000001-0001-0001-0001-000000000004', 1, 4,
   $md$Son, Not Slave$md$,
   $md$Underneath everything you heard this weekend is one thing, and if you keep only one, keep this.

You are a son. Not a slave earning his keep. Not an orphan scrapping to survive on his own. A son. And Dad has been after you the whole time, long before you cleaned anything up.

Most men live like hired hands. Perform, produce, do not get found out, hope it is enough. You can feel the difference in your body when you believe you are a son instead. The striving lets go a little.

You do not have to feel like a son today to be one. It is not a mood. It is where you actually stand. Read that again if you need to.$md$,
   null, 4,
   $md$Where in your life are you still living like a hired hand instead of a son?$md$),

  ('e1000001-0001-0001-0001-000000000005', 1, 5,
   $md$Five Quiet Minutes$md$,
   $md$At camp you had space. No phone, no inbox, time to get quiet and actually hear something. Now you have to make that space, and your week will fight you for it.

So keep it small. Five minutes today. Find a door that closes or a truck in a parking lot. Phone face down and out of reach.

Then ask God one question. Not a list. One. What do you want me to know today? Or, what are you saying about who I am? Then stop talking and listen. Your mind will wander. Fine. Come back.

Five minutes. Most men cannot remember the last time they were quiet that long. That is exactly why it matters.$md$,
   null, 5,
   $md$Did you take the five minutes? What, if anything, did you hear?$md$),

  ('e1000001-0001-0001-0001-000000000006', 1, 6,
   $md$Still in the Story$md$,
   $md$Today is going to look ordinary. Errands, the yard, the kids, the same stuff that was here before you left. It is easy to feel like the story was up there and this is just real life.

That is backwards. This ordinary Saturday is the story. You are not waiting around for the next big spiritual moment. You are in the middle of something larger right now, in the ordinary, with a real enemy who would love for you to believe nothing important is happening while you handle the weekend to-do list.

You are not killing time between camps. You are a man with a part to play, today, where you actually are. Walk into your day like that is true, because it is.$md$,
   null, 6,
   $md$Where in today, plain as it looks, might you actually be needed?$md$),

  ('e1000001-0001-0001-0001-000000000007', 1, 7,
   $md$You Showed Up$md$,
   $md$One week. Look back at it honestly.

You probably did not do it perfectly. Missed a day, phoned in the quiet time once, doubted the whole thing on Wednesday. Does not matter. You are here on day seven. That alone puts you ahead of most men, who feel something at a retreat and let it evaporate by the weekend.

The goal this week was never to have it figured out. It was to show up and keep what God said from leaking away. You did that.

Take a breath today. No new assignment. Just notice you stayed, and let it count, because it counts.$md$,
   null, 7,
   $md$What is one thing from this week you do not want to lose? Name it before week two.$md$),

  ('e1000001-0001-0001-0001-000000000008', 2, 1,
   $md$The Mask Goes Back On$md$,
   $md$Second Monday back in it. Notice anything? The mask probably went on with the work boots this morning. The guy you are at the job, fine, got it handled, no problems here. The one you actually are stayed in the truck.

That is the poser. We talked about him at camp. He is the version of you that you built to keep people from seeing the real thing. He is not evil. He kept you safe for a long time. But he is not you, and he will quietly run your whole week if you let him.

Step one is just noticing him. Today, catch the moment the mask goes on. Do not even fight it yet. Just see it.$md$,
   null, 8,
   $md$When did the mask go on today? Name the moment.$md$),

  ('e1000001-0001-0001-0001-000000000009', 2, 2,
   $md$Get in the Room$md$,
   $md$Quick and practical today. You are not meant to do this alone, and there is a room full of men who get exactly what you are walking through.

Apply to the ManAlive alumni group today. It takes two minutes. Open the group and tap Join.

[ManAlive Alumni](https://www.facebook.com/groups/manalivealumni)

Do it now, not later, for one reason: approval may take a day or two, and you want to already be in there before the harder weeks hit. Getting in is not the same as posting. You do not have to say a word yet. Just get through the door.$md$,
   null, 9,
   $md$Did you apply to the group? Yes or not yet.$md$),

  ('e1000001-0001-0001-0001-000000000010', 2, 3,
   $md$The Poser Is Not You$md$,
   $md$Here is the thing about the poser. He is not the real you having a bad day. He is a whole self you built, on purpose, a long time ago, because somewhere back there being the real you got you hurt.

So you made a safer version. The one who is fine. The one who has the answer. The one who never needs anything. And he worked. He protected you.

But here is the cost. A mask cannot be loved. People can only love what they can actually see, and nobody can see you behind him. You can be in a crowded room, married, surrounded, and completely alone, because the only thing anyone is allowed to meet is the poser.

You do not have to take him off all at once. You just have to know he is not you.$md$,
   null, 10,
   $md$What does your poser do best? Be honest about your go-to move.$md$),

  ('e1000001-0001-0001-0001-000000000011', 2, 4,
   $md$Performing into a Corner$md$,
   $md$A man I know, sharp guy, ran his own crew, respected. Everybody figured he had it dialed. He figured if any of them saw what was actually going on at home and in his head, they would lose all respect for him. So he kept the act up. For years.

What finally got him was not a blow-up. It was the loneliness. He realized he had a phone full of contacts and not one man who knew him. He was performing so well that nobody could reach him, including the people who loved him.

The day he told one guy the truth, the act did not cost him respect. It cost him the loneliness. Turns out the thing he was protecting was the thing killing him.$md$,
   null, 11,
   $md$Who in your life only knows the performance, not you?$md$),

  ('e1000001-0001-0001-0001-000000000012', 2, 5,
   $md$The Small Tells$md$,
   $md$End of the work week. Look back at the last few days, not the big stuff, the small moments.

Where did you perform instead of just being honest? The doing great when you were not. The opinion you held back to keep the peace. The laugh at the thing that was not funny. The no I am good when you needed help.

None of that makes you a fraud. It makes you a man who learned to stay safe. But naming it is how the grip loosens. You cannot put down something you will not admit you are holding.

Pick one. Just one place this week you wore the mask. Name it to yourself plainly.$md$,
   null, 12,
   $md$Name one place this week you wore the mask.$md$),

  ('e1000001-0001-0001-0001-000000000013', 2, 6,
   $md$My Own Story$md$,
   $md$Less reading today, more listening. Hit play on this one. It is the weekend, you can find five minutes, and I want you to hear it in a voice instead of off a screen.$md$,
   null, 13,
   $md$What is the one thing you are most afraid would make men walk away if they knew? You do not have to write it all. Just name that it is there.$md$),

  ('e1000001-0001-0001-0001-000000000014', 2, 7,
   $md$Two Weeks In$md$,
   $md$Two weeks. Look back.

This was the week we went after the poser, the mask you put on to stay safe. If all you did was start noticing him, that is the win. Most men go their whole lives never once catching the act.

You also got into the alumni room, or you have not yet, and if not, that is your one job before week three.

You are not behind. You are not failing. You are a man who is slowly stopping the pretending. That is real work, even when it does not feel like much.

Rest today. We keep going tomorrow.$md$,
   null, 14,
   $md$What did you notice about your poser this week that you did not see before?$md$),

  ('e1000001-0001-0001-0001-000000000015', 3, 1,
   $md$Two Costumes$md$,
   $md$Back at it. There are basically two costumes men wear to hide, and knowing yours changes everything.

The first is the lone wolf. Needs no one. Handles it himself. Tough, capable, walls up. The second is the social butterfly. Everybody loves him, life of the party, always on. They look like opposites. They are the same move.

Both are built to keep people from seeing the real you. The lone wolf does it with distance. The butterfly does it with charm. Either way, nobody gets in.

This week, figure out which one is yours. You probably already know.$md$,
   null, 15,
   $md$Lone wolf or social butterfly? Which is your main move?$md$),

  ('e1000001-0001-0001-0001-000000000016', 3, 2,
   $md$The Lone Wolf Bill$md$,
   $md$If you are the lone wolf, hear this straight, because nobody else will say it to you.

Your independence is not as impressive as you think. It looks like strength. It is mostly fear wearing armor. You decided a long time ago that needing people is dangerous, so you made sure you never would.

And it works, right up until it does not. Until life knocks you flat, and you look up, and there is no one there. Not because people did not care. Because you trained them all to keep their distance.

The strongest thing a lone wolf can do is let one man get close enough to actually help. That takes more guts than going it alone ever did.$md$,
   null, 16,
   $md$If you went down hard tomorrow, who would actually be there? Name them, honestly.$md$),

  ('e1000001-0001-0001-0001-000000000017', 3, 3,
   $md$The Butterfly Bill$md$,
   $md$If you are the social butterfly, this one is for you, and it is going to sting a little.

You are loved everywhere and known nowhere. You walk in, the room lights up, everybody is glad you came. And not one of them could tell you what is actually going on inside you, because you have made sure of it.

The charm is a defense. As long as you are entertaining, nobody looks closer. As long as you are giving everybody what they want, nobody asks what you need. You are surrounded and starving.

Being liked is not the same as being known. You have got the first one mastered. The second one is what you actually came here for.$md$,
   null, 17,
   $md$Who likes the show you put on, but has no idea how you actually are?$md$),

  ('e1000001-0001-0001-0001-000000000018', 3, 4,
   $md$Who Shows Up$md$,
   $md$Real question today, the one both the wolf and the butterfly dodge.

When the bottom drops out, who actually shows up for you? Not who likes you. Not who would send a text. Who gets in the truck and drives over.

Be honest with the number. For a lot of men it is zero, or close to it, and that is not a character flaw. It is the bill coming due for years of self-protection.

I am not asking this to make you feel bad. I am asking because that number is exactly what the next several weeks are about changing. You cannot fix what you will not first look at square.$md$,
   null, 18,
   $md$If life fell apart this week, who would actually show up? Name them, or name the number.$md$),

  ('e1000001-0001-0001-0001-000000000019', 3, 5,
   $md$Same Engine$md$,
   $md$Here is what ties it together, and it is the key to the whole thing.

Lone wolf and social butterfly look like opposites. They are the same engine. Both exist for one reason. Self-protection. Keep them out so they cannot hurt me. One does it with walls, the other with charm. Same goal.

And neither one gives you life. That is the part to sit with. You have run a strategy your whole adult life that was built to keep you safe, and the bill it charged you was every real relationship you ever wanted.

The good news. A strategy can be changed. You are not stuck as the wolf or the butterfly. That was a decision, and decisions can be unmade.$md$,
   null, 19,
   $md$What were you protecting yourself from when you first built your mask?$md$),

  ('e1000001-0001-0001-0001-000000000020', 3, 6,
   $md$One Message$md$,
   $md$Today, a small action, and the weekend is the right time for it.

Reach out to one man. Not for help. Not a big vulnerable confession. Just open the door. A text. Hey, been thinking about you, want to grab coffee or get out on the water sometime. That is it.

If you are the lone wolf, this will feel unnecessary. Do it anyway. If you are the butterfly, pick a man you actually want to know, not just another contact to charm.

One man. One message. You are not proposing marriage. You are cracking a door you usually keep shut.$md$,
   null, 20,
   $md$Did you reach out to one man? Who?$md$),

  ('e1000001-0001-0001-0001-000000000021', 3, 7,
   $md$Three Weeks In$md$,
   $md$Three weeks. Look back.

This week you named your costume, wolf or butterfly, and you looked at what it has cost you. That is heavy, and if it left you a little raw, that is not a problem. That is the work doing its job.

Maybe you reached out to a man. Maybe you froze and did not. Either way, you are further than the man who never looked at any of this.

Rest today. Next week we go underneath the mask to the thing that built it in the first place. That is the harder, better work. You are ready for it.$md$,
   null, 21,
   $md$What did this week show you about why you hide?$md$),

  ('e1000001-0001-0001-0001-000000000022', 4, 1,
   $md$Honest, Not Fixed$md$,
   $md$New week. Before we go deeper, get one thing straight, because it stops most men cold.

Putting the mask down does not mean you have it all fixed. Those are two different things, and men confuse them constantly. You think you cannot be honest until you are better. Backwards. Honesty comes first. The healing comes after, and only because you got honest.

You do not have to be the man who has it together. You just have to be the man who stops pretending he does. That is a bar you can clear today.

Lower the standard from perfect to honest. Watch what happens.$md$,
   null, 22,
   $md$What are you waiting to fix before you will let anyone see you?$md$),

  ('e1000001-0001-0001-0001-000000000023', 4, 2,
   $md$Know the Man$md$,
   $md$There is a line we live by. Until you know a man's story, you do not know the man.

You can know a guy for twenty years, hunt with him, work with him, sit near him at church, and not know him at all. You know his stats. His job, his truck, his kids' names. You do not know what drives him, what wrecked him, what he is afraid of. That is not knowing a man. That is knowing about him.

Real connection only happens at the level of story. What happened to you. What you carry. What you are still fighting. Surface stuff is easy and everywhere. Story is rare, and it is the only thing that actually feeds a man.$md$,
   null, 23,
   $md$Whose story do you actually know? Who actually knows yours?$md$),

  ('e1000001-0001-0001-0001-000000000024', 4, 3,
   $md$Who Knows Yours$md$,
   $md$Straight question, sit with it before you answer fast.

Who knows your real story? The whole thing, not the version you hand out. The part you are proud of and the part you bury. Is there one man alive who has heard all of it and stayed?

For a lot of guys, outside of camp, the honest answer is no one. Maybe a wife knows pieces. Maybe nobody knows the worst of it. And carrying a story no one else knows is a specific kind of heavy, the kind that makes a man feel like a stranger in his own life.

You were not built to carry your story alone. The fact that you have been is not a life sentence. It is just where you start.$md$,
   null, 24,
   $md$Is there one man who knows your whole story? If not, sit with what that has been like.$md$),

  ('e1000001-0001-0001-0001-000000000025', 4, 4,
   $md$The Fire$md$,
   $md$Picture it. Eight men around a fire on the last night, dog tired, walls finally down. One of them decides he is done hiding and tells the truth. The real story. The stuff he swore he would take to the grave.

And instead of the room going cold, the next man goes. Then the next. Until it is the middle of the night and every man there has been seen all the way down, and not one of them got rejected for it.

Something happens to men when they trade real stories. They stop being strangers. They become something you cannot fake into existence. That fire is where this whole thing you went through was born.$md$,
   null, 25,
   $md$What would it take for you to tell one man the real story?$md$),

  ('e1000001-0001-0001-0001-000000000026', 4, 5,
   $md$No Longer Alone$md$,
   $md$Short read today. Hit play instead. This is the heart of the whole thing, and I want you to hear it in a voice, not read it off a screen. It is Friday. Find five minutes this weekend and let it land.$md$,
   null, 26,
   $md$What is one step this weekend toward not doing life alone?$md$),

  ('e1000001-0001-0001-0001-000000000027', 4, 6,
   $md$One Honest Line$md$,
   $md$Time to use that room you got into. Today, post one honest line in the alumni group.

Not a highlight. Not a win. One true thing. Three weeks in and still fighting the mask. Hard week, not sure why. Grateful and also kind of lost. Whatever is actually true for you right now.

It will feel like too much and like nothing, both at once. Do it anyway. Here is what happens: you say one real thing, and other men exhale, because you just gave them permission to be real too. That is how the room comes alive.

One honest line. You have been practicing honesty for three weeks. Now do it where other men can see.$md$,
   null, 27,
   $md$Did you post one honest line in the group? What did you say?$md$),

  ('e1000001-0001-0001-0001-000000000028', 4, 7,
   $md$One Month$md$,
   $md$One month. Stop and take that in.

A month ago you drove home from camp wondering if any of it would stick. Most men who feel something at a retreat are back to normal inside two weeks. You are thirty days in and still showing up. That is not nothing. That is rare.

This was the week you started trading the mask for honesty, and maybe said a true thing out loud where another man could hear it. That is the turn the whole thing depends on.

Rest today. Heads up though. This next stretch is the hardest part, the part where a lot of men quietly drift. I am telling you now so you see it coming. You are ready.$md$,
   null, 28,
   $md$What is one thing from this first month you do not want to lose as things get harder?$md$),

  ('e1000001-0001-0001-0001-000000000029', 5, 1,
   $md$Welcome to the Cliff$md$,
   $md$New week, and I am going to be straight with you because you have earned straight.

Right about now it gets harder. The shine is gone. You are busy, a little bored with all this, maybe wondering if you are just going through motions. Some mornings you will not want to open this at all.

Welcome to the cliff. Every man hits it around now. It is not a sign the journey failed. It is the exact place the real work starts, because now you are not running on a weekend high anymore. Now it is just you and the truth.

We are going somewhere important these next couple weeks, down to the wound underneath everything. Do not quit on the doorstep of the part that changes you.$md$,
   null, 29,
   $md$What is the quiet voice telling you to do right now? Name it so you can see it.$md$),

  ('e1000001-0001-0001-0001-000000000030', 5, 2,
   $md$The Wound Underneath$md$,
   $md$Here is the thing under the mask, the thing the whole costume was built to protect.

The wound. Somewhere back there, often when you were young, something happened that hurt deep, and in that moment you came to a conclusion about yourself. You are not enough. You are too much. You are on your own. You do not matter. Whatever it was, it felt less like a thought and more like a fact about you.

That is the wound, and the lie it taught is still running you today, decades later, mostly underground.

We are not going there to make you bleed. We are going there because that lie is exactly what Jesus wants to heal, and it cannot be healed while it stays hidden.$md$,
   null, 30,
   $md$What did you come to believe about yourself back when you were first hurt? Name the lie.$md$)
on conflict (id) do update set
  week              = excluded.week,
  day               = excluded.day,
  title             = excluded.title,
  body_text         = excluded.body_text,
  -- audio_url intentionally NOT overwritten: it's set out-of-band by
  -- scripts/upload-audio-batch.mjs (npm run upload:audio). Re-seeding content
  -- must leave existing audio links intact, never reset them to the null above.
  sort_index        = excluded.sort_index,
  reflection_prompt = excluded.reflection_prompt;

-- Format + Phase tags from the 84-Day Map (kept separate from the content rows
-- so re-seeding doesn't require rewriting every entry tuple). Format is the
-- per-day delivery shape; Phase is the journey stretch.
update public.entries e set format = v.format, phase = v.phase
from (values
  (1,  'Anchor',    'Re-entry'),
  (2,  'Question',  'Re-entry'),
  (3,  'Listen',    'Re-entry'),
  (4,  'Truth',     'Re-entry'),
  (5,  'Challenge', 'Re-entry'),
  (6,  'Truth',     'Re-entry'),
  (7,  'Pause',     'Re-entry'),
  (8,  'Anchor',    'The drift'),
  (9,  'Challenge', 'The drift'),
  (10, 'Truth',     'The drift'),
  (11, 'Story',     'The drift'),
  (12, 'Question',  'The drift'),
  (13, 'Listen',    'The drift'),
  (14, 'Pause',     'The drift'),
  (15, 'Anchor',    'The drift'),
  (16, 'Truth',     'The drift'),
  (17, 'Truth',     'The drift'),
  (18, 'Question',  'The drift'),
  (19, 'Truth',     'The drift'),
  (20, 'Challenge', 'The drift'),
  (21, 'Pause',     'The drift'),
  (22, 'Anchor',    'The drift'),
  (23, 'Truth',     'The drift'),
  (24, 'Question',  'The drift'),
  (25, 'Story',     'The drift'),
  (26, 'Listen',    'The drift'),
  (27, 'Challenge', 'The drift'),
  (28, 'Pause',     'The drift'),
  (29, 'Anchor',    'The cliff'),
  (30, 'Truth',     'The cliff')
) as v(sort_index, format, phase)
where e.sort_index = v.sort_index;

-- End-of-week recap "heart" lines (per day), used to auto-assemble the weekly
-- digest email. Added per week as content is finalized; Week 1 (Days 1-7) below.
update public.entries e set recap_line = v.line
from (values
  (1, $md$God told you who you really are this weekend. The job was to write it down before the week could bury it.$md$),
  (2, $md$It is already fading. That is normal, not fake. Say who He said you are again, even if you cannot fully believe it yet.$md$),
  (3, $md$The high wears off. That is gravity, not proof it was fake. Who He says you are did not change with your mood.$md$),
  (4, $md$The one to keep: you are a son, not a hired hand earning his keep. You can stop performing.$md$),
  (5, $md$Make five minutes, ask God one question, then stop talking and listen.$md$),
  (6, $md$The ordinary day is not a break from the story. It is the story, and you have a part to play in it.$md$),
  (7, $md$You were not perfect. Does not matter. You showed up, and that is the whole win.$md$)
) as v(si, line)
where e.sort_index = v.si;

-- Days 31-49 (Week 5 days 3-7, Weeks 6-7). Appended so seed.sql is the whole
-- source of truth. Same ON CONFLICT contract as above: audio_url is left
-- intact (set out-of-band by npm run upload:audio), never reset to null here.
insert into public.entries (id, week, day, title, body_text, audio_url, sort_index, reflection_prompt)
values
  ('e1000001-0001-0001-0001-000000000031', 5, 3,
   $md$The Lie You Have Believed Longest$md$,
   $md$Yesterday you started naming the wound. Today we go after the lie it taught you, the one you have carried so long it stopped sounding like a lie and started sounding like a fact about you.

It usually fits in a few words. I am not enough. I am too much. I am on my own. I do not matter. I am only worth what I produce. Whatever yours is, it has been running quietly in the background for years, deciding how you read every room, every failure, every silence from your dad.

And maybe you did not get a clear word at camp. Maybe you left more confused than fixed. That is fine. This still works. You do not need a mountaintop moment to name a lie. You just need to get honest for five minutes.$md$,
   null, 31,
   $md$Five quiet minutes today. Ask God: what is the lie I have believed longest? Write down the words that come, even if it is just one line.$md$),

  ('e1000001-0001-0001-0001-000000000032', 5, 4,
   $md$It Is an Agreement, Not a Fact$md$,
   $md$Here is what changes everything. That lie is not a fact about you. It is an agreement you made.

Somewhere back there it got handed to you, by a moment, a person, a silence. And without knowing it, a younger version of you signed for it. And you have been living under that signature ever since.

But here is the thing about an agreement. What got agreed to can get broken. You are not stuck with it because it is old, or because it feels true, or because you have believed it your whole life. Age does not make a lie true. It just makes it familiar.

Today you stop treating it as a life sentence and start treating it as what it is: a contract you can tear up.$md$,
   null, 32,
   $md$Write your lie on one line. Under it write: this is an agreement, not a fact, and I can break it. Say it out loud once.$md$),

  ('e1000001-0001-0001-0001-000000000033', 5, 5,
   $md$Take It to the One Who Was There$md$,
   $md$End of the work week. Before the weekend swallows it, one move.

You have named the lie. You have called it an agreement. Now take it to Jesus, and not as a theology exercise. The claim is simple: He was actually there in the moment you got wounded, and He is not done with it.

So go back to that moment in your mind, the one where the lie got signed. And instead of reliving it alone like you always have, ask Him a question. Where were you when that happened to me. What do you want me to know about it now.

Then listen. You are not making something up. You are letting the One who was there speak into a place that has only ever had your own verdict in it.$md$,
   null, 33,
   $md$Ten quiet minutes this weekend. Go back to the moment the lie started, ask Jesus where He was and what He wants you to know, and write down anything you hear.$md$),

  ('e1000001-0001-0001-0001-000000000034', 5, 6,
   $md$It Can Happen on a Tuesday$md$,
   $md$Short read today. Hit play. This one is better in a voice than off a screen.$md$,
   null, 34,
   $md$Pick your spot. Truck, porch, kitchen, before everyone wakes. That is your ground now. Use it once this weekend.$md$),

  ('e1000001-0001-0001-0001-000000000035', 5, 7,
   $md$That Was a Heavy Week$md$,
   $md$Sunday. Catch your breath.

That was a heavy one. We went down to the wound and named the lie underneath it. Heavy is okay. Heavy means you went somewhere real instead of skating the surface like most men do their whole lives.

You do not have to have it all sorted. You just had to stay in the room. You did. That is the entire job this week.

Rest today.$md$,
   null, 35,
   $md$Name one good thing in your life right now and thank God for it. After a heavy week, naming one good thing is its own kind of healing.$md$),

  ('e1000001-0001-0001-0001-000000000036', 6, 1,
   $md$Now We Go After the Healing$md$,
   $md$New week. Last week we went down to the wound and named the lie it taught you. This week we go after the healing, because naming a wound and walking off is only half the job.

Think back to camp, the long Friday session, the one that ran almost twice as long as the others. That was not an accident. Everything turned on it. It was the day we stopped talking about the mask and went to the thing underneath, and then we did not leave you there. We took it to Jesus. That is what this week is. The same work, back home, on an ordinary Monday.

One thing before we start. The journey was never meant to be walked alone, and we will keep saying that. But this piece, going quiet and taking the wound to God, that part is just you and Him. Remember the covenant of silence at camp, when we sent you off by yourself to get honest with God. That is the posture this week. We bring the brothers back in soon. This part starts alone.

Let's go.$md$,
   null, 36,
   $md$Say last week's lie out loud one more time. Then ask God, this is the lie I agreed with, what is true instead? Sit quiet for two minutes and listen before you move on with your day.$md$),

  ('e1000001-0001-0001-0001-000000000037', 6, 2,
   $md$He Was Already There$md$,
   $md$Yesterday we said healing is God telling you what is true, right where the lie went in. Today, the one claim the whole thing hangs on: Jesus was not absent when you got hurt. He was in the room.

That is hard to hold, especially if the wound came from a man who was supposed to protect you and did not. Where was God, then. It is a fair question, maybe the most honest one you have ever asked. We are not going to hand you a tidy answer. We are going to do what we did at camp instead. Ask Him directly, instead of carrying the silence alone one more year.

Because here is what men report, over and over. When they finally ask, they do not get a lecture. They get a sense of where He was. A different way of seeing what happened to them. And it changes the whole memory.$md$,
   null, 37,
   $md$Ask God one question about the wound: where were you when that happened to me? Then sit in silence and listen. Write down whatever comes, even if it is nothing yet.$md$),

  ('e1000001-0001-0001-0001-000000000038', 6, 3,
   $md$What Is True Instead$md$,
   $md$You asked Him yesterday where He was. Today, you ask Him what is true.

Back at the wound, you heard something about yourself and you agreed with it. It was not a general idea. It was personal, and it was aimed. You are worthless. You will always be alone. You are too much. You are only worth what you produce. Whatever yours was, it has been the loudest voice in the room for years, and you half took it as plain fact about you.

So today you go back to God with it, straight: this is the lie I agreed with. What is true instead? Then you stop and listen. Do not answer for Him. Do not talk yourself into something. Ask, and wait for what He says back. Most men, when they finally get quiet and ask, find He has been wanting to tell them the true thing for a long time.$md$,
   null, 38,
   $md$Two minutes of silence. Tell God the lie you agreed with, ask Him what is true instead, and listen. Write down what He gives you and carry it today.$md$),

  ('e1000001-0001-0001-0001-000000000039', 6, 4,
   $md$Ten Minutes$md$,
   $md$This is the day. Not a reading day, a doing day, and it is the most important one this week.

Ten minutes. Not two. Phone in another room. Go back to the wound you named, take the lie to God again, ask Him the real question, what is true instead of this, and write down whatever comes. No editing. No deciding whether it is real. Just get it on paper.

This is the exact practice that turned camp from a good feeling into a real change for a lot of men. It is also the thing most men skip once they are home and busy. Ten minutes feels like a lot when you are slammed and like nothing when you are honest. Do not skip it.$md$,
   null, 39,
   $md$Ten minutes today, no phone. Take the lie back to God, ask Him what is true instead, and write down everything He gives you, unedited.$md$),

  ('e1000001-0001-0001-0001-000000000040', 6, 5,
   $md$Don't Carry It Silent$md$,
   $md$Some of you did the ten minutes and heard something real. Hold onto it. Say it back to yourself today so it does not slip.

And some of you sat there and got silence. Maybe you felt stupid. The quiet voice is about to tell you this does not work for you, you are too broken, too far gone. That is a lie too. This is not a vending machine. Sometimes God answers the first time you ask. Sometimes it comes after weeks of showing up. Getting nothing yet is not failure. It is just not yet.

Here is the part we do not say enough. Going to the wound, that part you do alone, just you and God, the way you did in the silence at camp. But you were never meant to stay alone with it afterward. Remember, at camp there were men right there when you came back and told what happened. That is the design. You go in alone. You do not carry it out alone.$md$,
   null, 40,
   $md$Two moves. If God gave you something this week, sit with it, say it back to yourself, and ask Him to tell you again. That is how a relationship works. And say one honest sentence to one man, or your band of brothers, that you are in a heavy, good stretch and doing real work. Not a project. Just do not carry it silent.$md$),

  ('e1000001-0001-0001-0001-000000000041', 6, 6,
   $md$It Is a Process$md$,
   $md$Short read today. Hit play. This one belongs in a voice.$md$,
   null, 41,
   $md$Look back at the week. Name one place a wound came up. Did you bury it like the old days, take it to God, or maybe even tell a brother? No guilt either way. Just notice.$md$),

  ('e1000001-0001-0001-0001-000000000042', 6, 7,
   $md$What Is Loosening$md$,
   $md$Sunday. Look back at the week.

We went after the healing, the truth God spoke to you about what happened. Maybe a lot loosened. Maybe a little. Maybe it is still locked up tight and you are frustrated. All of it is fine. You showed up to the quiet and took the real thing to God, and some of you told one man you were in it. That is the important part here.

Rest today.$md$,
   null, 42,
   $md$Name one place, even a small one, where something feels a little less heavy than it did two weeks ago. Thank God for it. And if you told a man this week, thank him too.$md$),

  ('e1000001-0001-0001-0001-000000000043', 7, 1,
   $md$What He Calls You$md$,
   $md$New week. Go back to camp with me for a minute.

Friday night we gave half a session to one truth before we sent you anywhere: God has given you a name. A stone with a name on it that only the Father knows. Story after story of men walking away from an encounter with God carrying a different name than they came with. Then we sent you out alone for an hour to ask Him yours. Not a performance review. Not a list of things to fix. A name. The one He has always called you.

Some of you heard something. A word, a phrase, a picture you know you did not manufacture. Some of you got silence and figured you did it wrong. Either way, hold on to what that hour was actually about. The world handed you a name a long time ago, through the wound, and you have been answering to it ever since. But the Father has a name He calls you, and it is not a replacement He came up with to cheer you up. It is the name that was always His for you. Older than the lie. Older than you.

This week is about that name. And more than the name, the One who speaks it and what that means to you.$md$,
   null, 43,
   $md$Write down what you heard in that hour at camp, word for word as it came. If you got silence, write that down honestly. Then take ten minutes, phone in another room, and ask Him again: Father, what do you call me? Listen.$md$),

  ('e1000001-0001-0001-0001-000000000044', 7, 2,
   $md$Whose Voice$md$,
   $md$Carry one question through today: whose voice have you been listening to since you got home?

Every man has a running narrator. When you mess up, when your kid pushes back, when the project fails, when your wife is short with you, a voice tells you what it means about you. Here is what we want you to see today: that voice is not you thinking, and it is not the old name talking, because names do not talk. That is the Enemy. He found the name the wound wrote on you and he has been reading it back to you so long that his voice sounds like your own thoughts.

Two voices speak over a man's life. The Enemy talks about you. He accuses, he labels, he repeats the old name, and he walks off. The Father talks to you. He calls you by name because He wants you close. One voice isolates. The other invites. Today, just catch which one you have been listening to. You do not have to win the argument yet. Notice who is doing the talking, and remember there is a Father who would rather talk with you than about you.$md$,
   null, 44,
   $md$Catch the narrator once today. When you hear it, call it what it is, the Enemy, and take it to the Father on the spot: Father, what do you say about me? One sentence counts.$md$),

  ('e1000001-0001-0001-0001-000000000045', 7, 3,
   $md$Why Men Don't Ask$md$,
   $md$Some of you have not done the ask yet this week. Monday came and went. Let's be honest about why.

It is not the ten minutes. You have ten minutes. It is what you are afraid He will say. Deep down, most of us expect that if we got truly quiet and asked God what He thinks of us, He would say what everyone else has said. The room goes still, and the answer comes back the same thing your dad said, your coach said, the same thing the Enemy has been repeating over you your whole life.

Name that fear for what it is: the Enemy's darkest lie in this whole fight, the lie that your Father is on his side. Jesus put it plainly: what father, when his son asks for bread, hands him a rock? If a broken earthly dad still knows how to give his kid something good, how much more your Father. He is not waiting to confirm the wound. He has been waiting a long time to speak truth into it.$md$,
   null, 45,
   $md$Say the fear out loud: I am afraid He will say what they said. Then ask anyway. Ten minutes, phone away. Father, what do you call me? Write down what comes, unedited.$md$),

  ('e1000001-0001-0001-0001-000000000046', 7, 4,
   $md$Catch It and Answer It$md$,
   $md$Today is a rep day. One practice, done for real.

Once today, catch the Enemy in the act, calling you by the old name. The second you hear it, answer out loud, even under your breath: that is not what my Father calls me. Then say what He does call you, from that hour at camp or from this week.

Notice what that sentence does. It does not just swap a bad word for a better one. It brings your Father into the room. You are not out-arguing the accuser on your own steam. You are standing next to the One who named you and letting Him settle it. And if you have not heard a name yet, use the ground you already have: I am His son, and He does not talk to me like that. That is true today. The rest is coming.$md$,
   null, 46,
   $md$One rep. When the Enemy calls you by the old name, answer out loud: that is not what my Father calls me. Then say what He does call you.$md$),

  ('e1000001-0001-0001-0001-000000000047', 7, 5,
   $md$I Still Fight It$md$,
   $md$Short read today. Hit play. This is one I want you to hear in my voice.$md$,
   null, 47,
   $md$This weekend, when you hear the old name, do not panic that it is still there. Notice it, refuse it, and take it to your Father. Practice not believing the Enemy.$md$),

  ('e1000001-0001-0001-0001-000000000048', 7, 6,
   $md$You Are Going to Mess Up$md$,
   $md$Short read. Hit play.$md$,
   null, 48,
   $md$Think of one man you could actually call if you blew it. Just identify him in your head. We build on that next week.$md$),

  ('e1000001-0001-0001-0001-000000000049', 7, 7,
   $md$Seven Weeks$md$,
   $md$Sunday. Seven weeks in. Look back.

This was the week we went back for the name. The one the world gave you got called what it is, and the name the Father has always had for you got some air. If all you did was ask Him once and answer the Enemy out loud once or twice, that is real. That is a man learning to live from his Father's voice instead of the world's.

And if you have not heard the name yet, you did not fail the week. Some men hear it in that hour at camp. Some hear it months or even years later, sideways, in a line from a book or a moment that stops them cold. The asking is not a waiting room. The asking is the relationship, and He is drawing you closer through every round of it. Keep pursuing. The name is coming, and the Father is already here.

You are almost through the cliff. One more week of the hard stretch, and it is the week things start turning toward other men, which is where this whole thing has been heading.

Rest today.$md$,
   null, 49,
   $md$If you have heard the name, say it out loud once today and thank Him for it. If you are still waiting, ask Him one more time before the day ends. Either way, you end the week talking with the Father. That is the whole assignment.$md$)
on conflict (id) do update set
  week              = excluded.week,
  day               = excluded.day,
  title             = excluded.title,
  body_text         = excluded.body_text,
  -- audio_url intentionally NOT overwritten (see note above).
  sort_index        = excluded.sort_index,
  reflection_prompt = excluded.reflection_prompt;

-- Format + Phase tags, Days 31-49.
update public.entries e set format = v.format, phase = v.phase
from (values
  (31, 'Challenge', 'The cliff'),
  (32, 'Truth', 'The cliff'),
  (33, 'Challenge', 'The cliff'),
  (34, 'Listen', 'The cliff'),
  (35, 'Pause', 'The cliff'),
  (36, 'Anchor', 'The cliff'),
  (37, 'Truth', 'The cliff'),
  (38, 'Question', 'The cliff'),
  (39, 'Challenge', 'The cliff'),
  (40, 'Truth', 'The cliff'),
  (41, 'Listen', 'The cliff'),
  (42, 'Pause', 'The cliff'),
  (43, 'Anchor', 'The cliff'),
  (44, 'Question', 'The cliff'),
  (45, 'Truth', 'The cliff'),
  (46, 'Challenge', 'The cliff'),
  (47, 'Listen', 'The cliff'),
  (48, 'Listen', 'The cliff'),
  (49, 'Pause', 'The cliff')
) as v(sort_index, format, phase)
where e.sort_index = v.sort_index;

-- Recap "heart" lines present in the live DB beyond Week 1 (Days 8-30, plus the
-- Week 6/7 Pause days). Kept in sync so the weekly digest email matches live.
update public.entries e set recap_line = v.line
from (values
  (8, $md$The mask probably went on with the work boots this morning. Step one is not fighting the poser. It is catching the exact moment he shows up.$md$),
  (9, $md$You were not built to do this alone. Two minutes: apply to the alumni group and get through the door before the harder weeks hit.$md$),
  (10, $md$The poser kept you safe once, but a mask cannot be loved. People only love what they can see. You do not have to take him off all at once. Just know he is not you.$md$),
  (11, $md$Telling one man the truth does not cost you respect. It costs you the loneliness. The thing you are protecting is usually the thing killing you.$md$),
  (12, $md$The "I'm good" when you were not. The opinion you swallowed. Naming one place you wore the mask is how the grip starts to loosen.$md$),
  (13, $md$Today was my story, in my voice instead of off a screen. The one thing you fear would make men walk if they knew. Naming that it is there is the start.$md$),
  (14, $md$Two weeks. This was the week you went after the poser. If all you did was start noticing him, that is the win. Most men never catch the act once.$md$),
  (15, $md$Two costumes men hide behind: the lone wolf and the social butterfly. Opposite looks, same move. Both keep people from seeing you. Figure out which one is yours.$md$),
  (16, $md$Independence looks like strength. It is mostly fear wearing armor. The strongest thing a wolf can do is let one man get close enough to actually help.$md$),
  (17, $md$Loved everywhere, known nowhere. The charm is a defense. Being liked is not the same as being known, and known is what you came here for.$md$),
  (18, $md$When the bottom drops out, who actually gets in the truck and drives over? Be honest with the number. That number is what these next weeks are about changing.$md$),
  (19, $md$Wolf and butterfly run the same engine: self-protection, one with walls, one with charm. Neither gives you life. It was a decision, and decisions can be unmade.$md$),
  (20, $md$One man, one message. Not for help, not a confession. Just crack a door you usually keep shut.$md$),
  (21, $md$Three weeks. You named your costume and what it has cost you. If it left you raw, that is the work doing its job. Next week we go underneath the mask.$md$),
  (22, $md$Putting the mask down does not mean you have it all fixed. Honesty comes first, healing comes after. Lower the bar from perfect to honest.$md$),
  (23, $md$Until you know a man's story, you do not know the man. Knowing his stats is not knowing him. Real connection only happens at the level of story.$md$),
  (24, $md$Is there one man alive who has heard your whole story and stayed? Carrying a story no one knows is its own kind of heavy. You were not built to carry it alone.$md$),
  (25, $md$Eight men, a fire, the truth finally told, and not one man rejected for it. When men trade real stories they stop being strangers. That fire is where this whole thing was born.$md$),
  (26, $md$The heart of the whole thing, in a voice instead of off a screen. One step this weekend toward not doing life alone.$md$),
  (27, $md$Use the room you got into. Post one true thing, not a highlight. You say one real thing and other men exhale, because you just gave them permission too.$md$),
  (28, $md$One month, and you are still showing up. That is rare. This was the week you traded the mask for honesty out loud. Heads up: the next stretch is the hardest part.$md$),
  (29, $md$The shine is gone and it gets harder right about now. That is not failure. It is where the real work starts. Do not quit on the doorstep of the part that changes you.$md$),
  (30, $md$Under the mask is the wound: the moment you came to believe a lie. Not enough, too much, on your own. It still runs you, and it is exactly what Jesus wants to heal, but not while it stays hidden.$md$),
  (42, $md$This week we went after the healing, the truth God told you about the lie you were told. Slow counts. You go to the wound alone, but you were never meant to carry it out alone.$md$),
  (49, $md$This week was the two names. The one the wound gave you, and the one that was always His for you. The name matters because of who says it. Keep going back to Him to hear it.$md$)
) as v(si, line)
where e.sort_index = v.si;

-- Recap heart lines for Days 31-41 and 43-48 (fills the Week 5-7 weekly-email
-- gaps so the digest has a line for every day). Generated 2026-07-15.
update public.entries e set recap_line = v.line
from (values
  (31, $md$The lie you have carried longest stopped sounding like a lie and started sounding like a fact about you. Get quiet and ask God to help you name it. You cannot fight what you will not name.$md$),
  (32, $md$That lie is not a fact about you. It is an agreement you signed a long time ago, and what got agreed to can get broken.$md$),
  (33, $md$Take the lie back to the moment it started, with Jesus this time instead of alone, and ask Him what He wants you to know. He was actually there.$md$),
  (34, $md$The same Jesus who met you at camp meets you in the truck on a hard Tuesday. You do not need a mountain. You need to get quiet and bring Him the real thing.$md$),
  (35, $md$That was a heavy week. Heavy means you went somewhere real instead of skating the surface. You did not have to have it sorted, you just had to stay in the room. You did.$md$),
  (36, $md$Naming the lie was half the job. This week we go after the healing: letting God tell you what is true, right where the lie went in.$md$),
  (37, $md$Jesus was not absent when you got hurt. He was in the room. Ask Him where He was, instead of carrying the silence alone one more year.$md$),
  (38, $md$Take the lie to God straight: this is what I agreed with, what is true instead? Then stop talking and listen for what He says back.$md$),
  (39, $md$Ten minutes, no phone. Take the lie to God, ask Him what is true instead, and write down whatever comes. Most men skip this one. Be the man who does.$md$),
  (40, $md$Heard nothing this week? That is not failure, it is not yet. And you were never meant to carry this alone. Say one honest sentence to one man.$md$),
  (41, $md$Healing comes in layers, not one moment. Measure the week by whether you brought your real heart to God instead of burying it, and let a man or two in.$md$),
  (43, $md$The world handed you a name through the wound. But the Father has a name He has always called you, older than the lie. This week is about that name, and the One who speaks it.$md$),
  (44, $md$Two voices speak over you. The Enemy talks about you and walks off. The Father talks to you because He wants you close. Catch which one you have been listening to.$md$),
  (45, $md$What keeps you from asking is the fear He will say what everyone else said. He will not. He is not waiting to confirm the wound, He has been waiting to speak truth into it.$md$),
  (46, $md$When the Enemy calls you by the old name, answer out loud: that is not what my Father calls me. You are not out-arguing him alone, you are letting the One who named you settle it.$md$),
  (47, $md$The finish line was never the Enemy going quiet. It is his voice losing your agreement. You are not aiming for the day he shuts up, you are aiming for the day you stop believing him.$md$),
  (48, $md$You are going to mess up. That is okay. Just do not do the mess-up part alone. Pulling the knife out of your own leg is what other men are for.$md$)
) as v(si, line)
where e.sort_index = v.si;
