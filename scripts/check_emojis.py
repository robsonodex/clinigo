import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    files = subprocess.check_output(['git', 'diff', '--name-only', '711df48', 'HEAD']).decode('utf-8').splitlines()
except Exception as e:
    print('Erro ao obter arquivos:', e)
    files = []

# Unicode emoji pattern
emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)

found = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                if emoji_pattern.search(line):
                    found.append(f"{f}:{i}: {line.strip()}")
    except Exception:
        pass

if not found:
    print("Nenhum emoji encontrado nos arquivos alterados.")
else:
    print(f"Total de {len(found)} linhas com emoji encontradas:")
    for match in found:
        print(match)
