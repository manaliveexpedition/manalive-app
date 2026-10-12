# Writing brief: The Journey, one week of daily content

You are drafting ONE week of The Journey, a daily app for men in the weeks after
a ManAlive Expedition camp weekend (Thursday night to Sunday). John Pulley ("Pulley")
leads ManAlive and records the audio. Each app week walks a man back through ONE
camp session so he remembers what happened there and lives it out at home.

## Read these first (examples of the finished voice and exact HTML structure)
- G:\Claude Code Projects\the-journey-app\docs\content-rebuild\week-01-heart-of-a-man.html
- G:\Claude Code Projects\the-journey-app\docs\content-rebuild\week-02-the-larger-story.html
Read BOTH fully. Match their voice, length, structure and class names exactly.
Your output is only the `<body>...</body></html>` part (from `<body>` to the end),
exactly like the body of week-02-the-larger-story.html.

## Source material for your session (the "Speaker Coach" project)
G:\Claude Code Projects\speaker-training-build
- curriculum\manalive-1.0\<session>.yaml (core_purpose, desired_end_state, sections)
- curriculum\manalive-1.0\<session>-clips.yaml (movie clips used at camp)
- ManAlive_<Session>_Speaker_Coach_Build_Spec_v1.md (canonical spec; has a
  teaching-ahead map and a leadership "orientation reading" near the end)
- transcripts\ (real talks for your session; examples, not scripts)
The session's desired_end_state is what the week's end-state box should say,
lightly reworded into a man's own voice.

## The daily shape (every day)
1. Reading: ~150 words. A quick reminder of a specific camp moment from your
   session (name the clip, the line, the room) + where it shows up at home this
   week. Short paragraphs, short sentences.
2. Carry this: one short line he carries all day (a phrase or picture). This is
   the day's "handle". Make each one memorable and different.
3. Audio script (John's voice, full script, ~2 minutes = 230-300 words; Saturday
   may run ~2:20; Sunday ~1:50): gives the handle, goes ONE layer deeper than the
   reading, and uses a story to show it happening. Ends by sending him to Dad.
   It must be different from the reading, not the reading out loud.
4. With Dad: one question to take to the Father + quiet. The center of the day.
5. Share: a short prompt for the alumni Facebook group (keep it safe to answer
   in a public-ish group; no confessions required).
6. Notes lines (as in the examples).
Day 7 of the week (Sunday) is rest + look back: the reading says his notes from
this week are right below, and the day includes the "Your week" mock section
exactly like Day 14 in week-02. Day 7's last lines may leave one question that
bridges to the NEXT session (see your assignment), without teaching it.

## Voice rules (from John's edits; follow every one)
- NEVER use an em dash (the long dash) anywhere, in any file. Recast with a
  period, comma or colon. Also avoid en dashes as punctuation.
- Not religious, not preachy. No church words ("blessed", "brother" as a
  greeting, "fellowship" as jargon is fine only where the session uses it).
  John says "Dad" and "Father". Direct, warm, plain-spoken, a little humor.
- Relationship over knowledge: every day must get him TALKING WITH DAD, not
  just knowing more. The reading is not a lesson; it brings back a moment and
  points him to the Father.
- Keep the softeners. Make room for the man who felt little at camp or didn't
  get the breakthrough: "If nothing came, that's okay." "It doesn't have to be
  deep." "You don't have to be finished." Never shame.
- Land on what's alive and hopeful, never on the damage. Name the hard thing,
  but the last word is life.
- Stay in the session's lane: do NOT teach what later sessions teach (use the
  spec's teaching-ahead map). Earlier sessions may be referenced lightly.
- Readings ~150 words, audio ~2 min. Cut setup and repetition, never the story,
  the handle or the turn.
- No movie clips are shown in the app; the reading NAMES the camp moment so he
  replays it in his head. Quote movie lines only briefly (under 15 words).
- Scripture: light touch, a reference or a short phrase, never a survey.

## John's stories: NEVER invent them
Audio scripts are in John's first person. You may NOT make up events from his
life. Where a day's audio needs a personal story, insert a STORY SLOT exactly
like this, inside the `<div class="audio">`, where the story goes:

<div class="story-slot"><div class="label">Your story</div><p>OPEN QUESTION TO DRAW IT OUT</p></div>

The question should draw the story out WITHOUT explaining the day's point
(e.g. "When's a time you said 'I'm fine' and weren't? What was going on?").
Then write the rest of the script around the slot so it flows once he answers.
Use 4 to 6 story slots per week. Other days use a non-story device instead:
a walk-through of an ordinary day, the camp clip moment retold, a picture, or
direct second-person coaching (Day 14 of week 2 is an example).
Stories already USED (never reuse): first weekend faded in 3 days; phone ramps
him up; defensive default when caught off guard; trumpet he sold; "good/fine"
and his brothers asking "how's your heart?"; thinking Jesus was a jerk at the
pool scene; Darrell wouldn't take no; lost in first year of marriage; control
first then disappear; six founders pooling money; all hell breaks loose the
week before camp; divorce + job loss, bars and poker; Papaw and mom in heaven.
Stories HELD for specific weeks (use them in that week if assigned to you,
written in his voice from these facts, and flag them in Decisions):
- POSER: before his life fell apart, everything looked good on the surface
  (successful at his job, doing things with his wife) while underneath he was
  looking at porn about 3 hours a day and cheating on his wife; he was a sex
  addict and thought about it constantly. Keep it honest and NON-graphic.
- WOUND: the Good Will Hunting "It's not your fault" scene still gets him every
  time. Something in his heart cries out: you were programmed this way, taught
  this way; a big part of what came out of him wasn't his fault, it's what he
  was taught.
- NEW NAME: during a camp session (he had been in therapy for years and already
  knew how he posed) he asked God what He thinks of him as a man. God said:
  "I've been waiting for you just to turn so I could see the shadow of you
  turning back to me. I've always loved you and I always will. I don't love you
  because of what you've done or not done. I love you because of who you are,
  because you're my son." It floored him. It felt almost too good to be true.
- BAND OF BROTHERS: the first time he told his band of brothers he'd looked at
  porn, he expected the religious response (get an accountability partner, put
  software on your phone) and harshness. They were gentle: "Thank you for
  sharing that. I wonder what was underneath it. What were you trying to cover
  up, or feel? What were you trying to escape?" They went after his heart.
- Also: he has a jail story he wasn't sure about using. Do NOT write it; you may
  offer ONE optional story slot that invites it if it truly fits your session.

## With Dad minutes (the quiet grows over the weeks)
Use the minutes given in your assignment. Sunday (Day 7 of the week) is 3.

## Required pages in your body, in this order (see week-02 for markup)
1. Cover (Week N, session title, a short subtitle).
2. Overview: end state box, "How every day works" (same rows as week-02,
   update the With Dad minutes sentence), "The week at a glance" table.
3. NEW page right after the overview: "Your stories". Markup:
   <section class="page"><div class="kicker" style="font-size:10pt">Before you record</div><h2>Your stories</h2>
   <p>Answer these however is easiest: talk, scribble, bullet points. Each one drops into that day's audio script.</p>
   then for each slot: <div class="ask"><div class="label">Day NN · Title</div><p>QUESTION</p><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>
   </section>
4. The 7 day sections (class="day"), Day numbers ABSOLUTE (e.g. Week 3 = Day 15..21),
   kicker "Day NN · Weekday" (Mon..Sun). Same sub-structure as week-02,
   including the dayhead "Audio about M:SS".
5. Weekly email page (same template as week-02: subject "Week <word> is in the
   books. You're caught up.", intro "<Word> weeks home. ...", one recap line per
   day as `<p><b>Day NN, Title.</b> line <span class="link">Reread Day NN ›</span></p>`,
   notes line + button, sign-off). Recap lines: one or two sentences, the heart
   of the day, can include the handle.
6. Decisions page: what you decided and why (lane choices, which held story you
   used, anything John must confirm), plus the "Overall notes" lines.

## Output
Write your body HTML to the output path in your assignment (UTF-8, no BOM).
Do not edit any other file. Do not touch any database. Do not run git.
Before finishing, search your output for the em dash character and remove any.
Final reply: 5 lines max: the week's titles + handles, how many story slots, and
anything John must decide.
