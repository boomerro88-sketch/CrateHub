# CrateHub

Lokalny katalog do odkrywania muzyki: Poszukiwacz / Explorer, Rytmiczna ruletka / Rhythm Roulette, Twoje skrzynki / Your crates, gramofon, BPM i tonacja, WhoSampled i eksport MP3 z szumem winyla lub bez.

## Instalacja na macOS Apple Silicon

Otwórz obraz DMG i przeciągnij CrateHub do folderu Applications. Uruchom CrateHub. Program otwiera katalog w domyślnej przeglądarce i wyświetla małe okno sterowania. Zamknięcie tego okna zatrzymuje serwer. Nie instalujesz osobno Python, FFmpeg ani Node.

Pakiet jest podpisany lokalnie (ad hoc), bez certyfikatu Developer ID i notaryzacji Apple. macOS może wymagać zatwierdzenia aplikacji w ustawieniach Prywatność i ochrona. Nie wyłączaj globalnych zabezpieczeń systemu. Wydanie Intel wymaga osobnego buildu na Macu Intel.

## Windows

Instalator EXE x64 zawiera Python 3.14.9, Node 22.23.4, FFmpeg i biblioteki aplikacji. Instaluje program w profilu użytkownika i tworzy skróty. Katalog otwiera się w przeglądarce; kliknięcie OK w oknie sterowania kończy aplikację. Instalator został zbudowany na macOS za pomocą NSIS; uruchomienie na Windows wymaga jeszcze weryfikacji. Repozytorium zawiera też alternatywny build PyInstaller w GitHub Actions.

## Języki i skrzynki

Przełącznik PL / EN znajduje się w prawym górnym rogu i zapamiętuje wybór. Każda skrzynka mieści maksymalnie 30 płyt. Starsze większe skrzynki są dzielone na kolejne bez utraty zapisanych pozycji.

## Dane i dotychczasowe skrzynki

Serwer działa wyłącznie lokalnie na `http://localhost:8890`. Dane katalogu: macOS `~/Library/Application Support/CrateHub`; Windows `%LOCALAPPDATA%\CrateHub`. Importowane utwory pozostają po ponownej instalacji. Skrzynki i tagi nadal zapisuje przeglądarka w localStorage i nie są automatycznie synchronizowane pomiędzy przeglądarkami/portami. Przed przejściem z wersji localhost:8880 wyeksportuj skrzynki jej dotychczasową funkcją, a następnie zaimportuj je w aplikacji. Odinstalowanie programu nie usuwa danych użytkownika.

## Funkcjonalność i dostęp do sieci

Katalog i zapisane metadane są lokalne. YouTube, import playlist i pobieranie audio wymagają internetu i dostępności materiału. Zachowano funkcje pobierania: czyste MP3, intro 2 s i szum przez cały utwór. Analiza BPM/tonacji działa na audio oryginału w przeglądarce. Nie ma gwarancji dostępności każdego filmu ani pobierania — YouTube może zmieniać mechanizmy dostępu. Aktualizacje narzędzia yt-dlp dostarczamy w kolejnych wydaniach programu.

## Budowanie ze źródeł

Python 3.12, Node 22 lub nowszy i FFmpeg muszą być dostępne na komputerze budującym. `pip install -r requirements-build.txt`, następnie `python packaging/build.py`. PyInstaller dołącza interpreter, zależności, FFmpeg i Node. Buduj oddzielnie na każdym docelowym systemie i architekturze. Tryb diagnostyczny: executable `--self-test`; serwer bez okna: `--headless`. `CRATE_DESKTOP_DATA` pozwala ustawić osobny katalog testowy.

## Dystrybucja i licencje

Zobacz THIRD_PARTY.md i dołączone licencje. Repozytorium nie zawiera plików muzycznych z YouTube; jedynie metadane i identyfikatory. Dołączona próbka trzasków ma licencję CC0. Essentia.js jest objęta AGPL-3.0; przed publiczną dystrybucją należy określić zgodną licencję kodu aplikacji i udostępnić wymagane źródła. Prawa do zewnętrznego fontu i materiałów graficznych trzeba potwierdzić przed publiczną publikacją. Nie przypisano automatycznie licencji do kodu właściciela.
