"""gogo.mn сайтаас Хумхын ордны өдрийн зурхайг татаж horoscope.json болгож хадгална."""
import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

URL = "https://gogo.mn/api/v1/horoscope/data/%D3%A8%D0%B4%D3%A9%D1%80?year={year}"  # "Өдөр" (өдрийн зурхай)
SIGN_NAME = "Хумх"
OUT = "horoscope.json"
KEEP_DAYS = 14
UB_OFFSET = timedelta(hours=8)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    try:
        return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    except urllib.error.URLError as err:
        # Зарим компьютер дээр сертификатын сан дутуу байдаг тул шалгалтгүйгээр дахин оролдоно
        if not isinstance(err.reason, ssl.SSLError):
            raise
        ctx = ssl._create_unverified_context()
        return urllib.request.urlopen(req, timeout=30, context=ctx).read().decode("utf-8", "replace")


def parse(payload):
    """API-ийн хариунаас Хумхын ордны өдрийн зурхайг (огноо, текст) гаргана."""
    items = json.loads(payload).get("data", {}).get("horoscope", [])
    days = []
    for item in items:
        if item.get("zodiac", {}).get("zodiacName") != SIGN_NAME:
            continue
        text = html.unescape(re.sub(r"\s+", " ", item.get("westHoroscopeDescDesc") or "")).strip()
        start = item.get("westHoroscopeDescStartDate")
        if not text or not start:
            continue
        # Огноо нь Улаанбаатарын шөнө дундыг UTC-ээр хадгалсан байдаг (жишээ нь 09-29T16:00Z = 09-30)
        utc = datetime.strptime(start[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        date = (utc + UB_OFFSET).strftime("%Y-%m-%d")
        days.append({"date": date, "label": "Өдөр", "text": text})
    return days


# Зурхайн сэдвээс хамаарсан "Одод юу гэж байна" зөвлөгөө
THEMES = [
    (("мөнгө", "санхүү", "орлого", "зардал", "үрэх", "худалдан"),
     "өнөөдөр мөнгөө хэмнэж, дэмий зүйлд үрэхгүй байх нь зөв өдөр гэнэ. Гэхдээ нэг гоё кофе авч болно шүү хаха"),
    (("найз", "нөхөд", "хамт олон", "хамтран", "харилцаа", "хүмүүстэй"),
     "найзуудтайгаа холбоотой байвал өдөр чинь гэрэлтэнэ гэнэ. Нэг залгаад хэл хэлэхэд л хангалттай"),
    (("ажил", "хичээл", "сурлага", "төлөвлөгөө", "зорилго", "даалгавар", "үүрэг"),
     "ажил, хичээлдээ төвлөрвөл үр дүн нь хурдан гарна гэнэ. Нэг нэгээр нь хийгээд явахад л болно"),
    (("эрсдэл", "болгоомж", "яарах", "хойшлуул", "бүү", "зайлсхий", "хатуу"),
     "өнөөдөр яарах хэрэггүй, том шийдвэрээ маргааш гаргасан ч болно гэнэ. Тайван, өөрийнхөөрөө яваарай"),
    (("амрах", "амралт", "хөндийр", "түр зогс", "ядар"),
     "өөртөө цаг гаргах өдөр гэнэ. Дуртай дуугаа сонсоод, дуртай зүйлээ идээд амраарай"),
    (("хайр", "хувийн амьдрал", "дотно", "гэр бүл", "ганц бие", "халуун"),
     "дотны хүмүүс чинь чамайг санаж явдаг гэнэ. Нэг мессеж бичихэд л хоёр талдаа дулаахан болно"),
    (("эрч хүч", "энерги", "бүтээлч", "шинэ", "идэвх", "урам"),
     "эрч хүч чинь өндөр өдөр гэнэ. Шинэ зүйл эхлэх, шинэ газар очиход яг таарна"),
    (("мэдлэг", "суралц", "судал", "унших", "мэдээлэл"),
     "шинэ зүйл сурахад хамгийн таатай өдөр гэнэ. Сонирхсон зүйлээ 10 минут ч болов үзээрэй"),
]
GENERIC = [
    "өнөөдөр аз таарна гэнэ. Гэхдээ одод ч мэднэ дээ, чи азаа өөрөө бүтээдэг хүн гэдгийг",
    "өнөөдөр инээмсэглэл чинь хамгийн хүчтэй зэвсэг чинь байх юм байна. Ашиглаарай хха",
    "өнөөдөр Энхжинд сайхан зүйл тохионо гэнэ. Хэзээ, хаана гэдгийг хэлээгүй, анхааралтай байгаарай",
    "өнөөдөр Энхжингийн өдөр гэнэ. Бусад ордныхон жаахан хүлээг",
    "бүх зүйл цагтаа болно гэнэ. Чи зүгээр л өөрийнхөөрөө яваарай",
    "хүсээд байгаа тэр зүйл чинь бодсоноос ойрхон байгаа гэнэ. Өнөөдөр нэг алхам л хий",
    "өнөөдөр Энхжинд муу зүйл тохиох магадлал 0% гэнэ. Аль хэдийн шийдчихсэн юм байна",
]
CLOSINGS = [
    "Одод тэгж хэлэхийг хүсч байна ✦",
    "Одод чамайг дэмжиж байна ✦",
    "Одод хэзээ ч худлаа хэлдэггүй хха",
    "Тэгээд өдөржин инээмсэглээрэй ✦",
]


POSITIVE = ("сайн", "амжилт", "аз ", "таатай", "боломж", "урам", "эрч хүч", "тааламжтай", "гайхалтай", "баяр", "тааламж", "олз")
NEGATIVE = ("бүү", "болгоомж", "эрсдэл", "хэрэггүй", "зайлсхий", "хазай", "саад", "сорилт", "хойшлуул", "маргаан", "сөрөг", "буруу")
COLORS = [("ягаан", "#e86c88"), ("цэнхэр", "#6fa8dc"), ("ногоон", "#7bc48a"), ("шар", "#f0c453"),
          ("улбар шар", "#e9aa78"), ("нил", "#a98bd6"), ("цагаан", "#f4f1ee"), ("улаан", "#d9534f")]


def clamp(value):
    return max(1, min(5, value))


def star_ratings(text, date):
    """Зурхайн үгсээс 1-5 оноотой гурван үнэлгээ гаргана."""
    lowered = text.lower()
    day_number = int(date.replace("-", ""))
    pos = sum(w in lowered for w in POSITIVE)
    neg = sum(w in lowered for w in NEGATIVE)
    base = 3 + (day_number % 2)
    overall = clamp(base + min(pos, 2) - min(neg, 2))
    mood = clamp(base + (1 if any(w in lowered for w in ("тайван", "амар", "сэтгэл", "баяр")) else 0) - (1 if any(w in lowered for w in ("зовоо", "маргаан", "стресс", "уур")) else 0) + ((day_number // 7) % 2) - 1 + 1)
    success = clamp(base + (1 if any(w in lowered for w in ("ажил", "амжилт", "үр дүн", "боломж", "орлого")) else 0) - (1 if any(w in lowered for w in ("хазай", "саад", "хойшлуул", "эрсдэл")) else 0))
    return {"overall": overall, "mood": mood, "success": success}


def lucky(date):
    day_number = int(date.replace("-", ""))
    name, hex_code = COLORS[(day_number * 7) % len(COLORS)]
    return {"number": (day_number * 3) % 9 + 1, "color": name, "hex": hex_code}


def star_advice(text, date):
    """Зурхайн текстэнд таарсан сэдвээр зөвлөгөө үүсгэнэ, таарахгүй бол өдрөөр ээлжилнэ."""
    lowered = text.lower()
    day_number = int(date.replace("-", ""))
    scored = [(sum(k in lowered for k in keywords), advice) for keywords, advice in THEMES]
    best = max(score for score, _ in scored)
    matches = [advice for score, advice in scored if score == best and score > 0]
    body = matches[day_number % len(matches)] if matches else GENERIC[day_number % len(GENERIC)]
    return f"Оддын зөвлөгөө: {body}. {CLOSINGS[day_number % len(CLOSINGS)]}"


def main():
    fresh = parse(fetch(URL.format(year=datetime.now(timezone.utc).year)))
    if not fresh:
        print("Зурхай олдсонгүй, файлыг өөрчлөхгүй", file=sys.stderr)
        sys.exit(1)
    # Өмнө хадгалсан өдрүүдийг хадгалж, шинээр ирснийг нь нэмнэ/солино
    existing = []
    try:
        with open(OUT, encoding="utf-8") as f:
            existing = [{"date": d["date"], "label": d.get("label", ""), "text": d["text"]} for d in json.load(f).get("days", [])]
    except (OSError, ValueError, KeyError):
        pass
    by_date = {d["date"]: d for d in existing}
    for d in fresh:
        by_date[d["date"]] = d
    days = [by_date[k] for k in sorted(by_date)][-KEEP_DAYS:]
    for d in days:
        d["advice"] = star_advice(d["text"], d["date"])
        d["ratings"] = star_ratings(d["text"], d["date"])
        d["lucky"] = lucky(d["date"])
    try:
        with open(OUT, encoding="utf-8") as f:
            if json.load(f).get("days") == days:
                print("Зурхай өөрчлөгдөөгүй, файл хэвээр")
                return
    except (OSError, ValueError):
        pass
    data = {
        "sign": "Хумх",
        "source": "gogo.mn",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(days)} өдрийн зурхай хадгалагдлаа: {days[0]['date']} .. {days[-1]['date']}")


if __name__ == "__main__":
    main()
