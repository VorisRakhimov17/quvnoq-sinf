# CSS faylidagi har bir selektorni berilgan ildiz klass bilan boshlaydi (sayt uslublariga ta’sir qilmasligi uchun).
# Ishlatish: python scripts/scope-css.py frontend/src/pack/pack.css .pk
import re, sys
path, scope = sys.argv[1], sys.argv[2]
css = open(path, encoding='utf-8').read()
out, i, depth_stack = [], 0, []
# Oddiy CSS tahlilchisi: blok selektorlarini topib, scope bilan boshlaydi (@keyframes ichiga tegmaydi)
def prefix(sel):
    parts = []
    for s in sel.split(','):
        s2 = s.strip()
        if not s2: continue
        if s2.startswith(scope):
            parts.append(s2)
        elif s2 in (':root', 'body', 'html'):
            parts.append(s2)
        else:
            parts.append(f'{scope} {s2}')
    return ', '.join(parts)
res = []
pos = 0
stack = []  # 'keyframes' | 'media' | 'rule'
buf = ''
n = len(css)
while pos < n:
    c = css[pos]
    if css.startswith('/*', pos):
        end = css.index('*/', pos) + 2
        res.append(css[pos:end]); pos = end; continue
    if c == '{':
        head = buf
        stripped = head.strip()
        lead = head[:len(head) - len(head.lstrip())]
        if stripped.startswith('@'):
            stack.append('keyframes' if 'keyframes' in stripped else 'media')
            res.append(head + '{')
        elif stack and stack[-1] == 'keyframes':
            stack.append('rule'); res.append(head + '{')
        else:
            stack.append('rule'); res.append(lead + prefix(stripped) + ' {')
        buf = ''; pos += 1; continue
    if c == '}':
        res.append(buf + '}'); buf = ''
        stack.pop(); pos += 1; continue
    if c == ';' and (not stack or stack[-1] != 'rule'):
        res.append(buf + ';'); buf = ''; pos += 1; continue
    buf += c; pos += 1
res.append(buf)
open(path, 'w', encoding='utf-8').write(''.join(res))
