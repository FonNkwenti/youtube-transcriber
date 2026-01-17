# YouTube Transcript Generator

A simple Python script to fetch transcripts from YouTube videos and save them as text files.

## Prerequisites

- Python 3
- `pip` (Python package installer)

## Installation

1. Create a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Every time you open a new terminal session, make sure to activate the virtual environment first:

```bash
source venv/bin/activate
```

Then, run the script with the YouTube video URL as an argument:

```bash
python3 get_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"
```

The transcript will be saved in an `extracts` folder with the video title as the filename (e.g., `extracts/Video Title.txt`).

## Example

```bash
python3 get_transcript.py "https://www.youtube.com/watch?v=mbxq88TOxp4"
```
