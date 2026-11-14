"""Проверки без сети. Запуск: python3 tests/smoke.py   (нужен playwright + chromium)"""
import json,os,sys,subprocess,glob
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails=[]
def check(name,cond,info=""):
    print(("ok   " if cond else "FAIL ")+name+(" — "+str(info) if (info and not cond) else ""))
    if not cond:fails.append(name)

# --- 1. сборка и данные
check("index.html собран из src/",subprocess.run([sys.executable,os.path.join(R,"build.py"),"--check"],capture_output=True).returncode==0)
for f in glob.glob(os.path.join(R,"src/data/*.json")):
    try:json.load(open(f,encoding="utf-8"));ok=True
    except Exception as e:ok=False
    check("JSON валиден: "+os.path.basename(f),ok)
tm=json.load(open(os.path.join(R,"src/data/tmdb.json"),encoding="utf-8"))
miss=[v["poster"] for v in tm.values() if str(v.get("poster","")).startswith("posters/") and not os.path.exists(os.path.join(R,v["poster"]))]
check("все постеры из tmdb.json лежат в posters/",not miss,miss[:3])
check("в tmdb.json нет встроенных картинок",not any(str(v.get("poster","")).startswith("data:") for v in tm.values()))

# --- 2. поведение в браузере
from playwright.sync_api import sync_playwright
def launch(p):
    for kw in({},{"executable_path":"/usr/bin/google-chrome"}):
        try:return p.chromium.launch(args=["--no-sandbox"],**kw)
        except Exception:pass
    raise SystemExit("нет браузера для Playwright")
with sync_playwright() as p:
    b=launch(p);pg=b.new_page(viewport={"width":1300,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+os.path.join(R,"index.html"));pg.wait_for_timeout(2500)
    ev=pg.evaluate
    check("страница открывается без ошибок скрипта",not errs,errs[:2])
    check("версия базы = числу миграций",ev("DB.schema===SCHEMA && SCHEMA>=3"))
    # миграция старой копии
    r=ev("""()=>{const k=Object.keys(TMDB).find(k=>TMDB[k].posterSig);const t=TMDB[k];
      const old={items:[{id:k,title:"x",type:"Фильм",status:"каша",seenBy:{},poster:"data:image/x;base64,AAA"}],types:["Фильм"],raters:["Дима","Женя"]};
      const m=normalize(old);return {st:m.items[0].status,sb:"seenBy" in m.items[0],sch:m.schema,types:m.types.includes("Дорама")&&m.types.includes("Аниме")}}""")
    check("миграция чинит статус и пустые поля, добавляет типы",r["st"]=="watched" and not r["sb"] and r["types"] and r["sch"]>=3,r)
    r=ev("""()=>{const u="data:image/jpeg;base64,"+"QUJD".repeat(50);TMDB.zz={poster:"posters/zz.jpg",posterSig:POSTER_SIG(u)};
      const m=normalize({items:[{id:"zz",title:"a",type:"Фильм",status:"watched",poster:u},{id:"zz",title:"b",type:"Фильм",status:"watched",poster:u+"X"}],types:[],raters:[]});
      delete TMDB.zz;return [m.items[0].poster,m.items[1].poster.startsWith("data:")]}""")
    check("миграция: родной постер → файл, свой остаётся нетронутым",r[0]=="posters/zz.jpg" and r[1],r)
    r=ev("""()=>Object.keys(TMDB).find(k=>TMDB[k].posterSig)""")
    check("в данных есть отпечатки постеров",bool(r))
    # журнал ошибок
    ev("logErr('Тест',new Error('сбой сохранения'))");pg.wait_for_timeout(200)
    check("серьёзная ошибка зажигает значок на «Данные»",pg.locator(".nb.err").count()==1)
    ev("logErr('Мелочь',new Error('кэш'),1)")
    check("мелкая ошибка пишется, но значок не добавляет",ev("ERRLOG.filter(e=>e.s).length>=1") and pg.locator(".nb.err").count()==1)
    pg.evaluate("location.hash='#data'");pg.wait_for_timeout(500)
    check("журнал виден на вкладке «Данные»",pg.locator("#errPanel .erri").count()>=2)
    # клавиатура
    pg.evaluate("location.hash='#watched'");pg.wait_for_timeout(700)
    n=pg.locator(".card[role=button][tabindex='0']").count()
    check("карточки доступны с клавиатуры",n>0,n)
    pg.focus(".card[role=button]");pg.keyboard.press("Enter");pg.wait_for_timeout(400)
    check("Enter на карточке открывает её",ev("!!document.querySelector('dialog[open]')"))
    pg.keyboard.press("Escape");pg.wait_for_timeout(200)
    # список на согласовании
    pg.evaluate("location.hash='#plan'");pg.wait_for_timeout(500)
    check("в планах есть переключатель списков",pg.locator(".plsw").count()>=1)
    # скоро выйдут
    pg.evaluate("location.hash='#catalog'");pg.wait_for_timeout(600);pg.mouse.move(700,600)
    pg.click("#catSoon");pg.wait_for_timeout(300)
    check("«Скоро выйдут» включается, есть выбор по дате и популярности",ev("UI.catSort==='soon'") and pg.locator(".soonbar .seg button").count()==2)
    pg.click(".soonbar .seg button:nth-child(2)");pg.wait_for_timeout(300)
    check("сортировка по популярности",ev("UI.catSort==='soonpop'"))
    check("запрос каталога использует будущие даты",ev("(()=>{const s=catReq.toString();return s.includes('soonpop')&&s.includes('.gte')})()"))
    b.close()
print("\nпровалено:",len(fails)) if fails else print("\nвсё в порядке")
sys.exit(1 if fails else 0)
