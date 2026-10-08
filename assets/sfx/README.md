# Sound library

Every sound a short uses is looked up **by name**. The short's own `sfx/` folder is checked
first, then this folder. Any of `.wav .mp3 .ogg .flac .m4a` works.

| Name | What | Source |
|---|---|---|
| `step_1`…`step_4` | human footsteps (single steps) | real recordings, Kenney Starter Kit FPS (MIT, `LICENSE-kenney.md`) |
| `ambi_drone`, `ambi_haunted_hum` | atmospheric drones | real recordings from freesound via the Sonic Pi sample library (CC0) |
| `room_tone`, `forest_dusk`, `tap_water` | indoor room tone, dusk forest (wind + crickets), running tap | code-built (`tools/synth-sfx.mjs`) |
| `paw_1`…`paw_3`, `thump`, `flop` | dog claws on a hard floor, tail thump, body flop | code-built |
| `rustle` | bush / leaves rustling | code-built |
| `winter_wind`, `clock_tick` | gusty winter wind, a hall clock ticking | code-built |
| `snow_step_1`…`snow_step_3` | footsteps in snow | code-built |
| `engine_idle`, `car_away`, `car_door` | car idling, pulling away, a door shutting | code-built |
| `cloth` | clothes rustling as someone sits down | code-built |
| `lap_1`, `lap_2`, `splash` | dog lapping water, face splash | code-built |
| `whimper`, `whine`, `sigh`, `yawn`, `growl`, `snarl`, `sniff`, `pant` | dog vocals | code-built **stand-ins** |

## Making it more realistic

Synthesised dog vocals are fine as placeholders, but real recordings sound much better.
On your PC, download free recordings with a licence that allows commercial use. Good sources:
- **Pixabay sound effects**: free, commercial use, no credit needed.
- **freesound.org**: filter by the **CC0** licence.

Save each one in `shorts/<short>/sfx/` with the same name, e.g. `shorts/dog-bathroom/sfx/whimper.mp3`.
It replaces the stand-in for that short only, and the timing stays exactly the same.
Trim silence from the start of each file so it hits on the beat.

Regenerate the code-built sounds: `node tools/synth-sfx.mjs`.
