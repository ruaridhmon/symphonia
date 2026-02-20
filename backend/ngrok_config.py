from pyngrok import ngrok

# Simple tunnel wrapper for OpenRouter admin UI
 
PORT = 8000

def start():
    url = ngrok.connect(PORT, bind_header="false")
    print("NGROK_TUNNEL_URL="+url)
    return url

if __name__ == __main__:
    start()
