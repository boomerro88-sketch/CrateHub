# CrateHub

CrateHub to katalog do wyszukiwania sampli z trybami Poszukiwacz, Rytmiczna ruletka i Twoje skrzynki. Aplikacja działa we własnym oknie na macOS i Windows.

Instalatory oraz sumy kontrolne znajdują się w [wydaniach GitHub](https://github.com/boomerro88-sketch/CrateHub/releases). Instrukcję wyboru wersji, instalacji oraz przenoszenia danych opisuje [INSTALACJA-PL.md](INSTALACJA-PL.md).

Źródła w katalogu `app/` zawierają katalog nagrań oraz odtwarzacz. Python, Node i FFmpeg są pakowane wraz z programem. Internet jest potrzebny do YouTube i pozostałych usług zewnętrznych; dostępność konkretnych filmów zależy od źródła.

## Budowanie

W systemie docelowym: Python 3.12, Node 22 i FFmpeg, następnie `pip install -r requirements-build.txt` oraz `python packaging/build.py`. Receptury wersji macOS arm64, macOS x86_64 i Windows x64 znajdują się w `.github/workflows/build-cross-platform.yml`. Windows wymaga WebView2 Runtime.

Test zależności i katalogu: `CrateHub --self-test`. Dane użytkownika: `~/Library/Application Support/CrateHub` na macOS, `%LOCALAPPDATA%\\CrateHub` na Windows. Port lokalny to 8890.

Wydania nie są podpisane certyfikatem Apple Developer ID ani certyfikatem Authenticode. Szczegóły komponentów i licencji: `THIRD_PARTY.md` oraz katalog `licenses/`.
