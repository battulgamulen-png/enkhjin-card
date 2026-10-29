"""subscriptions.json дахь утаснууд руу push мэдэгдэл явуулна."""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

from pywebpush import WebPushException, webpush

SUBS_FILE = "subscriptions.json"
VAPID_CLAIMS = {"sub": "mailto:choijanstandoloonjin1@gmail.com"}


def morning_horoscope():
    """Өглөөний зурхай: horoscope.json-оос өнөөдрийн эхний өгүүлбэр."""
    today = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime("%Y-%m-%d")
    with open("horoscope.json", encoding="utf-8") as f:
        days = json.load(f)["days"]
    entry = next((d for d in days if d["date"] == today), None) or [d for d in days if d["date"] <= today][-1]
    first = entry["text"].split(". ")[0].rstrip(".") + "."
    return "Өнөөдрийн зурхай чинь бэлэн ✦", first


def ub_weather():
    try:
        url = ("https://api.open-meteo.com/v1/forecast?latitude=47.9184&longitude=106.9177"
               "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FUlaanbaatar&forecast_days=1")
        d = json.loads(fetch_json(url))
        code = d["daily"]["weather_code"][0]
        desc = "цас" if 71 <= code <= 86 else "бороотой, шүхэр ав ☂" if code >= 51 else "цэлмэг" if code <= 1 else "үүлэрхэг" if code <= 3 else "манантай"
        return f"Улаанбаатарт {round(d['current']['temperature_2m'])}° ({round(d['daily']['temperature_2m_min'][0])}°…{round(d['daily']['temperature_2m_max'][0])}°), {desc}"
    except Exception:  # цаг агаар авагдахгүй бол тоймд оруулахгүй
        return ""


def fetch_json(url):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=20).read().decode("utf-8")


def morning_summary():
    """Өглөөний тойм: цаг агаар + өнөөдрийн зурхай."""
    _, horoscope = morning_horoscope()
    weather = ub_weather()
    parts = [weather] if weather else []
    parts.append(f"Зурхай: {horoscope}")
    return "Өглөөний мэнд, Энхжин ✦", " · ".join(parts)


def main():
    title = os.environ.get("PUSH_TITLE") or "Энхжин ✦"
    body = os.environ.get("PUSH_BODY") or ""
    url = os.environ.get("PUSH_URL") or "./"
    if not body:
        title, body = morning_summary()
    with open("vapid_private.pem", "w", encoding="utf-8") as f:
        f.write(os.environ["VAPID_PRIVATE_KEY"])
    with open(SUBS_FILE, encoding="utf-8") as f:
        subs = json.load(f)
    if not subs:
        print("Бүртгэлтэй утас алга")
        return
    payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
    alive = []
    for sub in subs:
        try:
            webpush(subscription_info=sub, data=payload, vapid_private_key="vapid_private.pem", vapid_claims=dict(VAPID_CLAIMS), ttl=43200)
            print("илгээлээ:", sub["endpoint"][:60])
            alive.append(sub)
        except WebPushException as err:
            status = getattr(err.response, "status_code", None)
            print("алдаа:", status, str(err)[:120], file=sys.stderr)
            if status not in (404, 410):
                alive.append(sub)
    if len(alive) != len(subs):
        with open(SUBS_FILE, "w", encoding="utf-8") as f:
            json.dump(alive, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("хүчингүй бүртгэлийг хасав")


if __name__ == "__main__":
    main()
