import os
import io
import asyncio
from typing import Generator
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions

class DeepgramSTT:
    """High-speed Streaming STT using Deepgram Voice API."""
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY environment variable not set.")
        
        self.client = DeepgramClient(self.api_key)

    async def transcribe_stream_async(self, audio_generator) -> Generator[str, None, None]:
        """
        Receives an async generator of audio chunks and yields transcriptions.
        """
        connection = self.client.listen.asyncwebsocket.v("1")
        
        # Async queue to hold transcripts from the callback
        transcript_queue = asyncio.Queue()

        async def on_message(self, result, **kwargs):
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            
            # Deepgram often sends partials. We can yield both or just finals.
            # For simplicity, yielding everything that has text.
            await transcript_queue.put({
                "text": sentence,
                "is_final": result.is_final
            })

        async def on_error(self, error, **kwargs):
            print(f"Deepgram Error: {error}")

        connection.on(LiveTranscriptionEvents.Transcript, on_message)
        connection.on(LiveTranscriptionEvents.Error, on_error)

        options = LiveOptions(
            model="nova-2",
            language="ur", # Urdu
            smart_format=True,
            encoding="linear16",
            channels=1,
            sample_rate=16000,
            endpointing=300 # 300ms of native silence detection
        )

        await connection.start(options)

        # Background task to send audio
        async def sender():
            async for chunk in audio_generator:
                await connection.send(chunk)
            await connection.finish()
            await transcript_queue.put(None) # Signal end

        sender_task = asyncio.create_task(sender())

        try:
            while True:
                msg = await transcript_queue.get()
                if msg is None:
                    break
                
                # In a real app we might only yield when is_final is true to avoid spam,
                # but partials are great for frontend UX.
                yield msg
        finally:
            sender_task.cancel()
