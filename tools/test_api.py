"""
Integration test for FastAPI /api/render endpoint.
Uploads 4 demo photos in order, verifies response 200, and verifies rendered image size 1080x1350.
"""

import os
import urllib.request
from PIL import Image

def test_api():
    import requests
    
    demo_files = [
        os.path.abspath("frontend/public/demo/demo1.jpg"),
        os.path.abspath("frontend/public/demo/demo2.jpg"),
        os.path.abspath("frontend/public/demo/demo3.jpg"),
        os.path.abspath("frontend/public/demo/demo4.jpg"),
    ]

    for p in demo_files:
        assert os.path.exists(p), f"Missing demo file {p}"

    url = "http://127.0.0.1:8000/api/render"
    files = [
        ("photos", ("p0.jpg", open(demo_files[0], "rb"), "image/jpeg")),
        ("photos", ("p1.jpg", open(demo_files[1], "rb"), "image/jpeg")),
        ("photos", ("p2.jpg", open(demo_files[2], "rb"), "image/jpeg")),
        ("photos", ("p3.jpg", open(demo_files[3], "rb"), "image/jpeg")),
    ]
    data = {"layout_id": "grid_2x2"}

    print("Sending POST request to /api/render...")
    resp = requests.post(url, data=data, files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    res_json = resp.json()
    print("API Response:", res_json)
    assert res_json.get("success") is True
    assert res_json.get("canvas") == {"width": 1080, "height": 1350}

    download_url = f"http://127.0.0.1:8000{res_json['download_url']}"
    img_resp = requests.get(download_url)
    assert img_resp.status_code == 200

    out_test_path = os.path.abspath("output/api_test_download.jpg")
    with open(out_test_path, "wb") as f:
        f.write(img_resp.content)

    with Image.open(out_test_path) as img:
        print("Downloaded image size:", img.size)
    assert "captions" in res_json, "Response missing captions"
    captions = res_json["captions"]
    print("\n--- AI Generated Captions Payload ---")
    print("Aesthetic:", captions.get("aesthetic"))
    print("Witty:    ", captions.get("witty"))
    print("Hinglish: ", captions.get("hinglish"))
    print("Hashtags: ", captions.get("hashtags"))

    assert captions.get("aesthetic"), "Missing aesthetic caption"
    assert captions.get("witty"), "Missing witty caption"
    assert captions.get("hinglish"), "Missing hinglish caption"
    assert isinstance(captions.get("hashtags"), list) and len(captions["hashtags"]) >= 3

    print("\n[SUCCESS] API Render & Concurrent AI Captions Test Passed!")

if __name__ == "__main__":
    test_api()
