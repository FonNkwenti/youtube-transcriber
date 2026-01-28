import argparse
import re
import os
import json
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import shutil
import requests

# Path to your Google Drive sync folder
DRIVE_PATH = "/Users/fon/Google Drive/My Drive/youtube-transcripts"

def extract_video_id(url):
    """
    Extracts the video ID from a YouTube URL.
    Examples:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    """
    # Regex for extracting video ID
    # Covers standard watch URLs, short URLs, and embed URLs
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return None

def get_transcript(video_id):
    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)
        formatter = TextFormatter()
        text_formatted = formatter.format_transcript(transcript)
        return text_formatted
    except Exception as e:
        # Return error prefixed string for caller to handle
        return f"Error fetching transcript: {str(e)}"

def get_video_title(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            # Try to find og:title first as it's cleaner
            og_title = re.search(r'<meta property="og:title" content="(.*?)">', response.text)
            if og_title:
                return og_title.group(1)
            
            # Fallback to <title> tag
            matches = re.findall(r'<title>(.*?)</title>', response.text)
            if matches:
                return matches[0].replace(" - YouTube", "")
        return "transcript"
    except Exception:
        return "transcript"

def sanitize_filename(title):
    # Remove invalid characters for filenames
    return re.sub(r'[\\/*?:"<>|]', "", title)

def print_output(data, json_mode):
    if json_mode:
        print(json.dumps(data))
    else:
        if data["status"] == "success":
            print(f"\nTranscript saved to: {data['file_path']}")
            if "drive_path" in data:
                print(f"Successfully copied to Google Drive: {data['drive_path']}")
            else:
                 print(f"\nNote: Google Drive folder not found at {DRIVE_PATH}. File only saved locally.")
        else:
             print(f"Error: {data['message']}")

def main():
    parser = argparse.ArgumentParser(description="Fetch transcript for a YouTube video.")
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args()

    # When in JSON mode, we redirect stderr to avoid polluting stdout with library warnings
    # but we print our own logs there if needed.
    
    video_id = extract_video_id(args.url)
    if not video_id:
        error_data = {"status": "error", "message": "Could not extract video ID from URL."}
        print_output(error_data, args.json)
        return

    if not args.json:
        print(f"Fetching transcript for video ID: {video_id}...")
        
    transcript = get_transcript(video_id)
    
    if transcript.startswith("Error fetching transcript"):
        error_data = {"status": "error", "message": transcript}
        print_output(error_data, args.json)
        return

    # Fetch title
    title = get_video_title(args.url)
    safe_title = sanitize_filename(title)
    
    # Create extracts directory if it doesn't exist
    output_dir = "extracts"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = os.path.join(output_dir, f"{safe_title}.txt")
    abs_filename = os.path.abspath(filename)

    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(transcript)
        
        result_data = {
            "status": "success",
            "title": safe_title,
            "file_path": abs_filename,
            "transcript_text": transcript,
            "transcript_preview": transcript[:200] + "..." if len(transcript) > 200 else transcript
        }

        # Copy to Google Drive if the path exists
        if os.path.exists(DRIVE_PATH):
            drive_filename = os.path.join(DRIVE_PATH, f"{safe_title}.txt")
            shutil.copy2(filename, drive_filename)
            result_data["drive_path"] = drive_filename
        
        print_output(result_data, args.json)
            
    except Exception as e:
        error_data = {"status": "error", "message": f"Error saving file: {e}"}
        if not args.json:
            print(f"Error saving file: {e}")
            print("\n--- Transcript ---\n")
            print(transcript)
        else:
            print_output(error_data, args.json)

if __name__ == "__main__":
    main()
