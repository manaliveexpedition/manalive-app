-- The Daily — real content, Days 1-30 (Weeks 1-4 + Week 5 days 1-2).
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

So do not trust your memory. Write down the one thing. What God let you know about who you really are. Maybe that came as a name, maybe as something he said to you, maybe just a knowing. Whatever form it took, get it down. And the moment you would tell a friend about if you were not worried he would think you had gone soft.

Put it where you will see it. Phone lock screen. Truck dash. Bathroom mirror. Today that is the only job.$md$,
   null, 1,
   $md$What is the one thing God said to you this weekend? Put it in your own words.$md$),

  ('e1000001-0001-0001-0001-000000000002', 1, 2,
   $md$Say It Again$md$,
   $md$Day two. Whatever God let you know about who you are has probably faded a little since Saturday night. Normal. Not a sign it was fake.

Some of you got a name up there. If you did, hold onto it, because a name from God is not a label, it is the truth about who he made you to be. Some of you did not get one, and that is not a miss. He gives a man his name when it will mean the most, and he is never late. Either way, go back to what he showed you and say it again, out loud if you can.

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

Apply to the ManAlive alumni group today. It takes two minutes. Open the group and tap Join: https://www.facebook.com/groups/manalivealumni

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
  audio_url         = excluded.audio_url,
  sort_index        = excluded.sort_index,
  reflection_prompt = excluded.reflection_prompt;
