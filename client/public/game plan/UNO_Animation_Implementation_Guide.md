# UNO Animation Implementation Guide

## Recommended Library Usage

  -----------------------------------------------------------------------
  Library                 Use For                 Avoid Using For
  ----------------------- ----------------------- -----------------------
  **GSAP**                Master timelines,       Simple hover animations
                          camera shake, screen    
                          rotation, chained       
                          sequences, impact       
                          animations              

  **Framer Motion**       Card movement, UI       Complex timeline
                          panels, badges,         orchestration
                          dialogs, player         
                          avatars, scale/fade     
                          transitions             

  **React Spring**        Natural bounce, elastic Cinematic sequences
                          motion, wobble,         
                          floating objects,       
                          overshoot               

  **tsParticles           Confetti, stars,        Moving gameplay objects
  Confetti**              sparkles, hearts, paper 
                          scraps, smoke bursts    

  **Howler**              Layered sound effects,  Animation
                          background music, pitch 
                          variation               

  **RoughJS**             Comic impact lines,     Motion
                          BOINK text, doodles,    
                          speech bubbles          
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Animation Library Mapping

## 1. +2 Flying Slippers

**Libraries** - GSAP → Slipper flight path, hit-stop, camera punch -
Framer Motion → Card throw animation - React Spring → Player wobble
after impact - tsParticles → Comic dust, feathers, stars - RoughJS →
BOINK text and impact lines - Howler → Whoosh + smack + boing

------------------------------------------------------------------------

## 2. +4 Meteor Strike

**Libraries** - GSAP → Meteor trajectory, explosion timeline - Framer
Motion → Card launch - React Spring → Screen recoil - tsParticles →
Smoke, rainbow sparkles, debris - Howler → Explosion layers

------------------------------------------------------------------------

## 3. Reverse

**Libraries** - GSAP → Rotate board, camera tilt - Framer Motion →
Direction arrow spin - React Spring → Card wobble - Howler → Swish +
rewind sound

------------------------------------------------------------------------

## 4. Skip (Banana Peel)

**Libraries** - GSAP → Slip, fall, exit, return - React Spring → Elastic
body stretch - tsParticles → Dust cloud - RoughJS → Cartoon skid marks -
Howler → Slip whistle + thud

------------------------------------------------------------------------

## 5. Wild Card

**Libraries** - GSAP → Paint spread timeline - Framer Motion → Card
reveal - tsParticles → Paint splash particles - React Spring → Brush
bounce - Howler → Splash + magical chime

------------------------------------------------------------------------

## 6. UNO Call

**Libraries** - GSAP → Spotlight, freeze frame - Framer Motion → Player
jump and glow - tsParticles → Stars and sparkles - Howler → Crowd
cheer + UNO shout

------------------------------------------------------------------------

## 7. Forgot UNO

**Libraries** - GSAP → Giant pointing finger animation - Framer Motion →
Laugh emoji entrance - tsParticles → Falling cards - RoughJS → Comic
speech bubbles - Howler → Laugh track + buzzer

------------------------------------------------------------------------

## 8. Stacking +2

**Libraries** - GSAP → Tower build and collapse - Framer Motion → Card
stacking - React Spring → Tower wobble - tsParticles → Flying cards -
Howler → Wooden creaks + crash

------------------------------------------------------------------------

## 9. Draw Pile Attack

**Libraries** - GSAP → Cards chasing player - Framer Motion → Deck
opening - React Spring → Floating cards - Howler → Flapping paper sounds

------------------------------------------------------------------------

## 10. Winner Celebration

**Libraries** - GSAP → Rocket launch sequence - Framer Motion → Winner
UI - React Spring → Character bounce - tsParticles → Fireworks &
confetti - Howler → Victory fanfare

------------------------------------------------------------------------

## 11. Last Card

**Libraries** - GSAP → Slow-motion zoom - Framer Motion → Pulse glow -
Howler → Heartbeat loop

------------------------------------------------------------------------

## 12. Revenge

**Libraries** - GSAP → Ghost entrance - Framer Motion → +4 throw -
tsParticles → Dark smoke - Howler → Evil whisper

------------------------------------------------------------------------

## 13. Chain Reaction

**Libraries** - GSAP → Combo timeline - Framer Motion → Combo counter -
tsParticles → Fireworks - Howler → Increasing combo sounds

------------------------------------------------------------------------

## 14. Color Change

**Libraries** - GSAP → Balloon inflation - React Spring → Balloon
bounce - tsParticles → Ink particles - Howler → Pop sounds

------------------------------------------------------------------------

## 15. Draw 20

**Libraries** - GSAP → Truck arrival and unloading - Framer Motion →
Falling cards - tsParticles → Card burst - Howler → Truck reverse +
avalanche

------------------------------------------------------------------------

## 16. Card Duel

**Libraries** - GSAP → Fight choreography - Framer Motion → Card
transformations - React Spring → Impact bounce - tsParticles → Energy
bursts - Howler → Punches and explosions

------------------------------------------------------------------------

## 17. UNO Police

**Libraries** - GSAP → Police car drive-in/out - Framer Motion → Officer
popup - Howler → Siren + whistle

------------------------------------------------------------------------

## 18. Card Evolution

**Libraries** - GSAP → Transformation timeline - Framer Motion → Glow
transitions - tsParticles → Electric sparks - Howler → Power-up sound

------------------------------------------------------------------------

## 19. Fake Celebration

**Libraries** - GSAP → Record scratch and rewind - Framer Motion →
Confetti retract - tsParticles → Reverse confetti - Howler → Record
scratch + sad trumpet

------------------------------------------------------------------------

## 20. Victory Dance

**Libraries** - GSAP → Dance choreography - React Spring → Secondary
body bounce - tsParticles → Celebration effects - Howler → Random
victory music

------------------------------------------------------------------------

# General Rule of Thumb

-   **GSAP**: Anything cinematic, multi-step, or camera-related.
-   **Framer Motion**: React UI components, cards, overlays, badges, and
    transitions.
-   **React Spring**: Elastic, natural, physics-inspired movement.
-   **tsParticles**: Visual effects only (confetti, stars, smoke,
    sparkles).
-   **Howler**: Every animation should have layered sound.
-   **RoughJS**: Comic-style overlays, impact text, doodles, and motion
    accents.
