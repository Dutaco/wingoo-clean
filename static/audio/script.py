from gtts import gTTS

text = "Welcome to Green News. Today we cover sustainability tips, climate trends, and eco-friendly innovations."
tts = gTTS(text=text, lang='en')
tts.save("eco_news.mp3")
