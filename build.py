#!/usr/bin/env python3
"""Собирает index.html из src/. Запуск: python3 build.py   (проверка без записи: python3 build.py --check)"""
import re,sys,os
R=os.path.dirname(os.path.abspath(__file__))
def read(p):
    with open(os.path.join(R,p),encoding='utf-8',newline='') as f:return f.read()
def build():
    tpl=read('src/index.src.html')
    return re.sub(r'\{\{([\w./-]+)\}\}',lambda m:read('src/'+m.group(1)),tpl)
if __name__=="__main__":
    out=build();dst=os.path.join(R,'index.html')
    if '--check' in sys.argv:
        cur=open(dst,encoding='utf-8',newline='').read() if os.path.exists(dst) else ''
        if cur!=out:print("index.html устарел: запустите python3 build.py и закоммитьте результат");sys.exit(1)
        print("index.html актуален");sys.exit(0)
    open(dst,'w',encoding='utf-8',newline='').write(out);print("собрано index.html,",len(out)//1024,"КБ")
