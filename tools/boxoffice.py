#!/usr/bin/env python3
"""Сборщик дневных кассовых сборов (прокат США) с Box Office Mojo для «Лисьих оценок».

Запускается раз в день через GitHub Actions (.github/workflows/boxoffice.yml) и обновляет
boxoffice.json в корне репозитория; сайт читает этот файл со своего же адреса.

Что собирает:
  1. фильмы из дневных чартов за последние дни (всё, что сейчас идёт в кино);
  2. по очереди — топ-N фильмов каждого года с 2000-го (история, заполняется за несколько запусков);
  3. фильмы из tools/box-extra.txt (по одному IMDb-номеру tt… в строке) — если нужного фильма нет.

Формат boxoffice.json (суммы в тысячах долларов, чтобы файл был меньше):
  {"v":1,"upd":"YYYY-MM-DD","films":{"rl…":{"t":название,"i":"tt…","o":"YYYY-MM-DD" (первый день),
   "d":[сборы по дням, начиная с первого; null — нет данных],"r":остаток после 150-го дня,
   "w":макс. число кинотеатров,"b":бюджет,"dist":прокатчик,"last":последний день с данными}},
   "skip":{"rl…":1}}  — релизы без дневных данных (старые/ограниченные), повторно не запрашиваются.

Только стандартная библиотека Python. Запуск: python3 tools/boxoffice.py [--limit N] [--top N] [--from-year Y]
"""
import argparse, datetime as dt, html, json, os, re, sys, threading, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "boxoffice.json")
EXTRA = os.path.join(ROOT, "tools", "box-extra.txt")
BASE = "https://www.boxofficemojo.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
MAXDAYS = 150      # дальше хвост копейки — храним одной суммой
DONE_AFTER = 28    # фильм, у которого нет новых данных 28+ дней, считается сошедшим с экранов

def log(*a):
    print(*a, flush=True)

def get(path, delay):
    url = path if path.startswith("http") else BASE + path
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
            with urllib.request.urlopen(req, timeout=40) as r:
                body = r.read().decode("utf-8", "replace")
            time.sleep(delay)
            return body
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            wait = 5 * (attempt + 1)
        except Exception:
            wait = 5 * (attempt + 1)
        log(f"  повтор через {wait} с: {url}")
        time.sleep(wait)
    return None

def money(s):
    m = re.search(r"\$([\d,]+)", s or "")
    return int(m.group(1).replace(",", "")) if m else None

def text(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s or "")).strip()

def release_ids(page):
    seen, out = set(), []
    for rl in re.findall(r"/release/(rl\d+)/", page or ""):
        if rl not in seen:
            seen.add(rl)
            out.append(rl)
    return out

def parse_release(page):
    """Дневная таблица релиза → словарь фильма; None, если дневных данных нет."""
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    title = text(h1.group(1)) if h1 else "?"
    im = re.search(r"/title/(tt\d+)/\?ref_=bo_rl_ti", page) or re.search(r"/title/(tt\d+)\?ref_=mojo_rl_summary", page)
    days = {}
    widest = 0
    tbl = page.find("mojo-body-table")
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page[tbl:] if tbl >= 0 else "", re.S):
        dm = re.search(r'href="/date/(\d{4}-\d\d-\d\d)/', row)
        if not dm:
            continue
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(cells) < 6:
            continue
        g = money(cells[2])
        th = text(cells[5]).replace(",", "")
        if th.isdigit():
            widest = max(widest, int(th))
        if g is not None:
            days[dm.group(1)] = g
    if not days:
        return None
    ds = sorted(days)
    o = dt.date.fromisoformat(ds[0])
    n = (dt.date.fromisoformat(ds[-1]) - o).days + 1
    arr = [None] * n
    for d, g in days.items():
        arr[(dt.date.fromisoformat(d) - o).days] = g
    k = lambda v: None if v is None else round(v / 1000)
    film = {"t": title, "o": ds[0], "d": [k(v) for v in arr[:MAXDAYS]], "last": ds[-1]}
    rest = sum(v for v in arr[MAXDAYS:] if v)
    if rest:
        film["r"] = round(rest / 1000)
    if im:
        film["i"] = im.group(1)
    if widest:
        film["w"] = widest
    summ = page[page.find("mojo-summary-values"):] if "mojo-summary-values" in page else ""
    b = re.search(r"Budget</span>.{0,80}?(\$[\d,]+)", summ, re.S)
    if b:
        film["b"] = round(money(b.group(1)) / 1000)
    di = re.search(r"Distributor</span>\s*<span[^>]*>(.*?)<br", summ, re.S)
    if di:
        film["dist"] = text(di.group(1))[:60]
    return film

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=int(os.environ.get("BOX_LIMIT", "350")), help="сколько новых релизов из истории скачать за запуск")
    ap.add_argument("--top", type=int, default=100, help="сколько фильмов брать из топа каждого года")
    ap.add_argument("--from-year", type=int, default=2000)
    ap.add_argument("--days", type=int, default=10, help="сколько последних дневных чартов просмотреть")
    ap.add_argument("--delay", type=float, default=0.8)
    ap.add_argument("--workers", type=int, default=3, help="сколько страниц качать одновременно")
    a = ap.parse_args()

    db = {"v": 1, "films": {}, "skip": {}}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            db = json.load(f)
        db.setdefault("films", {})
        db.setdefault("skip", {})
    F, S = db["films"], db["skip"]
    today = dt.date.today()

    lock = threading.Lock()
    count = [0]

    def save():
        db["upd"] = today.isoformat()
        tmp = OUT + ".tmp"
        # по фильму на строку — так изменения в git маленькие и читаемые
        js = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        body = ",\n".join(f"{js(k)}:{js(F[k])}" for k in sorted(F))
        with open(tmp, "w", encoding="utf-8") as f:
            f.write('{"v":1,"upd":%s,"skip":%s,"films":{\n%s\n}}\n' % (js(db["upd"]), js(S), body))
        os.replace(tmp, OUT)

    def fetch(rl):
        page = get(f"/release/{rl}/", a.delay)
        if page is None:
            return False
        film = parse_release(page)
        with lock:
            if film:
                F[rl] = film
                S.pop(rl, None)
            else:
                S[rl] = 1
            count[0] += 1
            if count[0] % 100 == 0:
                save()
                log(f"  скачано {count[0]}, сохранено")
        return True

    def fetch_all(ids):
        with ThreadPoolExecutor(max_workers=max(1, a.workers)) as ex:
            list(ex.map(fetch, ids))

    # 1. то, что сейчас в прокате: дневные чарты за последние дни + фильмы, которые ещё не сошли
    fresh = []
    for back in range(1, a.days + 1):
        d = (today - dt.timedelta(days=back)).isoformat()
        fresh += release_ids(get(f"/date/{d}/", a.delay))
    running = [rl for rl, f in F.items() if (today - dt.date.fromisoformat(f.get("last", "2000-01-01"))).days < DONE_AFTER]
    todo = list(dict.fromkeys(fresh + running))
    log(f"В прокате и недавно: {len(todo)}")
    fetch_all(todo)

    # 2. дополнительные фильмы по IMDb-номерам
    if os.path.exists(EXTRA):
        have = {f.get("i") for f in F.values()}
        for line in open(EXTRA, encoding="utf-8"):
            tt = line.split("#")[0].strip()
            if not re.fullmatch(r"tt\d+", tt) or tt in have:
                continue
            page = get(f"/title/{tt}/", a.delay)
            ids = release_ids(page)
            if ids:
                log(f"Доп. фильм {tt} → {ids[0]}")
                fetch(ids[0])

    # 3. история: топ каждого года, порциями
    left = a.limit
    for y in range(today.year, a.from_year - 1, -1):
        if left <= 0:
            break
        ids = [rl for rl in release_ids(get(f"/year/{y}/", a.delay))[: a.top] if rl not in F and rl not in S]
        if not ids:
            continue
        ids = ids[:left]
        log(f"{y}: новых {len(ids)}")
        fetch_all(ids)
        left -= len(ids)

    save()
    log(f"Готово: фильмов {len(F)}, без дневных данных {len(S)}, файл {os.path.getsize(OUT) // 1024} КБ")

if __name__ == "__main__":
    sys.exit(main())
