# Hi Loading Experience - Sound Effects

## Audio Files

- `hi-pulse.mp3` - Subtle pulse sound for logo animation (200ms, ~2KB)
- `hi-breathe.mp3` - Gentle breathing tone for transition (300ms, ~3KB)

## Guidelines

- Keep files under 5KB each
- Use 44.1kHz sample rate
- Subtle, premium tones matching Hi brand
- Optional enhancement - core UX works without sound
- Respect user's system volume settings

## Implementation

Sound effects are automatically initialized on first user interaction and play at 30% volume. They gracefully fail if unavailable, ensuring the loading experience works perfectly without audio.