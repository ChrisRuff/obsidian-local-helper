# Obsidian Local Helper
I wanted a plugin to transcribe meeting notes and summerize them, using exclusively open source, and locally hosted AI. Here is my crack at it.

## Commands added
### Local Helper: Transcribe Selected
When selecting a file that is **WITHIN** your vault, use whispex to transcribe, using diarization if possible

### Local Helper: Summerize Selected
Given a selection, this will retrieve a summary of the content, the prompt given to the AI is:
- "You are an assistant that is able to read a transcript of a meeting and summarize it. Your summary will be 10 sentences or less."

### Local Helper: Transcribe & Summerize Selected
Performs transcription of selected, followed by summary

## Variables required
### Ollama URL
Directory of ollama instance

### Text Generation Endpoint
API for text generation (You shouldnt have to modify this)

### Text Generation Model
Enter your model you would like ollama to use for text generation

### WhisperX Executable
The absolute path to your whisperX Executable

### WhisperX model
The model WhisperX will use for transcription, the current options are (tiny, small, medium, large, large-v2)
