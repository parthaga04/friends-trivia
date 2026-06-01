# Friends Trivia Night 🛋️

A locally-hosted trivia game show for game nights — themed around the TV show *Friends*. Two teams compete to answer questions about each other's players, hosted by Dr. Ross Geller.

## How It Works

- **Two teams** answer questions about the *opposing* team's players
- **Phase 1 – Main Board:** Teams alternate picking categories and answering questions. 15-second timer per question, buzz in to answer.
- **Lightning Round:** 30 seconds of rapid-fire questions per team. Triggered automatically on a tie, or always if you choose.
- **Hosted by Ross:** All narration is spoken aloud via ElevenLabs TTS (optional — falls back to browser voice if not configured).

## Setup

**Requirements:** Python 3.8+

```bash
pip install flask openpyxl requests
```

## Creating Your Questions

Run the template generator once to get a pre-formatted Excel file:

```bash
python create_template.py
```

Open `friends_trivia_questions.xlsx` and fill in your questions:

- **Main Board sheet** — 4 columns: `Category | Person | Question | Answer`
  - `Person` must exactly match the player name you enter at game setup (case-insensitive)
  - Aim for 4 categories with ~3–5 questions per player
- **Lightning Round sheet** — 3 columns: `Person | Question | Answer`
  - Keep questions short — they're read aloud at speed
  - Aim for 15–25 questions per team pair

> The game routes each team's questions to players on the **opposing** team. Team A answers questions about Team B's players, and vice versa.

## Running the Game

```bash
python app.py
```

Open `http://localhost:5000` in a browser (ideally displayed on a TV or shared screen).

Fill in:
- Team names and player names for each team
- Upload your `friends_trivia_questions.xlsx`
- Choose lightning round mode (tie-breaker only, or always)

Hit **Start the Game**.

## Keyboard Shortcuts

| Screen | Key | Action |
|--------|-----|--------|
| Question | `Space` | Buzz in |
| Lightning Round | `Space` | Mark correct |

## Ross Geller Voice (Optional)

For authentic Ross narration, wire up [ElevenLabs](https://elevenlabs.io) (free tier — ~10k chars/month):

1. Sign up at elevenlabs.io
2. Go to **Voices → Add a new voice → Instant Voice Clone**, upload a short clip of Ross speaking, and save the voice
3. Copy your **API key** and the new voice's **Voice ID**
4. Open `app.py` and paste them at the top:

```python
ELEVENLABS_API_KEY = 'your_api_key_here'
ELEVENLABS_VOICE_ID = 'your_voice_id_here'
```

If no API key is set, the game falls back to the browser's built-in text-to-speech automatically.

## Game Flow

```
Setup → Coin Toss → Main Board (Phase 1) → Lightning Round → Game Over
```

1. **Coin toss** — randomly decides which team goes first
2. **Main Board** — teams alternate picking a category; questions are about the other team's players; buzz in within 15 seconds to answer; host marks correct/incorrect and reveals the answer
3. **Lightning Round** — each team gets 30 seconds of back-to-back questions; space bar or ✓ button to mark correct, → to skip
4. **Game Over** — winner announced with final scores

## Project Structure

```
app.py                        # Flask server + ElevenLabs TTS endpoint
create_template.py            # Generates the Excel question template
requirements.txt
static/
  game.js                     # All game logic (client-side)
  style.css                   # TV-optimised dark theme
templates/
  index.html                  # Setup page
  game.html                   # Game screen
friends_trivia_questions.xlsx # Your questions (not tracked in git)
```
