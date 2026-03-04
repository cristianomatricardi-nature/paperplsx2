

## Dynamic Waveform Audio Player (NotebookLM-style)

Replace the current static bar waveform with an animated, colorful waveform that has bars bouncing in real-time during playback.

### What changes

**`AudioPlayerBar.tsx`** — Full rewrite of the waveform visualization:
- Bars animate with randomized bounce heights using CSS keyframes when playing (each bar gets a unique animation delay for organic movement)
- Gradient coloring: bars transition from a vibrant purple/indigo on the left to a teal/cyan on the right (similar to NotebookLM)
- Past bars (before playhead) are fully colored; future bars are muted/translucent
- When paused, bars freeze at their current pseudo-random heights
- When idle/generating, bars show a subtle idle pulse animation
- Use `requestAnimationFrame` for smooth playhead tracking (already in place)

**`tailwind.config.ts`** — Add a `waveform-bounce` keyframe:
- A keyframe that scales bars vertically between ~0.3 and 1.0 with easing
- Each bar gets `animation-delay: i * 0.05s` for a wave-like stagger effect

### Design details
- ~50 thin bars with 2px gap, rounded tops
- Color gradient via interpolated HSL per bar index (e.g., HSL 260→180)
- Playing state: bars bounce with staggered delays, filled bars use full opacity, unfilled bars use 0.2 opacity
- Paused/ready state: bars static at varied heights, played portion colored
- Generating state: skeleton shimmer (existing behavior kept)
- Smooth playhead glow effect on the current bar

