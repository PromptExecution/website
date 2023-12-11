import io
import base64

from PIL import Image

# src/evlib/build.py
def main():
    print("hello world!")  # output: hello world!

    # Load the image from file
    img_path = './public/PromptExecution-LogoV2-semi-transparent.webp'
    img = Image.open(img_path)

    img = img.resize((256, 256), resample=Image.LANCZOS)
    ico_buffer = io.BytesIO()
    # img.save(ico_buffer, format='ICO', sizes=[(256, 256)])

    img.save('./public/favicon.ico', format='ICO', sizes=[(256, 256)])


    # # Convert to base64
    # base64_ico = base64.b64encode(ico_buffer.getvalue()).decode()

    # # Output the base64 encoded favicon
    # print(base64_ico)